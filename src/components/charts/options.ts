import type { EChartsOption } from 'echarts'
import { formatBRL, formatBRLCompact } from '@/utils/money'
import { formatMonth, WEEKDAYS, weekday } from '@/utils/date'
import type { MonthRow, Group } from '@/modules/analytics/engine'
import type { Transaction } from '@/types'

export const money = (v: unknown) => formatBRL(Math.round(Number(v)))
export const axisMoney = { type: 'value' as const, axisLabel: { formatter: (v: number) => formatBRLCompact(v) } }
export const grid = { left: 8, right: 8, top: 36, bottom: 8, containLabel: true }

export function incomeExpenseChart(m: MonthRow[]): EChartsOption | null {
  if (!m.length) return null
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, legend: { top: 0 }, grid,
    xAxis: { type: 'category', data: m.map((x) => formatMonth(x.month)) }, yAxis: axisMoney,
    series: [
      { name: 'Receitas', type: 'bar', data: m.map((x) => x.incomeCents), itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] } },
      { name: 'Despesas', type: 'bar', data: m.map((x) => x.expenseCents), itemStyle: { color: '#f43f5e', borderRadius: [6, 6, 0, 0] } },
      { name: 'Resultado', type: 'line', smooth: true, data: m.map((x) => x.netCents), itemStyle: { color: '#8b5cf6' } },
    ],
  }
}

export function donutChart(groups: Group[], colors: Map<string, string>): EChartsOption | null {
  if (!groups.length) return null
  const top = groups.slice(0, 8), rest = groups.slice(8).reduce((a, g) => a + g.cents, 0)
  const data = top.map((g) => ({ name: g.label, value: g.cents, itemStyle: { color: colors.get(g.key) } }))
  if (rest > 0) data.push({ name: 'Demais', value: rest, itemStyle: { color: '#a1a1aa' } })
  return {
    tooltip: { trigger: 'item', valueFormatter: money }, legend: { type: 'scroll', bottom: 0 },
    series: [{ type: 'pie', radius: ['50%', '75%'], center: ['50%', '45%'], data: data.filter((d) => d.value > 0), label: { show: false }, itemStyle: { borderRadius: 6 } }],
  }
}

export function horizontalBars(groups: Group[], color = '#0ea5e9'): EChartsOption | null {
  const top = groups.slice(0, 10).reverse()
  if (!top.length) return null
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, grid: { ...grid, top: 8 },
    xAxis: axisMoney, yAxis: { type: 'category', data: top.map((g) => (g.label.length > 18 ? g.label.slice(0, 17) + '…' : g.label)) },
    series: [{ type: 'bar', data: top.map((g) => g.cents), itemStyle: { color, borderRadius: [0, 6, 6, 0] } }],
  }
}

export function weekdayChart(txs: Transaction[], isExp: (t: Transaction) => boolean): EChartsOption | null {
  const sums = Array(7).fill(0)
  let any = false
  for (const t of txs) if (isExp(t)) { sums[weekday(t.normalizedDate)] -= t.amountInCents; any = true }
  if (!any) return null
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, grid: { ...grid, top: 8 },
    xAxis: { type: 'category', data: WEEKDAYS }, yAxis: axisMoney,
    series: [{ type: 'bar', data: sums, itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] } }],
  }
}

export function balanceChart(txs: Transaction[]): EChartsOption | null {
  const pts = txs.filter((t) => t.balanceAfterInCents != null).sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate))
  if (pts.length < 2) return null
  const byDay = new Map<string, number>()
  for (const t of pts) byDay.set(t.normalizedDate, t.balanceAfterInCents!)
  return {
    tooltip: { trigger: 'axis', valueFormatter: money }, grid: { ...grid, top: 8 },
    xAxis: { type: 'time' }, yAxis: axisMoney,
    series: [{ type: 'line', step: 'end', showSymbol: false, areaStyle: { opacity: 0.12 }, data: [...byDay.entries()], itemStyle: { color: '#0ea5e9' } }],
  }
}
