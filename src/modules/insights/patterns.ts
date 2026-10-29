import type { Transaction } from '@/types'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { normalizeKey } from '@/utils/text'

export interface Recurrence {
  key: string
  merchant: string
  frequency: 'monthly' | 'weekly' | 'yearly'
  averageCents: number
  lastCents: number
  occurrences: number
  lastDate: string
  monthlyEstimateCents: number
  annualEstimateCents: number
  priceChangePct: number | null
  confidence: number
  ids: string[]
  active: boolean
}

/**
 * Detecta cobranças recorrentes por estabelecimento: intervalos regulares
 * (~7, ~30 ou ~365 dias) e valores similares (±15% da mediana).
 */
export function detectRecurrences(txs: Transaction[], referenceDate?: string): Recurrence[] {
  const groups = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (t.isExcluded || t.amountInCents >= 0 || t.isTransfer || t.isCreditCardPayment) continue
    const k = normalizeKey(t.merchantName || t.normalizedDescription)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(t)
  }
  const ref = referenceDate ?? txs.reduce((m, t) => (t.normalizedDate > m ? t.normalizedDate : m), '')
  const out: Recurrence[] = []
  for (const [key, list] of groups) {
    if (list.length < 3 && !(list.length === 2 && list.some((t) => t.categoryId === 'assinaturas'))) continue
    list.sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate))
    const gaps: number[] = []
    for (let i = 1; i < list.length; i++) gaps.push(differenceInCalendarDays(parseISO(list[i].normalizedDate), parseISO(list[i - 1].normalizedDate)))
    const med = median(gaps)
    let frequency: Recurrence['frequency'] | null = null
    if (med >= 25 && med <= 35) frequency = 'monthly'
    else if (med >= 6 && med <= 8) frequency = 'weekly'
    else if (med >= 350 && med <= 380) frequency = 'yearly'
    if (!frequency) continue
    const amounts = list.map((t) => -t.amountInCents)
    const medAmt = median(amounts)
    const similar = amounts.filter((a) => Math.abs(a - medAmt) <= medAmt * 0.15).length / amounts.length
    const regular = gaps.filter((g) => Math.abs(g - med) <= (frequency === 'weekly' ? 2 : 6)).length / gaps.length
    if (similar < 0.6 || regular < 0.6) continue
    const avg = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
    const last = amounts[amounts.length - 1], prev = amounts[amounts.length - 2]
    const monthly = frequency === 'monthly' ? avg : frequency === 'weekly' ? Math.round((avg * 52) / 12) : Math.round(avg / 12)
    const lastDate = list[list.length - 1].normalizedDate
    const expectedGap = frequency === 'monthly' ? 30 : frequency === 'weekly' ? 7 : 365
    out.push({
      key, merchant: list[list.length - 1].merchantName, frequency, averageCents: avg, lastCents: last,
      occurrences: list.length, lastDate, monthlyEstimateCents: monthly, annualEstimateCents: monthly * 12,
      priceChangePct: prev && prev !== last ? ((last - prev) / prev) * 100 : null,
      confidence: Math.min(0.95, 0.4 + 0.1 * list.length) * similar * regular,
      ids: list.map((t) => t.id),
      active: ref ? differenceInCalendarDays(parseISO(ref), parseISO(lastDate)) <= expectedGap * 1.6 : true,
    })
  }
  return out.sort((a, b) => b.monthlyEstimateCents - a.monthlyEstimateCents)
}

export function median(v: number[]): number {
  if (!v.length) return 0
  const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

export interface Anomaly { id: string; kind: 'high_value' | 'duplicate' | 'new_merchant'; message: string; ids: string[] }

/** Anomalias estatísticas. Nunca afirma fraude: apenas sinaliza para conferência. */
export function detectAnomalies(txs: Transaction[], recentFrom: string): Anomaly[] {
  const out: Anomaly[] = []
  const exp = txs.filter((t) => !t.isExcluded && t.amountInCents < 0 && !t.isTransfer && !t.isCreditCardPayment)
  const byCat = new Map<string, number[]>()
  for (const t of exp) { if (!byCat.has(t.categoryId)) byCat.set(t.categoryId, []); byCat.get(t.categoryId)!.push(-t.amountInCents) }
  for (const t of exp) {
    if (t.normalizedDate < recentFrom) continue
    const vals = byCat.get(t.categoryId)!
    if (vals.length < 5) continue
    const med = median(vals)
    const mad = median(vals.map((v) => Math.abs(v - med))) || med * 0.25
    if (-t.amountInCents > med + 5 * mad && -t.amountInCents > med * 2.5)
      out.push({ id: `hv_${t.id}`, kind: 'high_value', message: `${t.merchantName}: valor ${((-t.amountInCents / med)).toFixed(1).replace('.', ',')}× a mediana da categoria`, ids: [t.id] })
  }
  const seen = new Map<string, Transaction>()
  for (const t of exp) {
    const k = `${t.accountId}|${t.normalizedDate}|${t.amountInCents}|${normalizeKey(t.originalDescription)}`
    const o = seen.get(k)
    if (o && t.importId !== o.importId) continue // sobreposição de arquivos é tratada na importação
    if (o) out.push({ id: `dup_${t.id}`, kind: 'duplicate', message: `Possível cobrança duplicada: ${t.merchantName}`, ids: [o.id, t.id] })
    else seen.set(k, t)
  }
  const firstSeen = new Map<string, string>()
  for (const t of [...exp].sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate))) {
    const k = normalizeKey(t.merchantName)
    if (!firstSeen.has(k)) firstSeen.set(k, t.normalizedDate)
  }
  const hasHistory = exp.some((t) => t.normalizedDate < recentFrom)
  if (hasHistory) {
    const newOnes = exp.filter((t) => t.normalizedDate >= recentFrom && firstSeen.get(normalizeKey(t.merchantName)) === t.normalizedDate && -t.amountInCents >= 20000)
    for (const t of newOnes.slice(0, 5))
      out.push({ id: `new_${t.id}`, kind: 'new_merchant', message: `Estabelecimento novo com valor relevante: ${t.merchantName}`, ids: [t.id] })
  }
  return out
}
