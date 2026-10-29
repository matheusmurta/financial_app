import type { Transaction, Category, TransactionFilters, Insight } from '@/types'
import type { AIProvider, FinancialAIContext, AIAnswer } from './types'
import { AIUnavailableError } from './types'
import { summarize, byCategory, byMerchant, monthly, type ViewMode } from '@/modules/analytics/engine'
import { detectRecurrences, detectAnomalies } from '@/modules/insights/patterns'
import { formatBRL } from '@/utils/money'
import { formatMonthLong } from '@/utils/date'
import { normalizeKey } from '@/utils/text'

/** Provider padrão: desativado. Nunca finge ser IA. */
export class DisabledProvider implements AIProvider {
  readonly id = 'disabled'
  readonly label = 'Nenhum modelo configurado'
  async initialize() {}
  async isAvailable() { return false }
  async analyze(): Promise<AIAnswer> { throw new AIUnavailableError() }
  async ask(): Promise<AIAnswer> { throw new AIUnavailableError() }
  cancel() {}
  async dispose() {}
}

const registry = new Map<string, () => Promise<AIProvider>>([['disabled', async () => new DisabledProvider()]])
/** Registra provider com import dinâmico (não entra no bundle principal). */
export function registerProvider(id: string, factory: () => Promise<AIProvider>) { registry.set(id, factory) }
export function listProviders() { return [...registry.keys()] }
export async function loadProvider(id = 'disabled') { return (registry.get(id) ?? registry.get('disabled')!)() }

/** Constrói contexto limitado: só o necessário, truncado em maxTransactions. */
export function buildContext(
  txs: Transaction[], cats: Category[], cards: Set<string>, filters: Partial<TransactionFilters>, insights: Insight[], mode: ViewMode = 'consumption', maxTransactions = 50,
): FinancialAIContext {
  const s = summarize(txs, mode, cards)
  const months = monthly(txs, mode, cards)
  return {
    selectedPeriod: { from: filters.dateFrom ?? null, to: filters.dateTo ?? null },
    selectedAccounts: filters.accountIds ?? [],
    financialSummary: { incomeCents: s.incomeCents, expenseCents: s.expenseCents, netCents: s.netCents },
    categorySummary: byCategory(txs, mode, cards, cats).slice(0, 15).map((g) => ({ category: g.label, cents: g.cents })),
    merchantSummary: byMerchant(txs, mode, cards).slice(0, 15).map((g) => ({ merchant: g.key, cents: g.cents })),
    transactions: [...txs].sort((a, b) => a.amountInCents - b.amountInCents).slice(0, maxTransactions)
      .map(({ id, normalizedDate, merchantName, amountInCents, categoryId }) => ({ id, normalizedDate, merchantName, amountInCents, categoryId })),
    trends: months.map((m) => ({ month: m.month, expenseCents: m.expenseCents })),
    anomalies: detectAnomalies(txs, months.at(-1)?.month ? `${months.at(-1)!.month}-01` : '0000').map((a) => a.message),
    recurringPayments: detectRecurrences(txs).map((r) => ({ merchant: r.merchant, monthlyCents: r.monthlyEstimateCents })),
    activeFilters: filters,
    dataQuality: { transactionCount: txs.length, monthsCovered: months.length, uncategorized: txs.filter((t) => t.categoryId === 'nao_classificado').length },
    generatedInsights: insights.slice(0, 10).map(({ title, description }) => ({ title, description })),
  }
}

/** Respostas determinísticas por regras (não é IA). Retorna null se a pergunta não é suportada. */
export function answerByRules(question: string, ctx: FinancialAIContext): AIAnswer | null {
  const q = normalizeKey(question)
  const ans = (content: string): AIAnswer => ({ content, evidenceIds: [], source: 'rules' })
  if (!ctx.dataQuality.transactionCount) return ans('Não há transações no período selecionado.')
  if (/ONDE.*GASTEI|MAIS GASTEI|CATEGORIA/.test(q) && !/CRESC/.test(q)) {
    const top = ctx.categorySummary.slice(0, 5)
    return ans(`Maiores categorias de despesa:\n${top.map((c, i) => `${i + 1}. ${c.category}: ${formatBRL(c.cents)}`).join('\n')}`)
  }
  if (/RECORRENTE|ASSINATURA/.test(q)) {
    const r = ctx.recurringPayments
    if (!r.length) return ans('Nenhuma cobrança recorrente foi identificada com confiança suficiente.')
    const total = r.reduce((a, x) => a + x.monthlyCents, 0)
    return ans(`Identifiquei ${r.length} recorrência(s), ≈ ${formatBRL(total)}/mês:\n${r.map((x) => `• ${x.merchant}: ${formatBRL(x.monthlyCents)}`).join('\n')}`)
  }
  if (/ECONOMIZ|POUP|SOBROU/.test(q) && !/COMO/.test(q)) {
    const s = ctx.financialSummary
    return ans(`Receitas ${formatBRL(s.incomeCents)} − despesas ${formatBRL(s.expenseCents)} = resultado de ${formatBRL(s.netCents)} no período.`)
  }
  if (/MESES?.*CAROS|EVOLUCAO|AUMENTARAM|CRESC/.test(q)) {
    if (ctx.trends.length < 2) return ans('É preciso ao menos 2 meses de dados para avaliar evolução.')
    const sorted = [...ctx.trends].sort((a, b) => b.expenseCents - a.expenseCents)
    return ans(`Despesas por mês (maior → menor):\n${sorted.map((t) => `• ${formatMonthLong(t.month)}: ${formatBRL(t.expenseCents)}`).join('\n')}`)
  }
  if (/FORA DO PADRAO|ANOMAL|INCOMU/.test(q))
    return ans(ctx.anomalies.length ? `Itens para conferência:\n${ctx.anomalies.map((a) => `• ${a}`).join('\n')}` : 'Nenhum gasto fora do padrão identificado no mês mais recente.')
  if (/REDUZIR|COMO.*ECONOMIZAR/.test(q)) {
    const top = ctx.categorySummary.slice(0, 3)
    return ans(`Reduzir 15% nas maiores categorias:\n${top.map((c) => `• ${c.category}: ${formatBRL(Math.round(c.cents * 0.15))}`).join('\n')}\nTotal: ${formatBRL(top.reduce((a, c) => a + Math.round(c.cents * 0.15), 0))}.`)
  }
  return null
}
