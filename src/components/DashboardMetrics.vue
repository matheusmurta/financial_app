<script setup lang="ts">
import { computed } from 'vue'
import { useAnalytics } from '@/composables/useAnalytics'
import MetricCard from '@/components/MetricCard.vue'
import { formatPercent } from '@/utils/money'
import { formatDate } from '@/utils/date'

const a = useAnalytics()
const s = computed(() => a.summary.value)
const v = computed(() => a.variation.value)
const recurringMonthly = computed(() => a.recurrences.value.filter((r) => r.active).reduce((x, r) => x + r.monthlyEstimateCents, 0))
const futureCents = computed(() => a.installments.value.items.reduce((x, i) => x + i.remainingCents, 0))
const bal = computed(() => a.knownBalance.value)
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <MetricCard label="Receitas" :cents="s.incomeCents" :variation="v.income" tone="pos" hint="Créditos bancários, exceto transferências, estornos e resgates." />
    <MetricCard label="Despesas" :cents="s.expenseCents" :variation="v.expense" invert tone="neg" hint="Estornos reduzem o total. Pagamentos de fatura não entram na visão de consumo." />
    <MetricCard label="Resultado" :cents="s.netCents" :variation="v.net" :tone="s.netCents >= 0 ? 'pos' : 'neg'" hint="Receitas − Despesas." />
    <MetricCard label="Taxa de poupança" :text="s.savingsRate == null ? 'Sem receitas' : formatPercent(s.savingsRate).replace('+', '')" estimated hint="Resultado ÷ Receitas. Apenas contas importadas." />
    <MetricCard label="Consumo no cartão" :cents="s.cardSpendCents" :variation="v.card" invert hint="Compras − estornos nos cartões." />
    <MetricCard label="Saídas bancárias" :cents="s.bankOutflowCents" hint="Todo débito da conta corrente, incluindo faturas e transferências." />
    <MetricCard label="Saldo conhecido" :cents="bal?.cents ?? null" :hint="bal ? `Último saldo do extrato em ${formatDate(bal.date)}. Não é o saldo atual.` : 'Nenhum extrato com coluna de saldo.'" />
    <MetricCard label="Recorrentes / mês" :cents="recurringMonthly" estimated hint="Cobranças com intervalo regular e valores semelhantes." />
    <MetricCard label="Parcelas futuras" :cents="futureCents" hint="Somente parcelas identificadas no CSV (ex.: 02/10)." />
    <MetricCard label="Tarifas e juros" :cents="s.feesCents" hint="Tarifas, IOF, anuidade ou juros identificados." />
  </div>
</template>
