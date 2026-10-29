import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { summarize, byCategory, byMerchant, monthly } from '@/modules/analytics/engine'
import { generateInsights } from '@/modules/insights/engine'
import { detectRecurrences } from '@/modules/insights/patterns'
import { futureInstallments } from '@/modules/forecast/forecast'
import { daysBetweenInclusive, shiftDays } from '@/utils/date'
import { percentChange } from '@/utils/money'

/** Métricas memoizadas sobre as transações filtradas globalmente. */
export function useAnalytics() {
  const store = useFinanceStore()
  const mode = computed(() => store.data.settings.viewMode)
  const txs = computed(() => store.filtered)
  const summary = computed(() => summarize(txs.value, mode.value, store.cardIds))
  const categories = computed(() => byCategory(txs.value, mode.value, store.cardIds, store.data.categories))
  const merchants = computed(() => byMerchant(txs.value, mode.value, store.cardIds))
  const months = computed(() => monthly(txs.value, mode.value, store.cardIds))

  /** Período anterior de mesma duração (usa todas as transações, respeitando conta/categoria). */
  const previous = computed(() => {
    const s = summary.value
    const from = store.filters.dateFrom ?? s.firstDate, to = store.filters.dateTo ?? s.lastDate
    if (!from || !to) return null
    const days = daysBetweenInclusive(from, to)
    const pf = shiftDays(from, -days), pt = shiftDays(from, -1)
    const prevTx = store.data.transactions.filter((t) => t.normalizedDate >= pf && t.normalizedDate <= pt
      && (!store.filters.accountIds.length || store.filters.accountIds.includes(t.accountId)))
    if (!prevTx.length) return null
    return { range: [pf, pt] as const, summary: summarize(prevTx, mode.value, store.cardIds) }
  })
  const variation = computed(() => {
    const p = previous.value?.summary
    if (!p) return { income: null, expense: null, net: null, card: null }
    return {
      income: percentChange(p.incomeCents, summary.value.incomeCents),
      expense: percentChange(p.expenseCents, summary.value.expenseCents),
      net: percentChange(p.netCents, summary.value.netCents),
      card: percentChange(p.cardSpendCents, summary.value.cardSpendCents),
    }
  })
  const refMonth = computed(() => (store.filters.dateTo ?? summary.value.lastDate ?? '').slice(0, 7))
  const insights = computed(() => refMonth.value ? generateInsights(store.data.transactions, store.data.categories, store.cardIds, refMonth.value, mode.value) : [])
  const recurrences = computed(() => detectRecurrences(store.data.transactions))
  const installments = computed(() => futureInstallments(store.data.transactions))

  /** Último saldo conhecido por conta corrente (observado no extrato). */
  const knownBalance = computed(() => {
    let total = 0, found = false, date = ''
    for (const a of store.data.accounts.filter((x) => x.type === 'checking')) {
      const withBal = store.data.transactions.filter((t) => t.accountId === a.id && t.balanceAfterInCents != null)
      if (!withBal.length) continue
      const last = withBal.reduce((m, t) => (t.normalizedDate >= m.normalizedDate ? t : m))
      total += last.balanceAfterInCents!; found = true
      if (last.normalizedDate > date) date = last.normalizedDate
    }
    return found ? { cents: total, date } : null
  })

  return { store, mode, txs, summary, categories, merchants, months, previous, variation, insights, recurrences, installments, knownBalance, refMonth }
}
