<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, TreemapChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, CalendarComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { Download, Info } from '@lucide/vue'
import EmptyState from './EmptyState.vue'

use([CanvasRenderer, LineChart, BarChart, PieChart, TreemapChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, CalendarComponent, MarkLineComponent])

const props = defineProps<{ title: string; subtitle?: string; option: EChartsOption | null; explanation?: string; height?: string; empty?: boolean }>()
const chart = ref<InstanceType<typeof VChart> | null>(null)
const showInfo = ref(false)
const dark = computed(() => document.documentElement.classList.contains('dark'))

function exportPng() {
  const url = chart.value?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: dark.value ? '#18181b' : '#fff' })
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title.replace(/\s+/g, '-').toLowerCase()}.png`
  a.click()
}
</script>

<template>
  <section class="card">
    <header class="mb-3 flex items-start justify-between gap-2">
      <div>
        <h3 class="font-semibold">{{ title }}</h3>
        <p v-if="subtitle" class="muted text-xs">{{ subtitle }}</p>
      </div>
      <div class="flex gap-1">
        <button v-if="explanation" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Como é calculado" @click="showInfo = !showInfo"><Info class="h-4 w-4" /></button>
        <button v-if="option && !empty" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Exportar PNG" @click="exportPng"><Download class="h-4 w-4" /></button>
      </div>
    </header>
    <p v-if="showInfo" class="mb-3 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{{ explanation }}</p>
    <EmptyState v-if="!option || empty" title="Sem dados suficientes" description="Importe extratos ou ajuste os filtros para ver este gráfico." compact />
    <VChart v-else ref="chart" :option="option" autoresize :theme="dark ? 'dark' : undefined" :style="{ height: height ?? '280px', background: 'transparent' }" />
  </section>
</template>
