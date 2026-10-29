<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { InsightType } from '@/types'
import { useAnalytics } from '@/composables/useAnalytics'
import InsightCard from '@/components/InsightCard.vue'
import ChartContainer from '@/components/ChartContainer.vue'
import EmptyState from '@/components/EmptyState.vue'
import MetricCard from '@/components/MetricCard.vue'
import { forecastMonth, projectSeries } from '@/modules/forecast/forecast'
import { projectionChart, commitmentsChart } from '@/components/charts/options2'
import { monthRange } from '@/utils/date'
import { formatBRL } from '@/utils/money'

const a = useAnalytics()
const { store } = a
const router = useRouter()
const type = ref<InsightType | 'all'>('all')
const TYPES: [InsightType | 'all', string][] = [['all', 'Todos'], ['alert', 'Alertas'], ['opportunity', 'Oportunidades'], ['negative', 'Negativos'], ['positive', 'Positivos'], ['trend', 'Tendências'], ['info', 'Informações']]
const list = computed(() => a.insights.value.filter((i) => type.value === 'all' || i.type === type.value))
// Previsão para o último mês com dados (referência = última data importada).
const forecast = computed(() => (a.refMonth.value ? forecastMonth(store.data.transactions, a.mode.value, store.cardIds, lastDate.value) : null))
const lastDate = computed(() => {
  const end = monthRange(a.refMonth.value || '2000-01')[1]
  return store.data.transactions.reduce((m, t) => (t.normalizedDate > m && t.normalizedDate <= end ? t.normalizedDate : m), '')
})
const series = computed(() => projectSeries(store.data.transactions, a.mode.value, store.cardIds))
const openTx = (ids: string[]) => router.push({ path: '/transacoes', query: { ids: ids.slice(0, 200).join(',') } })
</script>

<template>
  <EmptyState v-if="!store.data.transactions.length" title="Sem dados para analisar" action-to="/importar" action-label="Importar extratos" />
  <div v-else class="space-y-5">
    <h1 class="h1">Insights e previsões</h1>
    <p class="muted text-xs">Gerados por regras determinísticas sobre suas transações reais. Nenhuma IA externa é usada.</p>

    <div v-if="forecast" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard label="Gasto observado no mês" :cents="forecast.observedCents" />
      <MetricCard label="Projeção do mês" :cents="forecast.projectedCents" estimated :hint="forecast.method" />
      <MetricCard label="Faixa provável" :text="`${formatBRL(forecast.lowCents)} – ${formatBRL(forecast.highCents)}`" estimated />
      <MetricCard label="Confiança" :text="forecast.confidence" :hint="forecast.limitations.join(' ') || 'Histórico suficiente.'" />
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <ChartContainer title="Projeção de despesas" subtitle="Média móvel de 3 meses com faixa de incerteza" :option="series ? projectionChart(series.hist, series.future) : null" explanation="Requer ao menos 3 meses com dados. A faixa cresce a cada mês projetado. É uma estimativa, não uma garantia." />
      <ChartContainer title="Compromissos futuros conhecidos" subtitle="Parcelas restantes identificadas no CSV" :option="commitmentsChart(a.installments.value.byMonth)" explanation="Somente parcelamentos com indicação explícita (ex.: 03/10). Não inferimos parcelas de compras à vista." />
    </div>

    <section v-if="a.recurrences.value.length" class="card">
      <h2 class="mb-2 font-semibold">Recorrências identificadas</h2>
      <ul class="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
        <li v-for="r in a.recurrences.value" :key="r.key" class="flex items-center justify-between gap-2 py-2">
          <span class="min-w-0"><span class="block truncate font-medium">{{ r.merchant }}</span><span class="text-xs text-zinc-500">{{ r.frequency === 'monthly' ? 'Mensal' : r.frequency === 'weekly' ? 'Semanal' : 'Anual' }} · {{ r.occurrences }}× · confiança {{ Math.round(r.confidence * 100) }}%{{ r.active ? '' : ' · possivelmente interrompida' }}</span></span>
          <span class="text-right tabular-nums">{{ formatBRL(r.monthlyEstimateCents) }}/mês<br /><span class="text-xs text-zinc-500">{{ formatBRL(r.annualEstimateCents) }}/ano</span></span>
        </li>
      </ul>
    </section>

    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      <button v-for="[t, l] in TYPES" :key="t" class="chip min-h-9 shrink-0" :class="type === t ? '!bg-emerald-600 text-white' : ''" @click="type = t">{{ l }}</button>
    </div>
    <EmptyState v-if="!list.length" title="Nenhum insight para este filtro" description="Não geramos insights quando os dados são insuficientes." compact />
    <div class="grid gap-3 md:grid-cols-2"><InsightCard v-for="i in list" :key="i.id" :insight="i" @open="openTx" /></div>
  </div>
</template>
