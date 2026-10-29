import type { Insight, Transaction, Category } from '@/types'
import { summarize, byCategory, type ViewMode } from '@/modules/analytics/engine'
import { formatBRL, percentChange, formatPercent } from '@/utils/money'
import { formatMonthLong } from '@/utils/date'

export type Draft = Omit<Insight, 'generatedAt' | 'period'>
export interface Ctx { cur: Transaction[]; pre: Transaction[]; cats: Category[]; cards: Set<string>; mode: ViewMode; refMonth: string; prevMonth: string }

export function expenseChange(c: Ctx): Draft[] {
  if (!c.pre.length) return []
  const sc = summarize(c.cur, c.mode, c.cards), sp = summarize(c.pre, c.mode, c.cards)
  const pct = percentChange(sp.expenseCents, sc.expenseCents)
  if (pct == null || Math.abs(pct) < 10) return []
  return [{
    id: `exp_${c.refMonth}`, type: pct > 0 ? 'negative' : 'positive', severity: Math.abs(pct) > 25 ? 3 : 2,
    title: `Despesas ${pct > 0 ? 'aumentaram' : 'diminuíram'} ${formatPercent(Math.abs(pct)).replace('+', '')}`,
    description: `Em ${formatMonthLong(c.refMonth)} você gastou ${formatBRL(sc.expenseCents)}, contra ${formatBRL(sp.expenseCents)} em ${formatMonthLong(c.prevMonth)}.`,
    evidence: [`Mês atual: ${formatBRL(sc.expenseCents)}`, `Mês anterior: ${formatBRL(sp.expenseCents)}`],
    transactionIds: sc.txExpense, howCalculated: 'Soma das despesas efetivas, excluindo transferências e pagamentos de fatura.',
    estimatedImpactInCents: sc.expenseCents - sp.expenseCents, confidence: 0.9,
  }]
}

export function categoryChanges(c: Ctx): Draft[] {
  if (!c.pre.length) return []
  const prev = new Map(byCategory(c.pre, c.mode, c.cards, c.cats).map((g) => [g.key, g.cents]))
  const out: Draft[] = []
  for (const g of byCategory(c.cur, c.mode, c.cards, c.cats).slice(0, 8)) {
    const before = prev.get(g.key)
    if (!before || before < 5000) continue
    const p = percentChange(before, g.cents)!
    if (Math.abs(p) < 20 || Math.abs(g.cents - before) < 5000) continue
    out.push({
      id: `cat_${g.key}_${c.refMonth}`, type: p > 0 ? 'trend' : 'positive', severity: 2,
      title: `${g.label}: ${formatPercent(p)} vs mês anterior`,
      description: `Seus gastos em ${g.label} foram de ${formatBRL(before)} para ${formatBRL(g.cents)}.`,
      evidence: [`${g.count} transações no mês atual`], transactionIds: g.ids,
      howCalculated: 'Soma por categoria no mês comparada ao mês anterior.', estimatedImpactInCents: g.cents - before, confidence: 0.85,
    })
  }
  return out
}

export function savingsAndFees(c: Ctx): Draft[] {
  const sc = summarize(c.cur, c.mode, c.cards)
  const out: Draft[] = []
  if (sc.incomeCents > 0 && sc.savingsRate != null)
    out.push({
      id: `sav_${c.refMonth}`, type: sc.savingsRate >= 10 ? 'positive' : sc.savingsRate < 0 ? 'alert' : 'info', severity: sc.savingsRate < 0 ? 3 : 1,
      title: `Taxa de poupança de ${formatPercent(sc.savingsRate).replace('+', '')}`,
      description: `Receitas de ${formatBRL(sc.incomeCents)} e despesas de ${formatBRL(sc.expenseCents)}.`,
      evidence: [`Resultado: ${formatBRL(sc.netCents)}`], transactionIds: sc.txIncome,
      howCalculated: '(Receitas − Despesas) ÷ Receitas, apenas contas importadas.', estimatedImpactInCents: null, confidence: 0.8,
    })
  const top = byCategory(c.cur, c.mode, c.cards, c.cats).filter((g) => c.cats.find((x) => x.id === g.key)?.essentiality === 'optional')[0]
  if (top && top.cents >= 10000) {
    const save = Math.round(top.cents * 0.15)
    out.push({
      id: `opp_${top.key}`, type: 'opportunity', severity: 2, title: `Reduzir ${top.label} em 15% economizaria ${formatBRL(save)}/mês`,
      description: `${top.label} é sua maior categoria não essencial (${formatBRL(top.cents)}).`,
      evidence: [`${top.count} transações`, `Anual: ${formatBRL(save * 12)}`], transactionIds: top.ids,
      howCalculated: '15% do total da categoria no mês; ×12 para o anual.', estimatedImpactInCents: save * 12, confidence: 0.6,
    })
  }
  if (sc.feesCents > 0)
    out.push({
      id: `fees_${c.refMonth}`, type: 'opportunity', severity: 2, title: `${formatBRL(sc.feesCents)} em tarifas e juros`,
      description: 'Custos bancários identificados no período.', evidence: [],
      transactionIds: c.cur.filter((t) => t.transactionType === 'fee' || t.transactionType === 'interest').map((t) => t.id),
      howCalculated: 'Soma de lançamentos classificados como tarifa ou juros.', estimatedImpactInCents: sc.feesCents * 12, confidence: 0.8,
    })
  return out
}
