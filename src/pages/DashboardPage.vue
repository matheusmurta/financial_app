<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'
import { isExpense } from '@/modules/analytics/engine'
import DashboardMetrics from '@/components/DashboardMetrics.vue'
import ChartContainer from '@/components/ChartContainer.vue'
import InsightCard from '@/components/InsightCard.vue'
import TransactionList from '@/components/TransactionList.vue'
import FilterBar from '@/components/FilterBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { incomeExpenseChart, donutChart, horizontalBars, weekdayChart, balanceChart } from '@/components/charts/options'
import { formatDate } from '@/utils/date'

const a = useAnalytics()
const { store } = a
const router = useRouter()
const colors = computed(() => new Map(store.data.categories.map((c) => [c.id, c.color])))
const s = computed(() => a.summary.value)
const recent = computed(() => [...a.txs.value].sort((x, y) => y.normalizedDate.localeCompare(x.normalizedDate)).slice(0, 8))
const openTx = (ids: string[]) => router.push({ path: '/transacoes', query: { ids: ids.slice(0, 200).join(',') } })
const modeLabel = computed(() => (a.mode.value === 'cash'
  ? 'Visão de caixa: só conta corrente; pagamento de fatura é saída e compras no cartão não entram.'
  : 'Visão de consumo: compras no cartão + débitos de consumo; faturas e transferências excluídas para evitar dupla contagem.'))
</script>

<template>
  <EmptyState v-if="!store.data.transactions.length" title="Nenhum extrato importado" description="Importe CSVs do cartão ou da conta corrente para ver suas análises." action-to="/importar" action-label="Importar extratos" />
  <div v-else class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><h1 class="h1">Visão geral</h1><p class="muted text-xs">{{ s.firstDate ? `${formatDate(s.firstDate)} a ${formatDate(s.lastDate!)}` : 'Sem dados no filtro' }} · {{ s.count }} transações</p></div>
      <div class="flex rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-800" role="group" aria-label="Perspectiva">
        <button class="rounded-lg px-3 py-1.5" :class="a.mode.value === 'consumption' ? 'bg-white shadow dark:bg-zinc-900' : ''" @click="store.setSettings({ viewMode: 'consumption' })">Consumo</button>
        <button class="rounded-lg px-3 py-1.5" :class="a.mode.value === 'cash' ? 'bg-white shadow dark:bg-zinc-900' : ''" @click="store.setSettings({ viewMode: 'cash' })">Caixa</button>
      </div>
    </div>
    <FilterBar />
    <p class="muted text-xs">{{ modeLabel }}</p>
    <DashboardMetrics />
    <p v-if="a.previous.value" class="muted text-xs">Variações vs. {{ formatDate(a.previous.value.range[0]) }}–{{ formatDate(a.previous.value.range[1]) }} (mesma duração).</p>

    <div class="grid gap-4 lg:grid-cols-2">
      <ChartContainer title="Receitas e despesas por mês" subtitle="Meses sem arquivos não aparecem (não viram zero)" :option="incomeExpenseChart(a.months.value)" explanation="Barras: receitas e despesas efetivas do mês; linha: resultado." />
      <ChartContainer title="Distribuição dos gastos" subtitle="Por categoria" :option="donutChart(a.categories.value, colors)" explanation="Participação de cada categoria nas despesas do período." />
      <ChartContainer title="Onde você mais gastou" subtitle="Top 10 estabelecimentos" :option="horizontalBars(a.merchants.value)" explanation="Soma das despesas por estabelecimento normalizado." />
      <ChartContainer title="Gastos por dia da semana" :option="weekdayChart(a.txs.value, (t) => isExpense(t, a.mode.value, store.cardIds))" explanation="Soma das despesas pelo dia da semana." />
      <ChartContainer title="Saldo bancário" subtitle="Saldos informados nos extratos" :option="balanceChart(a.txs.value)" explanation="Somente saldos presentes no arquivo; dias sem lançamento não são estimados." />
    </div>

    <section v-if="a.insights.value.length">
      <div class="mb-2 flex items-center justify-between"><h2 class="font-semibold">Principais insights</h2><RouterLink to="/insights" class="text-sm text-emerald-700 dark:text-emerald-400">Ver todos</RouterLink></div>
      <div class="grid gap-3 md:grid-cols-2"><InsightCard v-for="i in a.insights.value.slice(0, 4)" :key="i.id" :insight="i" @open="openTx" /></div>
    </section>

    <section class="card">
      <div class="mb-1 flex items-center justify-between"><h2 class="font-semibold">Últimas transações</h2><RouterLink to="/transacoes" class="text-sm text-emerald-700 dark:text-emerald-400">Ver todas</RouterLink></div>
      <TransactionList :items="recent" @select="(t) => router.push({ path: '/transacoes', query: { ids: t.id } })" />
    </section>
  </div>
</template>
