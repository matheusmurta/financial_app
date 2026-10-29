import type { Insight, Transaction, Category } from '@/types'
import { monthly, type ViewMode } from '@/modules/analytics/engine'
import { detectRecurrences, detectAnomalies } from './patterns'
import { categoryChanges, expenseChange, savingsAndFees, type Ctx, type Draft } from './builders'
import { formatBRL, formatPercent } from '@/utils/money'
import { formatMonthLong, monthRange, prevMonthKey } from '@/utils/date'

function recurringInsights(txs: Transaction[]): Draft[] {
  const rec = detectRecurrences(txs).filter((r) => r.active)
  if (!rec.length) return []
  const total = rec.reduce((a, r) => a + r.monthlyEstimateCents, 0)
  const out: Draft[] = [{
    id: 'recurring', type: 'info', severity: 2, title: `${rec.length} cobrança(s) recorrente(s) somam ${formatBRL(total)}/mês`,
    description: `Projeção anual de ${formatBRL(total * 12)}. Principais: ${rec.slice(0, 3).map((r) => r.merchant).join(', ')}.`,
    evidence: rec.slice(0, 5).map((r) => `${r.merchant}: ${formatBRL(r.averageCents)} (${r.occurrences}×)`),
    transactionIds: rec.flatMap((r) => r.ids), howCalculated: 'Mesmo estabelecimento, intervalo regular e valores semelhantes (±15%).',
    estimatedImpactInCents: total * 12, confidence: 0.7,
  }]
  for (const r of rec.filter((x) => x.priceChangePct != null && x.priceChangePct > 3))
    out.push({
      id: `price_${r.key}`, type: 'alert', severity: 2, title: `${r.merchant} ficou ${formatPercent(r.priceChangePct)} mais caro`,
      description: `Última cobrança de ${formatBRL(r.lastCents)}.`, evidence: [`Média: ${formatBRL(r.averageCents)}`],
      transactionIds: r.ids.slice(-2), howCalculated: 'Comparação das duas últimas cobranças.',
      estimatedImpactInCents: Math.round((r.lastCents * r.priceChangePct!) / (100 + r.priceChangePct!)) * 12, confidence: 0.7,
    })
  return out
}

function anomalyInsights(txs: Transaction[], from: string): Draft[] {
  return detectAnomalies(txs, from).slice(0, 5).map((a) => ({
    id: a.id, type: 'alert', severity: a.kind === 'duplicate' ? 3 : 2,
    title: a.kind === 'duplicate' ? 'Possível cobrança duplicada' : a.kind === 'high_value' ? 'Gasto acima do habitual' : 'Novo estabelecimento',
    description: `${a.message}. Confira — isto não indica fraude.`, evidence: [], transactionIds: a.ids,
    howCalculated: a.kind === 'high_value' ? 'Valor > mediana + 5× desvio absoluto mediano da categoria.' : 'Mesma conta, data, valor e descrição.',
    estimatedImpactInCents: null, confidence: 0.5,
  }))
}

function historyInsights(txs: Transaction[], mode: ViewMode, cards: Set<string>): Draft[] {
  const months = monthly(txs, mode, cards).filter((m) => m.expenseCents > 0)
  if (months.length < 3) return []
  const avg = months.reduce((a, m) => a + m.expenseCents, 0) / months.length
  const best = [...months].sort((a, b) => a.expenseCents - b.expenseCents)[0]
  return [{
    id: 'best_month', type: 'info', severity: 1, title: `Mês mais econômico: ${formatMonthLong(best.month)}`,
    description: `Despesas de ${formatBRL(best.expenseCents)}; média dos meses com dados: ${formatBRL(Math.round(avg))}.`,
    evidence: [`${months.length} meses com dados`], transactionIds: [], howCalculated: 'Comparação das despesas mensais disponíveis.',
    estimatedImpactInCents: null, confidence: 0.9,
  }]
}

/** Gera insights determinísticos do mês de referência. Sem dados → lista vazia. */
export function generateInsights(txs: Transaction[], cats: Category[], cards: Set<string>, refMonth: string, mode: ViewMode = 'consumption'): Insight[] {
  const [s, e] = monthRange(refMonth)
  const prevMonth = prevMonthKey(refMonth)
  const [ps, pe] = monthRange(prevMonth)
  const cur = txs.filter((t) => t.normalizedDate >= s && t.normalizedDate <= e)
  if (!cur.length) return []
  const pre = txs.filter((t) => t.normalizedDate >= ps && t.normalizedDate <= pe)
  const ctx: Ctx = { cur, pre, cats, cards, mode, refMonth, prevMonth }
  const drafts = [...expenseChange(ctx), ...categoryChanges(ctx), ...savingsAndFees(ctx), ...recurringInsights(txs), ...anomalyInsights(txs, s), ...historyInsights(txs, mode, cards)]
  const generatedAt = new Date().toISOString(), period = formatMonthLong(refMonth)
  const uniq = new Map(drafts.map((d) => [d.id, { ...d, period, generatedAt } as Insight]))
  return [...uniq.values()].sort((a, b) => b.severity - a.severity || Math.abs(b.estimatedImpactInCents ?? 0) - Math.abs(a.estimatedImpactInCents ?? 0))
}
