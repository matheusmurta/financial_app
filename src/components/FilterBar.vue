<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, X } from '@lucide/vue'
import { useFinanceStore } from '@/stores/finance'
import { presetRange, activeFilterChips, removeChip, emptyFilters, type PresetPeriod } from '@/modules/transactions/filters'
import FilterDrawer from './FilterDrawer.vue'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const open = ref(false)
const preset = ref<PresetPeriod | 'custom'>('all')
/** Presets relativos à última data importada (não à data de hoje), para não mostrar vazio. */
const lastDate = computed(() => store.data.transactions.reduce((m, t) => (t.normalizedDate > m ? t.normalizedDate : m), '') || undefined)
const PRESETS: [PresetPeriod, string][] = [['all', 'Tudo'], ['month', 'Mês'], ['30d', '30 dias'], ['90d', '90 dias'], ['quarter', 'Trimestre'], ['semester', 'Semestre'], ['year', 'Ano'], ['180d', '180 dias'], ['365d', '365 dias']]

function setPreset(p: PresetPeriod) {
  preset.value = p
  const [a, b] = presetRange(p, lastDate.value)
  store.filters = { ...store.filters, dateFrom: a, dateTo: b }
}
const chips = computed(() => activeFilterChips(store.filters, {
  account: (id) => store.accountById.get(id)?.name ?? id,
  category: (id) => store.categoryById.get(id)?.name ?? id,
  import: (id) => store.data.imports.find((i) => i.id === id)?.name ?? id,
}))
function clear() { store.filters = emptyFilters(); preset.value = 'all' }

// URL: somente período e ids (sem valores ou descrições).
onMounted(() => {
  const q = route.query
  if (q.de || q.ate || q.contas || q.cats)
    store.filters = { ...store.filters, dateFrom: (q.de as string) || null, dateTo: (q.ate as string) || null,
      accountIds: q.contas ? String(q.contas).split(',') : [], categoryIds: q.cats ? String(q.cats).split(',') : [] }
})
watch(() => [store.filters.dateFrom, store.filters.dateTo, store.filters.accountIds, store.filters.categoryIds], () => {
  const f = store.filters
  router.replace({ query: { ...route.query, de: f.dateFrom ?? undefined, ate: f.dateTo ?? undefined, contas: f.accountIds.join(',') || undefined, cats: f.categoryIds.join(',') || undefined } })
})
</script>

<template>
  <div class="space-y-2">
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <button v-for="[p, l] in PRESETS" :key="p" class="chip min-h-9 shrink-0" :class="preset === p ? '!bg-emerald-600 text-white' : ''" @click="setPreset(p)">{{ l }}</button>
      <button class="chip min-h-9 shrink-0 !bg-zinc-900 text-white dark:!bg-white dark:text-zinc-900" @click="open = true"><Filter class="h-3 w-3" />Filtros</button>
    </div>
    <div v-if="chips.length" class="flex flex-wrap items-center gap-2">
      <button v-for="c in chips" :key="c.key + (c.value ?? '')" class="chip" @click="store.filters = removeChip(store.filters, c.key, c.value)">{{ c.label }}<X class="h-3 w-3" /></button>
      <button class="text-xs font-medium text-rose-600" @click="clear">Limpar filtros</button>
    </div>
    <FilterDrawer :open="open" @close="open = false" />
  </div>
</template>
