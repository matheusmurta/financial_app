<script setup lang="ts">
import { computed } from 'vue'
import type { Comparison } from '@/modules/comparison/compare'
import { comparisonChart } from '@/components/charts/options2'
import ChartContainer from '@/components/ChartContainer.vue'
import VariationBadge from '@/components/VariationBadge.vue'
import { formatBRL } from '@/utils/money'

const props = defineProps<{ c: Comparison; la: string; lb: string }>()
const grew = computed(() => props.c.categories.filter((x) => x.delta > 0).slice(0, 5))
const fell = computed(() => props.c.categories.filter((x) => x.delta < 0).slice(0, 5))
const explanation = computed(() => {
  const x = props.c, top = x.categories[0], m = x.merchants[0]
  const parts = [`Despesas ${x.expenseDelta >= 0 ? 'subiram' : 'caíram'} ${formatBRL(Math.abs(x.expenseDelta))} de A para B.`]
  if (top?.delta) parts.push(`A maior diferença veio de ${top.label} (${formatBRL(top.delta)}).`)
  if (m?.delta) parts.push(`Estabelecimento com maior variação: ${m.key} (${formatBRL(m.delta)}).`)
  return parts.join(' ')
})
</script>

<template>
  <p v-if="c.coverageWarning" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{{ c.coverageWarning }}</p>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="card"><p class="label">Despesas A → B</p><p class="font-semibold tabular-nums">{{ formatBRL(c.a.expenseCents) }} → {{ formatBRL(c.b.expenseCents) }}</p><VariationBadge :value="c.expensePct" invert /></div>
    <div class="card"><p class="label">Receitas A → B</p><p class="font-semibold tabular-nums">{{ formatBRL(c.a.incomeCents) }} → {{ formatBRL(c.b.incomeCents) }}</p><VariationBadge :value="c.incomePct" /></div>
    <div class="card"><p class="label">Média diária de gasto</p><p class="font-semibold tabular-nums">{{ formatBRL(c.dailyExpenseA) }} → {{ formatBRL(c.dailyExpenseB) }}</p><VariationBadge :value="c.dailyPct" invert /></div>
    <div class="card"><p class="label">Resultado A → B</p><p class="font-semibold tabular-nums">{{ formatBRL(c.a.netCents) }} → {{ formatBRL(c.b.netCents) }}</p></div>
  </div>
  <p class="card text-sm">{{ explanation }}</p>
  <ChartContainer title="Categorias: A vs B" :option="comparisonChart(c.categories, la, lb)" explanation="Despesas por categoria, ordenadas pela maior diferença absoluta." />
  <div class="grid gap-3 md:grid-cols-2">
    <div class="card"><h3 class="mb-2 font-semibold">Cresceram</h3><p v-if="!grew.length" class="muted">Nenhuma.</p>
      <div v-for="g in grew" :key="g.key" class="flex justify-between py-1 text-sm"><span>{{ g.label }}</span><span class="neg tabular-nums">+{{ formatBRL(g.delta) }}</span></div></div>
    <div class="card"><h3 class="mb-2 font-semibold">Diminuíram</h3><p v-if="!fell.length" class="muted">Nenhuma.</p>
      <div v-for="g in fell" :key="g.key" class="flex justify-between py-1 text-sm"><span>{{ g.label }}</span><span class="pos tabular-nums">{{ formatBRL(g.delta) }}</span></div></div>
  </div>
  <div class="card"><h3 class="mb-2 font-semibold">Estabelecimentos com maior diferença</h3>
    <div v-for="m in c.merchants" :key="m.key" class="flex justify-between gap-2 border-b border-zinc-100 py-2 text-sm last:border-0 dark:border-zinc-800">
      <span class="truncate">{{ m.key }}</span><span class="shrink-0 tabular-nums">{{ formatBRL(m.a) }} → {{ formatBRL(m.b) }}</span></div></div>
</template>
