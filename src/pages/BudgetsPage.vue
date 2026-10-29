<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import { useFinanceStore } from '@/stores/finance'
import ChartContainer from '@/components/ChartContainer.vue'
import { budgetChart } from '@/components/charts/options2'
import { byCategory, monthly } from '@/modules/analytics/engine'
import { formatBRL, parseBRLToCents } from '@/utils/money'
import { monthRange, daysBetweenInclusive, formatMonthLong } from '@/utils/date'
import { median } from '@/modules/insights/patterns'
import { uid } from '@/utils/text'

const store = useFinanceStore()
const month = computed(() => store.data.transactions.reduce((m, t) => (t.normalizedDate > m ? t.normalizedDate : m), '').slice(0, 7))
const lastDay = computed(() => store.data.transactions.reduce((m, t) => (t.normalizedDate > m ? t.normalizedDate : m), ''))
const spent = computed(() => {
  if (!month.value) return new Map<string, number>()
  const [s, e] = monthRange(month.value)
  const txs = store.data.transactions.filter((t) => t.normalizedDate >= s && t.normalizedDate <= e)
  return new Map(byCategory(txs, 'consumption', store.cardIds, store.data.categories).map((g) => [g.key, g.cents]))
})
/** Sugestão: mediana mensal histórica da categoria. */
function suggestion(catId: string): number | null {
  const txs = store.data.transactions.filter((t) => t.categoryId === catId)
  const m = monthly(txs, 'consumption', store.cardIds).map((x) => x.expenseCents).filter((v) => v > 0)
  return m.length >= 2 ? median(m) : null
}
const rows = computed(() => store.data.budgets.map((b) => {
  const s = spent.value.get(b.categoryId) ?? 0
  const limit = b.period === 'weekly' ? Math.round((b.limitInCents * 52) / 12) : b.limitInCents
  const [ms, me] = month.value ? monthRange(month.value) : ['', '']
  const elapsed = month.value ? daysBetweenInclusive(ms, lastDay.value) : 1, total = month.value ? daysBetweenInclusive(ms, me) : 1
  const projected = Math.round((s / elapsed) * total)
  const remainingDays = Math.max(1, total - elapsed)
  return { b, label: store.categoryById.get(b.categoryId)?.name ?? '?', limit, spent: s, pct: limit ? (s / limit) * 100 : 0, projected, daily: Math.max(0, Math.round((limit - s) / remainingDays)) }
}))
const catId = ref('delivery'), amount = ref(''), period = ref<'monthly' | 'weekly'>('monthly')
function add() {
  const c = parseBRLToCents(amount.value)
  if (!c || c <= 0) return
  store.upsert('budgets', { id: uid('bud'), categoryId: catId.value, period: period.value, limitInCents: c })
  amount.value = ''
}
const sug = computed(() => suggestion(catId.value))
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Orçamentos</h1>
    <p class="muted text-xs">Acompanhamento de {{ month ? formatMonthLong(month) : '—' }} (último mês com dados). Visão de consumo.</p>
    <form class="card grid gap-2 md:grid-cols-4" @submit.prevent="add">
      <select v-model="catId" class="input" aria-label="Categoria"><option v-for="c in store.data.categories" :key="c.id" :value="c.id">{{ c.name }}</option></select>
      <input v-model="amount" class="input" inputmode="decimal" placeholder="Limite (R$)" aria-label="Limite" />
      <select v-model="period" class="input" aria-label="Período"><option value="monthly">Mensal</option><option value="weekly">Semanal</option></select>
      <button class="btn-primary">Adicionar</button>
      <p v-if="sug" class="muted text-xs md:col-span-4">Sugestão pelo histórico (mediana mensal): <button type="button" class="font-medium text-emerald-700" @click="amount = (sug / 100).toFixed(2).replace('.', ',')">{{ formatBRL(sug) }}</button></p>
    </form>
    <div v-for="r in rows" :key="r.b.id" class="card space-y-2">
      <div class="flex items-center justify-between"><span class="font-medium">{{ r.label }} <span class="muted text-xs">({{ r.b.period === 'weekly' ? 'semanal → mensal' : 'mensal' }})</span></span>
        <button class="grid h-9 w-9 place-items-center text-rose-600" aria-label="Remover" @click="store.remove('budgets', r.b.id)"><Trash2 class="h-4 w-4" /></button></div>
      <div class="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div class="h-full rounded-full" :class="r.pct > 100 ? 'bg-rose-500' : r.pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'" :style="{ width: Math.min(100, r.pct) + '%' }" /></div>
      <p class="text-sm tabular-nums">{{ formatBRL(r.spent) }} de {{ formatBRL(r.limit) }} ({{ r.pct.toFixed(0) }}%)</p>
      <p class="muted text-xs">Projeção para o mês: {{ formatBRL(r.projected) }}<span v-if="r.projected > r.limit" class="neg"> — risco de estouro</span> · limite diário orientativo: {{ formatBRL(r.daily) }}</p>
    </div>
    <ChartContainer title="Orçado vs realizado" :option="budgetChart(rows)" explanation="Realizado no último mês com dados versus limite mensal equivalente." />
  </div>
</template>
