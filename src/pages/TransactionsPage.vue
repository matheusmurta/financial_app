<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, Search } from '@lucide/vue'
import type { Transaction } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import FilterBar from '@/components/FilterBar.vue'
import TransactionList from '@/components/TransactionList.vue'
import TransactionEditor from '@/components/TransactionEditor.vue'
import EmptyState from '@/components/EmptyState.vue'
import { toCSV, download } from '@/services/export/export'
import { formatBRL, sumCents } from '@/utils/money'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const editingId = ref<string | null>(null)
const editing = computed(() => store.data.transactions.find((t) => t.id === editingId.value) ?? null)
/** ?ids= abre o subconjunto que fundamenta um insight. */
const idSet = computed(() => (route.query.ids ? new Set(String(route.query.ids).split(',')) : null))
const items = computed(() => (idSet.value ? store.data.transactions.filter((t) => idSet.value!.has(t.id)) : store.filtered))
const total = computed(() => sumCents(items.value.filter((t) => !t.isExcluded).map((t) => t.amountInCents)))
const pending = computed(() => store.data.transactions.filter((t) => t.categoryId === 'nao_classificado' && !t.isExcluded).length)
function select(t: Transaction) { editingId.value = t.id }
function exportCsv() { download(toCSV(items.value, store.categoryById, store.accountById), 'transacoes.csv', 'text/csv;charset=utf-8') }
function exportJson() { download(JSON.stringify(items.value, null, 2), 'transacoes.json', 'application/json') }
</script>

<template>
  <EmptyState v-if="!store.data.transactions.length" title="Sem transações" description="Importe um extrato para começar." action-to="/importar" action-label="Importar" />
  <div v-else class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="h1">Transações</h1>
      <div class="flex gap-2">
        <button class="btn-ghost" @click="exportCsv"><Download class="h-4 w-4" />CSV</button>
        <button class="btn-ghost" @click="exportJson">JSON</button>
      </div>
    </div>
    <div v-if="idSet" class="card flex items-center justify-between text-sm">
      Exibindo {{ items.length }} transações selecionadas. <button class="font-medium text-emerald-700" @click="router.replace({ query: {} })">Ver todas</button>
    </div>
    <template v-else>
      <label class="relative block"><Search class="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" /><input v-model="store.filters.search" class="input pl-9" placeholder="Buscar por descrição ou estabelecimento" aria-label="Buscar" /></label>
      <FilterBar />
      <button v-if="pending" class="chip" @click="store.filters = { ...store.filters, onlyUncategorized: !store.filters.onlyUncategorized }">{{ pending }} pendentes de classificação</button>
    </template>
    <p class="muted text-xs">{{ items.length }} transações · soma líquida {{ formatBRL(total) }} (entradas − saídas, sem as ignoradas)</p>
    <div class="card"><EmptyState v-if="!items.length" title="Nada encontrado" description="Ajuste os filtros." compact /><TransactionList v-else :items="items" @select="select" /></div>
    <TransactionEditor :tx="editing" @close="editingId = null" />
  </div>
</template>
