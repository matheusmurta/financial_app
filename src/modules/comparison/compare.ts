import type { Transaction, Category } from '@/types'
import { summarize, byCategory, byMerchant, type Summary, type ViewMode } from '@/modules/analytics/engine'
import { daysBetweenInclusive } from '@/utils/date'
import { percentChange } from '@/utils/money'

export interface Comparison {
  a: Summary; b: Summary; daysA: number; daysB: number
  expenseDelta: number; expensePct: number | null
  incomeDelta: number; incomePct: number | null
  dailyExpenseA: number; dailyExpenseB: number; dailyPct: number | null
  categories: { key: string; label: string; a: number; b: number; delta: number; pct: number | null }[]
  merchants: { key: string; a: number; b: number; delta: number }[]
  coverageWarning: string | null
}

export function compare(
  txA: Transaction[], txB: Transaction[], rangeA: [string, string], rangeB: [string, string],
  mode: ViewMode, cards: Set<string>, cats: Category[],
): Comparison {
  const a = summarize(txA, mode, cards), b = summarize(txB, mode, cards)
  const daysA = daysBetweenInclusive(...rangeA), daysB = daysBetweenInclusive(...rangeB)
  const ca = new Map(byCategory(txA, mode, cards, cats).map((g) => [g.key, g]))
  const cb = new Map(byCategory(txB, mode, cards, cats).map((g) => [g.key, g]))
  const categories = [...new Set([...ca.keys(), ...cb.keys()])].map((k) => {
    const av = ca.get(k)?.cents ?? 0, bv = cb.get(k)?.cents ?? 0
    return { key: k, label: (ca.get(k) ?? cb.get(k))!.label, a: av, b: bv, delta: bv - av, pct: percentChange(av, bv) }
  }).sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta))
  const ma = new Map(byMerchant(txA, mode, cards).map((g) => [g.key, g.cents]))
  const mb = new Map(byMerchant(txB, mode, cards).map((g) => [g.key, g.cents]))
  const merchants = [...new Set([...ma.keys(), ...mb.keys()])].map((k) => {
    const av = ma.get(k) ?? 0, bv = mb.get(k) ?? 0
    return { key: k, a: av, b: bv, delta: bv - av }
  }).sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta)).slice(0, 10)
  const dailyExpenseA = Math.round(a.expenseCents / daysA), dailyExpenseB = Math.round(b.expenseCents / daysB)
  return {
    a, b, daysA, daysB,
    expenseDelta: b.expenseCents - a.expenseCents, expensePct: percentChange(a.expenseCents, b.expenseCents),
    incomeDelta: b.incomeCents - a.incomeCents, incomePct: percentChange(a.incomeCents, b.incomeCents),
    dailyExpenseA, dailyExpenseB, dailyPct: percentChange(dailyExpenseA, dailyExpenseB), categories, merchants,
    coverageWarning: daysA !== daysB ? `Os períodos têm durações diferentes (${daysA} vs ${daysB} dias). Compare também pela média diária.` : null,
  }
}
