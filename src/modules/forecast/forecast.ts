import type { Transaction } from '@/types'
import { monthly, type ViewMode } from '@/modules/analytics/engine'
import { monthKey, monthRange, daysBetweenInclusive, nextMonthKey } from '@/utils/date'
import { summarize } from '@/modules/analytics/engine'

export interface MonthForecast {
  month: string
  observedCents: number
  projectedCents: number
  lowCents: number
  highCents: number
  method: string
  confidence: 'baixa' | 'média' | 'alta'
  limitations: string[]
}

/**
 * Previsão determinística da despesa do mês corrente:
 * mistura ritmo diário observado com média dos meses completos anteriores.
 * Retorna null quando não há dados suficientes.
 */
export function forecastMonth(txs: Transaction[], mode: ViewMode, cards: Set<string>, today: string): MonthForecast | null {
  const mk = monthKey(today)
  const [start, end] = monthRange(mk)
  const current = txs.filter((t) => t.normalizedDate >= start && t.normalizedDate <= today)
  const history = monthly(txs.filter((t) => t.normalizedDate < start), mode, cards).filter((m) => m.expenseCents > 0).slice(-6)
  if (!current.length && history.length < 2) return null
  const observed = summarize(current, mode, cards).expenseCents
  const elapsed = daysBetweenInclusive(start, today), total = daysBetweenInclusive(start, end)
  const pace = elapsed > 0 ? Math.round((observed / elapsed) * total) : 0
  const limitations: string[] = []
  let projected: number, method: string
  if (history.length >= 2) {
    const vals = history.map((h) => h.expenseCents)
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const w = elapsed / total
    projected = Math.round(Math.max(observed, w * pace + (1 - w) * avg))
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - avg) ** 2, 0) / vals.length)
    method = `Combinação do ritmo diário (${Math.round(w * 100)}%) com a média de ${history.length} meses anteriores.`
    const band = Math.round(sd * (1 - w) + projected * 0.05)
    return {
      month: mk, observedCents: observed, projectedCents: projected, lowCents: Math.max(observed, projected - band), highCents: projected + band,
      method, confidence: history.length >= 4 && elapsed >= 10 ? 'alta' : 'média', limitations,
    }
  }
  limitations.push('Menos de 2 meses de histórico: projeção baseada apenas no ritmo atual.')
  if (elapsed < 7) limitations.push('Poucos dias decorridos no mês.')
  projected = Math.max(observed, pace)
  return {
    month: mk, observedCents: observed, projectedCents: projected, lowCents: observed, highCents: Math.round(projected * 1.3),
    method: 'Extrapolação linear do gasto diário observado.', confidence: 'baixa', limitations,
  }
}

/** Série histórica + próximos meses (média móvel de até 3 meses), com faixa ±1 desvio. */
export function projectSeries(txs: Transaction[], mode: ViewMode, cards: Set<string>, ahead = 3) {
  const hist = monthly(txs, mode, cards)
  if (hist.length < 3) return null
  const last = hist.slice(-3).map((h) => h.expenseCents)
  const avg = Math.round(last.reduce((a, b) => a + b, 0) / last.length)
  const sd = Math.round(Math.sqrt(last.reduce((a, v) => a + (v - avg) ** 2, 0) / last.length))
  const future: { month: string; cents: number; low: number; high: number }[] = []
  let k = hist[hist.length - 1].month
  for (let i = 0; i < ahead; i++) {
    k = nextMonthKey(k)
    future.push({ month: k, cents: avg, low: Math.max(0, avg - sd * (1 + i * 0.3)), high: avg + sd * (1 + i * 0.3) })
  }
  return { hist, future }
}

/** Compromissos futuros conhecidos: parcelas restantes identificadas no CSV. */
export function futureInstallments(txs: Transaction[]) {
  const latest = new Map<string, Transaction>()
  for (const t of txs) {
    if (t.isExcluded || !t.installmentTotal || !t.installmentNumber) continue
    const k = `${t.accountId}|${t.merchantName}|${t.installmentTotal}|${t.amountInCents}`
    const cur = latest.get(k)
    if (!cur || t.installmentNumber > cur.installmentNumber!) latest.set(k, t)
  }
  const byMonth = new Map<string, number>()
  const items = [...latest.values()].map((t) => {
    const remaining = t.installmentTotal! - t.installmentNumber!
    let mk = monthKey(t.normalizedDate)
    for (let i = 0; i < remaining; i++) { mk = nextMonthKey(mk); byMonth.set(mk, (byMonth.get(mk) ?? 0) - t.amountInCents) }
    return { id: t.id, merchant: t.merchantName, current: t.installmentNumber!, total: t.installmentTotal!, monthlyCents: -t.amountInCents, remaining, remainingCents: -t.amountInCents * remaining }
  })
  return { items: items.sort((a, b) => b.remainingCents - a.remainingCents), byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)) }
}
