<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import type { FinancialGoal } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import { monthly } from '@/modules/analytics/engine'
import { formatBRL, parseBRLToCents } from '@/utils/money'
import { todayISO, formatDate } from '@/utils/date'
import { differenceInCalendarMonths, parseISO } from 'date-fns'
import { uid } from '@/utils/text'

const store = useFinanceStore()
const title = ref(''), target = ref(''), date = ref('')
const extra = ref('')
/** Capacidade média de poupança: média do resultado mensal (dados disponíveis). */
const capacity = computed(() => {
  const m = monthly(store.data.transactions, 'consumption', store.cardIds)
  return m.length ? Math.round(m.reduce((a, x) => a + x.netCents, 0) / m.length) : null
})
const essentialAvg = computed(() => {
  const ess = new Set(store.data.categories.filter((c) => c.essentiality === 'essential').map((c) => c.id))
  const m = monthly(store.data.transactions.filter((t) => ess.has(t.categoryId)), 'consumption', store.cardIds)
  return m.length ? Math.round(m.reduce((a, x) => a + x.expenseCents, 0) / m.length) : null
})
function add() {
  const c = parseBRLToCents(target.value)
  if (!title.value.trim() || !c) return
  store.upsert('goals', { id: uid('goal'), title: title.value.trim(), targetInCents: c, currentInCents: 0, targetDate: date.value || null })
  title.value = ''; target.value = ''; date.value = ''
}
function info(g: FinancialGoal) {
  const remaining = Math.max(0, g.targetInCents - g.currentInCents)
  const months = g.targetDate ? Math.max(1, differenceInCalendarMonths(parseISO(g.targetDate), parseISO(todayISO()))) : null
  const extraC = parseBRLToCents(extra.value) ?? 0
  const pace = (capacity.value ?? 0) + extraC
  return { remaining, pct: g.targetInCents ? (g.currentInCents / g.targetInCents) * 100 : 0, needed: months ? Math.ceil(remaining / months) : null, eta: pace > 0 ? Math.ceil(remaining / pace) : null }
}
function setCurrent(g: FinancialGoal, v: string) { const c = parseBRLToCents(v); if (c != null) store.upsert('goals', { ...g, currentInCents: c }) }
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Metas e reserva</h1>
    <div class="grid grid-cols-2 gap-3">
      <div class="card"><p class="label">Resultado médio mensal (estimado)</p><p class="font-semibold">{{ capacity == null ? '—' : formatBRL(capacity) }}</p></div>
      <div class="card"><p class="label">Custo essencial médio / mês</p><p class="font-semibold">{{ essentialAvg == null ? '—' : formatBRL(essentialAvg) }}</p>
        <p v-if="essentialAvg" class="muted text-xs">Reserva de 6 meses sugerida: {{ formatBRL(essentialAvg * 6) }}</p></div>
    </div>
    <form class="card grid gap-2 md:grid-cols-4" @submit.prevent="add">
      <input v-model="title" class="input" placeholder="Título" aria-label="Título" />
      <input v-model="target" class="input" inputmode="decimal" placeholder="Valor-alvo (R$)" aria-label="Valor-alvo" />
      <input v-model="date" type="date" class="input" aria-label="Prazo" />
      <button class="btn-primary">Criar meta</button>
    </form>
    <label class="block md:w-80"><span class="label">Simular aporte extra mensal (R$)</span><input v-model="extra" class="input" inputmode="decimal" /></label>
    <div v-for="g in store.data.goals" :key="g.id" class="card space-y-2">
      <div class="flex items-center gap-2"><input :value="g.title" class="input flex-1" aria-label="Título" @change="store.upsert('goals', { ...g, title: ($event.target as HTMLInputElement).value })" />
        <button class="grid h-10 w-10 place-items-center text-rose-600" aria-label="Excluir" @click="store.remove('goals', g.id)"><Trash2 class="h-4 w-4" /></button></div>
      <div class="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div class="h-full rounded-full bg-emerald-500" :style="{ width: Math.min(100, info(g).pct) + '%' }" /></div>
      <div class="grid gap-2 text-sm md:grid-cols-3">
        <label><span class="label">Valor atual (R$)</span><input :value="(g.currentInCents / 100).toFixed(2).replace('.', ',')" class="input" inputmode="decimal" @change="setCurrent(g, ($event.target as HTMLInputElement).value)" /></label>
        <div><p class="label">Alvo</p>{{ formatBRL(g.targetInCents) }}{{ g.targetDate ? ` até ${formatDate(g.targetDate)}` : '' }}</div>
        <div><p class="label">Progresso</p>{{ info(g).pct.toFixed(0) }}% · faltam {{ formatBRL(info(g).remaining) }}</div>
      </div>
      <p class="muted text-xs">
        <template v-if="info(g).needed">Contribuição necessária: {{ formatBRL(info(g).needed!) }}/mês. </template>
        <template v-if="info(g).eta">No ritmo atual{{ extra ? ' + aporte extra' : '' }}: ~{{ info(g).eta }} meses (estimativa).</template>
        <template v-else>Resultado médio não positivo: sem projeção de conclusão.</template>
      </p>
    </div>
  </div>
</template>
