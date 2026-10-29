<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { compare } from '@/modules/comparison/compare'
import ComparisonResult from '@/components/ComparisonResult.vue'
import EmptyState from '@/components/EmptyState.vue'
import { monthRange, prevMonthKey, formatDate } from '@/utils/date'

const store = useFinanceStore()
const last = store.data.transactions.reduce((m, t) => (t.normalizedDate > m ? t.normalizedDate : m), '').slice(0, 7) || '2026-01'
const [bf, bt] = monthRange(last)
const [af, at] = monthRange(prevMonthKey(last))
const aFrom = ref(af), aTo = ref(at), bFrom = ref(bf), bTo = ref(bt)
const accA = ref(''), accB = ref(''), cat = ref('')

const pick = (from: string, to: string, acc: string) => store.data.transactions.filter((t) =>
  t.normalizedDate >= from && t.normalizedDate <= to && (!acc || t.accountId === acc) && (!cat.value || t.categoryId === cat.value))
const valid = computed(() => !!(aFrom.value && aTo.value && bFrom.value && bTo.value) && aFrom.value <= aTo.value && bFrom.value <= bTo.value)
const c = computed(() => valid.value ? compare(pick(aFrom.value, aTo.value, accA.value), pick(bFrom.value, bTo.value, accB.value),
  [aFrom.value, aTo.value], [bFrom.value, bTo.value], store.data.settings.viewMode, store.cardIds, store.data.categories) : null)
</script>

<template>
  <EmptyState v-if="!store.data.transactions.length" title="Importe dados para comparar" action-to="/importar" action-label="Importar" />
  <div v-else class="space-y-5">
    <h1 class="h1">Comparar períodos</h1>
    <div class="grid gap-3 md:grid-cols-2">
      <div class="card space-y-2"><p class="font-medium text-zinc-500">Período A</p>
        <div class="grid grid-cols-2 gap-2"><input v-model="aFrom" type="date" class="input" aria-label="Início A" /><input v-model="aTo" type="date" class="input" aria-label="Fim A" /></div>
        <select v-model="accA" class="input"><option value="">Todas as contas</option><option v-for="x in store.data.accounts" :key="x.id" :value="x.id">{{ x.name }}</option></select></div>
      <div class="card space-y-2"><p class="font-medium text-violet-600">Período B</p>
        <div class="grid grid-cols-2 gap-2"><input v-model="bFrom" type="date" class="input" aria-label="Início B" /><input v-model="bTo" type="date" class="input" aria-label="Fim B" /></div>
        <select v-model="accB" class="input"><option value="">Todas as contas</option><option v-for="x in store.data.accounts" :key="x.id" :value="x.id">{{ x.name }}</option></select></div>
    </div>
    <select v-model="cat" class="input md:w-72" aria-label="Categoria"><option value="">Todas as categorias</option><option v-for="x in store.data.categories" :key="x.id" :value="x.id">{{ x.name }}</option></select>
    <p v-if="!valid" class="neg text-sm">Datas inválidas.</p>
    <ComparisonResult v-if="c" :c="c" :la="`A (${formatDate(aFrom)}–${formatDate(aTo)})`" :lb="`B (${formatDate(bFrom)}–${formatDate(bTo)})`" />
  </div>
</template>
