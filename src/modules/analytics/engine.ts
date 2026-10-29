import type { Transaction, Category } from '@/types'
import { NON_CONSUMPTION_CATEGORIES } from '@/constants/categories'
import { monthKey } from '@/utils/date'

export type ViewMode = 'consumption' | 'cash'

/**
 * Regras centrais (docs/regras-financeiras.md):
 * - Consumo: compras do cartão + débitos bancários de consumo. Pagamento de fatura EXCLUÍDO
 *   (compras do cartão já contadas). Transferências/investimentos excluídos.
 * - Caixa: apenas conta corrente; pagamento de fatura É saída; compras no cartão não são caixa.
 * - Estornos reduzem despesa (não são receita).
 */
export function isExpense(t: Transaction, mode: ViewMode, cards: Set<string>): boolean {
  if (t.isExcluded) return false
  const card = cards.has(t.accountId)
  if (mode === 'cash') return !card && t.amountInCents < 0 && !t.isTransfer
  if (t.isCreditCardPayment || t.isTransfer || NON_CONSUMPTION_CATEGORIES.has(t.categoryId)) return false
  return t.amountInCents < 0 || t.isRefund
}

export function isIncome(t: Transaction, mode: ViewMode, cards: Set<string>): boolean {
  if (t.isExcluded || cards.has(t.accountId) || t.amountInCents <= 0) return false
  if (mode === 'cash') return !t.isTransfer
  return !t.isTransfer && !t.isRefund && !t.isCreditCardPayment && !NON_CONSUMPTION_CATEGORIES.has(t.categoryId)
}

/** Despesa em centavos positivos (estornos entram negativos, reduzindo o total). */
export const expenseValue = (t: Transaction) => -t.amountInCents

export interface Summary {
  incomeCents: number; expenseCents: number; netCents: number; savingsRate: number | null
  cardSpendCents: number; bankOutflowCents: number; feesCents: number; refundsCents: number
  count: number; excludedCount: number; txIncome: string[]; txExpense: string[]
  firstDate: string | null; lastDate: string | null
}

export function summarize(txs: Transaction[], mode: ViewMode, cards: Set<string>): Summary {
  const s: Summary = {
    incomeCents: 0, expenseCents: 0, netCents: 0, savingsRate: null, cardSpendCents: 0, bankOutflowCents: 0,
    feesCents: 0, refundsCents: 0, count: txs.length, excludedCount: 0, txIncome: [], txExpense: [], firstDate: null, lastDate: null,
  }
  for (const t of txs) {
    if (t.isExcluded) { s.excludedCount++; continue }
    if (!s.firstDate || t.normalizedDate < s.firstDate) s.firstDate = t.normalizedDate
    if (!s.lastDate || t.normalizedDate > s.lastDate) s.lastDate = t.normalizedDate
    const card = cards.has(t.accountId)
    if (isIncome(t, mode, cards)) { s.incomeCents += t.amountInCents; s.txIncome.push(t.id) }
    if (isExpense(t, mode, cards)) { s.expenseCents += expenseValue(t); s.txExpense.push(t.id) }
    if (card && !t.isCreditCardPayment && (t.amountInCents < 0 || t.isRefund)) s.cardSpendCents += expenseValue(t)
    if (!card && t.amountInCents < 0) s.bankOutflowCents -= t.amountInCents
    if (t.transactionType === 'fee' || t.transactionType === 'interest') s.feesCents -= t.amountInCents
    if (t.isRefund) s.refundsCents += Math.abs(t.amountInCents)
  }
  s.netCents = s.incomeCents - s.expenseCents
  s.savingsRate = s.incomeCents > 0 ? (s.netCents / s.incomeCents) * 100 : null
  return s
}

export interface Group { key: string; label: string; cents: number; count: number; ids: string[] }

export function groupExpenses(
  txs: Transaction[], mode: ViewMode, cards: Set<string>, keyFn: (t: Transaction) => string, labelFn: (k: string) => string = (k) => k,
): Group[] {
  const map = new Map<string, Group>()
  for (const t of txs) {
    if (!isExpense(t, mode, cards)) continue
    const k = keyFn(t)
    const g = map.get(k) ?? { key: k, label: labelFn(k), cents: 0, count: 0, ids: [] }
    g.cents += expenseValue(t); g.count++; g.ids.push(t.id)
    map.set(k, g)
  }
  return [...map.values()].sort((a, b) => b.cents - a.cents)
}

export const byCategory = (txs: Transaction[], mode: ViewMode, cards: Set<string>, cats: Category[]) => {
  const names = new Map(cats.map((c) => [c.id, c.name]))
  return groupExpenses(txs, mode, cards, (t) => t.categoryId, (k) => names.get(k) ?? k)
}
export const byMerchant = (txs: Transaction[], mode: ViewMode, cards: Set<string>) =>
  groupExpenses(txs, mode, cards, (t) => t.merchantName || t.normalizedDescription)

export interface MonthRow { month: string; incomeCents: number; expenseCents: number; netCents: number; count: number }

/** Agrupa por mês. Meses sem dados NÃO são preenchidos com zero. */
export function monthly(txs: Transaction[], mode: ViewMode, cards: Set<string>): MonthRow[] {
  const map = new Map<string, Transaction[]>()
  for (const t of txs) {
    const k = monthKey(t.normalizedDate)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(t)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, list]) => {
    const s = summarize(list, mode, cards)
    return { month, incomeCents: s.incomeCents, expenseCents: s.expenseCents, netCents: s.netCents, count: list.length }
  })
}

export function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => (i + 1 < window ? null : Math.round(values.slice(i + 1 - window, i + 1).reduce((a, b) => a + b, 0) / window)))
}
