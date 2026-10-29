import type { EChartsOption } from 'echarts'
import { formatMonth } from '@/utils/date'
import type { MonthRow } from '@/modules/analytics/engine'
import { money, axisMoney, grid } from './options'

export function comparisonChart(rows: { label: string; a: number; b: number }[], la: string, lb: string): EChartsOption | null {
  const top = rows.slice(0, 10)
  if (!top.length) return null
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, legend: { top: 0 }, grid,
    xAxis: { type: 'category', data: top.map((r) => r.label), axisLabel: { rotate: 30, interval: 0 } }, yAxis: axisMoney,
    series: [
      { name: la, type: 'bar', data: top.map((r) => r.a), itemStyle: { color: '#94a3b8' } },
      { name: lb, type: 'bar', data: top.map((r) => r.b), itemStyle: { color: '#8b5cf6' } },
    ],
  }
}

export function projectionChart(hist: MonthRow[], future: { month: string; cents: number; low: number; high: number }[]): EChartsOption {
  const months = [...hist.map((h) => h.month), ...future.map((f) => f.month)].map(formatMonth)
  const pad = hist.map(() => null)
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : money(v)) }, legend: { top: 0, data: ['Observado', 'Projeção', 'Faixa de incerteza'] }, grid,
    xAxis: { type: 'category', data: months }, yAxis: axisMoney,
    series: [
      { name: 'Observado', type: 'line', data: hist.map((h) => h.expenseCents), itemStyle: { color: '#f43f5e' } },
      { name: 'Mínimo', type: 'line', stack: 'band', data: [...pad, ...future.map((f) => f.low)], lineStyle: { opacity: 0 }, symbol: 'none', tooltip: { show: false } },
      { name: 'Faixa de incerteza', type: 'line', stack: 'band', data: [...pad, ...future.map((f) => f.high - f.low)], lineStyle: { opacity: 0 }, areaStyle: { color: '#8b5cf633' }, symbol: 'none', itemStyle: { color: '#8b5cf6' } },
      { name: 'Projeção', type: 'line', data: [...pad.slice(1), hist.at(-1)!.expenseCents, ...future.map((f) => f.cents)], lineStyle: { type: 'dashed' }, itemStyle: { color: '#8b5cf6' } },
    ],
  }
}

export function budgetChart(rows: { label: string; limit: number; spent: number }[]): EChartsOption | null {
  if (!rows.length) return null
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, legend: { top: 0 }, grid,
    xAxis: { type: 'category', data: rows.map((r) => r.label) }, yAxis: axisMoney,
    series: [
      { name: 'Limite', type: 'bar', data: rows.map((r) => r.limit), itemStyle: { color: '#cbd5e1' } },
      { name: 'Realizado', type: 'bar', data: rows.map((r) => ({ value: r.spent, itemStyle: { color: r.spent > r.limit ? '#f43f5e' : '#10b981' } })) },
    ],
  }
}

export function commitmentsChart(byMonth: [string, number][]): EChartsOption | null {
  if (!byMonth.length) return null
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, grid: { ...grid, top: 8 },
    xAxis: { type: 'category', data: byMonth.map(([m]) => formatMonth(m)) }, yAxis: axisMoney,
    series: [{ type: 'bar', data: byMonth.map(([, v]) => v), itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] } }],
  }
}
