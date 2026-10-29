<script setup lang="ts">
import { computed } from 'vue'
import type { PendingFile } from '@/composables/useImportWizard'
import { useFinanceStore } from '@/stores/finance'
import { formatBRL } from '@/utils/money'
import { formatDate } from '@/utils/date'

const props = defineProps<{ f: PendingFile }>()
const emit = defineEmits<{ reparse: []; remove: [] }>()
const store = useFinanceStore()
const r = computed(() => props.f.result)
const credits = computed(() => r.value.rows.filter((x) => x.amountInCents > 0).reduce((a, x) => a + x.amountInCents, 0))
const debits = computed(() => r.value.rows.filter((x) => x.amountInCents < 0).reduce((a, x) => a - x.amountInCents, 0))
const accounts = computed(() => store.data.accounts.filter((a) => a.type === (r.value.format === 'checking' ? 'checking' : 'credit')))
</script>

<template>
  <div class="card space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><p class="truncate font-medium">{{ f.file.name }}</p>
        <p class="text-xs" :class="r.format === 'unknown' ? 'neg' : 'text-emerald-600'">
          {{ r.format === 'credit_card' ? 'Fatura de cartão' : r.format === 'checking' ? 'Extrato de conta corrente' : 'Formato não reconhecido' }} · {{ r.encoding }} · separador "{{ r.delimiter === '\t' ? 'tab' : r.delimiter }}"
        </p></div>
      <button class="text-xs text-rose-600" @click="emit('remove')">Remover</button>
    </div>

    <div class="grid gap-2 md:grid-cols-2">
      <label><span class="label">Nome do histórico</span><input v-model="f.name" class="input" /></label>
      <label><span class="label">{{ r.format === 'checking' ? 'Conta' : 'Cartão' }}</span>
        <select v-model="f.accountId" class="input" @change="emit('reparse')">
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option><option value="__new">+ Criar novo</option>
        </select></label>
      <template v-if="f.accountId === '__new'">
        <label><span class="label">Nome da nova conta/cartão</span><input v-model="f.newAccountName" class="input" /></label>
        <label><span class="label">Banco / instituição</span><input v-model="f.institution" class="input" /></label>
      </template>
      <label><span class="label">Encoding</span><select v-model="f.encoding" class="input" @change="emit('reparse')"><option :value="undefined">Automático</option><option value="utf-8">UTF-8</option><option value="windows-1252">Windows-1252</option></select></label>
      <label><span class="label">Separador</span><select v-model="f.delimiter" class="input" @change="emit('reparse')"><option :value="undefined">Automático</option><option value=";">;</option><option value=",">,</option><option :value="'\t'">Tab</option></select></label>
    </div>

    <div v-if="r.format !== 'unknown'" class="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
      <div><p class="label">Registros</p>{{ r.totalRows }}</div>
      <div><p class="label">Válidos / inválidos</p><span class="pos">{{ r.rows.length }}</span> / <span :class="r.errors.length ? 'neg' : ''">{{ r.errors.filter((e) => e.line > 0).length }}</span></div>
      <div><p class="label">Créditos</p>{{ formatBRL(credits) }}</div>
      <div><p class="label">Débitos</p>{{ formatBRL(debits) }}</div>
      <div class="col-span-2"><p class="label">Período</p>{{ r.periodStart ? `${formatDate(r.periodStart)} a ${formatDate(r.periodEnd!)}` : '—' }}</div>
      <div class="col-span-2"><p class="label">Possíveis duplicidades</p>{{ f.dup.duplicateLines.size }}</div>
    </div>
    <p v-if="f.dup.sameFile" class="rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Este arquivo já foi importado como "{{ f.dup.sameFile.name }}".</p>
    <p v-if="f.dup.overlapping.length" class="rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Período sobreposto a: {{ f.dup.overlapping.map((i) => i.name).join(', ') }}.</p>
    <label v-if="f.dup.duplicateLines.size" class="flex items-center gap-2 text-sm"><input v-model="f.skipDuplicates" type="checkbox" class="h-5 w-5" />Não importar as {{ f.dup.duplicateLines.size }} linhas já existentes</label>
    <ul v-if="r.warnings.length" class="list-disc pl-5 text-xs text-amber-700 dark:text-amber-300"><li v-for="w in r.warnings" :key="w">{{ w }}</li></ul>
    <details v-if="r.errors.length" class="text-xs"><summary class="neg cursor-pointer">{{ r.errors.length }} erro(s) — linhas não serão importadas</summary>
      <ul class="mt-1 space-y-1"><li v-for="e in r.errors" :key="e.line + e.message"><b>Linha {{ e.line || '—' }}:</b> {{ e.message }}</li></ul></details>
    <details v-if="r.rows.length" class="text-xs"><summary class="cursor-pointer">Amostra ({{ Math.min(10, r.rows.length) }} de {{ r.rows.length }})</summary>
      <ul class="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800"><li v-for="x in r.rows.slice(0, 10)" :key="x.line" class="flex justify-between gap-2 py-1">
        <span class="truncate">{{ formatDate(x.normalizedDate) }} · {{ x.merchantName }} · {{ store.categoryById.get(x.categoryId)?.name }}</span><span class="tabular-nums">{{ formatBRL(x.amountInCents) }}</span></li></ul></details>
  </div>
</template>
