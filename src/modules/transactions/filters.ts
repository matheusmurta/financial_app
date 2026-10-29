import type { Transaction, TransactionFilters, Category } from '@/types'
import { normalizeKey } from '@/utils/text'
import { todayISO, shiftDays, monthRange } from '@/utils/date'

export function emptyFilters(): TransactionFilters {
  return {
    dateFrom: null, dateTo: null, accountIds: [], importIds: [], categoryIds: [], types: [], direction: null,
    search: '', minCents: null, maxCents: null, essentiality: null, recurring: null, installment: null,
    onlyUncategorized: false, includeExcluded: false, onlyDuplicates: false,
  }
}

/** Aplica todos os filtros combinados. Função pura. */
export function applyFilters(txs: Transaction[], f: TransactionFilters, cats: Category[]): Transaction[] {
  const ess = new Map(cats.map((c) => [c.id, c.essentiality]))
  const acc = new Set(f.accountIds), imp = new Set(f.importIds), cat = new Set(f.categoryIds), typ = new Set(f.types)
  const q = normalizeKey(f.search)
  return txs.filter((t) => {
    if (!f.includeExcluded && t.isExcluded) return false
    if (f.dateFrom && t.normalizedDate < f.dateFrom) return false
    if (f.dateTo && t.normalizedDate > f.dateTo) return false
    if (acc.size && !acc.has(t.accountId)) return false
    if (imp.size && !imp.has(t.importId)) return false
    if (cat.size && !cat.has(t.categoryId)) return false
    if (typ.size && !typ.has(t.transactionType)) return false
    if (f.direction && t.direction !== f.direction) return false
    const abs = Math.abs(t.amountInCents)
    if (f.minCents != null && abs < f.minCents) return false
    if (f.maxCents != null && abs > f.maxCents) return false
    if (f.essentiality && ess.get(t.categoryId) !== f.essentiality) return false
    if (f.recurring != null && t.isRecurring !== f.recurring) return false
    if (f.installment != null && (t.installmentTotal != null) !== f.installment) return false
    if (f.onlyUncategorized && t.categoryId !== 'nao_classificado') return false
    if (f.onlyDuplicates && !t.isDuplicateCandidate) return false
    if (q && !normalizeKey(`${t.originalDescription} ${t.merchantName}`).includes(q)) return false
    return true
  })
}

export type PresetPeriod = '7d' | '30d' | '90d' | '180d' | '365d' | 'month' | 'quarter' | 'semester' | 'year' | 'all'

export function presetRange(p: PresetPeriod, ref = todayISO()): [string | null, string | null] {
  const y = ref.slice(0, 4), m = +ref.slice(5, 7)
  switch (p) {
    case '7d': return [shiftDays(ref, -6), ref]
    case '30d': return [shiftDays(ref, -29), ref]
    case '90d': return [shiftDays(ref, -89), ref]
    case '180d': return [shiftDays(ref, -179), ref]
    case '365d': return [shiftDays(ref, -364), ref]
    case 'month': return monthRange(ref.slice(0, 7))
    case 'quarter': { const q = Math.floor((m - 1) / 3) * 3 + 1; return [`${y}-${String(q).padStart(2, '0')}-01`, monthRange(`${y}-${String(q + 2).padStart(2, '0')}`)[1]] }
    case 'semester': return m <= 6 ? [`${y}-01-01`, `${y}-06-30`] : [`${y}-07-01`, `${y}-12-31`]
    case 'year': return [`${y}-01-01`, `${y}-12-31`]
    default: return [null, null]
  }
}

/** Chips legíveis dos filtros ativos. */
export function activeFilterChips(f: TransactionFilters, labels: { account: (id: string) => string; category: (id: string) => string; import: (id: string) => string }) {
  const chips: { key: keyof TransactionFilters; value?: string; label: string }[] = []
  if (f.dateFrom || f.dateTo) chips.push({ key: 'dateFrom', label: `${f.dateFrom ?? '…'} → ${f.dateTo ?? '…'}` })
  f.accountIds.forEach((v) => chips.push({ key: 'accountIds', value: v, label: labels.account(v) }))
  f.categoryIds.forEach((v) => chips.push({ key: 'categoryIds', value: v, label: labels.category(v) }))
  f.importIds.forEach((v) => chips.push({ key: 'importIds', value: v, label: labels.import(v) }))
  if (f.direction) chips.push({ key: 'direction', label: f.direction === 'credit' ? 'Entradas' : 'Saídas' })
  if (f.search) chips.push({ key: 'search', label: `“${f.search}”` })
  if (f.minCents != null) chips.push({ key: 'minCents', label: `≥ R$ ${(f.minCents / 100).toFixed(2)}` })
  if (f.maxCents != null) chips.push({ key: 'maxCents', label: `≤ R$ ${(f.maxCents / 100).toFixed(2)}` })
  if (f.essentiality) chips.push({ key: 'essentiality', label: f.essentiality === 'essential' ? 'Essenciais' : 'Não essenciais' })
  if (f.recurring != null) chips.push({ key: 'recurring', label: f.recurring ? 'Recorrentes' : 'Não recorrentes' })
  if (f.installment != null) chips.push({ key: 'installment', label: f.installment ? 'Parceladas' : 'À vista' })
  if (f.onlyUncategorized) chips.push({ key: 'onlyUncategorized', label: 'Pendentes de classificação' })
  if (f.includeExcluded) chips.push({ key: 'includeExcluded', label: 'Incluindo ignoradas' })
  if (f.onlyDuplicates) chips.push({ key: 'onlyDuplicates', label: 'Possíveis duplicidades' })
  return chips
}

export function removeChip(f: TransactionFilters, key: keyof TransactionFilters, value?: string): TransactionFilters {
  const n = { ...f } as unknown as Record<string, unknown>
  const empty = emptyFilters() as unknown as Record<string, unknown>
  if (key === 'dateFrom') { n.dateFrom = null; n.dateTo = null }
  else if (Array.isArray(n[key]) && value) n[key] = (n[key] as string[]).filter((x) => x !== value)
  else n[key] = empty[key]
  return n as unknown as TransactionFilters
}
