<script setup lang="ts">
import { ref } from 'vue'
import type { Insight } from '@/types'
import { TrendingUp, TrendingDown, TriangleAlert, Lightbulb, Info, Sparkles, LineChart } from '@lucide/vue'
import { formatBRL } from '@/utils/money'

defineProps<{ insight: Insight }>()
const emit = defineEmits<{ open: [ids: string[]] }>()
const expanded = ref(false)
const ICON = { positive: TrendingDown, negative: TrendingUp, alert: TriangleAlert, opportunity: Lightbulb, trend: LineChart, forecast: Sparkles, info: Info }
const TONE = {
  positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  negative: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  alert: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  opportunity: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  trend: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  forecast: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  info: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}
</script>

<template>
  <article class="card">
    <div class="flex gap-3">
      <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="TONE[insight.type]"><component :is="ICON[insight.type]" class="h-5 w-5" /></div>
      <div class="min-w-0 flex-1">
        <h3 class="font-medium leading-snug">{{ insight.title }}</h3>
        <p class="muted mt-1">{{ insight.description }}</p>
        <p v-if="insight.estimatedImpactInCents" class="mt-1 text-xs text-zinc-500">Impacto estimado (anual/período): {{ formatBRL(Math.abs(insight.estimatedImpactInCents)) }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button class="text-xs font-medium text-emerald-700 dark:text-emerald-400" @click="expanded = !expanded">{{ expanded ? 'Ocultar cálculo' : 'Como foi calculado?' }}</button>
          <button v-if="insight.transactionIds.length" class="text-xs font-medium text-sky-700 dark:text-sky-400" @click="emit('open', insight.transactionIds)">Ver {{ insight.transactionIds.length }} transações</button>
        </div>
        <div v-if="expanded" class="mt-2 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <p>{{ insight.howCalculated }}</p>
          <ul v-if="insight.evidence.length" class="mt-1 list-disc pl-4"><li v-for="e in insight.evidence" :key="e">{{ e }}</li></ul>
          <p class="mt-1">Período: {{ insight.period }} · Confiança: {{ Math.round(insight.confidence * 100) }}%</p>
        </div>
      </div>
    </div>
  </article>
</template>
