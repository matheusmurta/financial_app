<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from '@lucide/vue'
import { useFinanceStore } from '@/stores/finance'
import { emptyFilters } from '@/modules/transactions/filters'
import { parseBRLToCents } from '@/utils/money'
import { uid } from '@/utils/text'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const store = useFinanceStore()
const minText = ref(''), maxText = ref('')
watch([minText, maxText], () => {
  store.filters = { ...store.filters, minCents: minText.value ? parseBRLToCents(minText.value) : null, maxCents: maxText.value ? parseBRLToCents(maxText.value) : null }
})
function toggle(key: 'accountIds' | 'categoryIds' | 'importIds', id: string) {
  const cur = store.filters[key]
  store.filters = { ...store.filters, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
}
function clear() { store.filters = emptyFilters(); minText.value = ''; maxText.value = '' }
function saveFavorite() {
  const name = prompt('Nome do filtro favorito:')
  if (name) store.upsert('savedFilters', { id: uid('flt'), name, filters: { ...store.filters } })
}
const on = '!bg-emerald-600 text-white'
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end bg-black/40" @click.self="emit('close')">
      <div class="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-5 dark:bg-zinc-900" role="dialog" aria-label="Filtros">
        <div class="flex items-center justify-between"><h2 class="text-lg font-semibold">Filtros</h2><button class="grid h-10 w-10 place-items-center" aria-label="Fechar" @click="emit('close')"><X /></button></div>
        <div class="grid grid-cols-2 gap-2">
          <label><span class="label">De</span><input v-model="store.filters.dateFrom" type="date" class="input" /></label>
          <label><span class="label">Até</span><input v-model="store.filters.dateTo" type="date" class="input" /></label>
        </div>
        <label class="block"><span class="label">Descrição</span><input v-model="store.filters.search" class="input" placeholder="Buscar…" /></label>
        <div class="grid grid-cols-2 gap-2">
          <label><span class="label">Valor mínimo (R$)</span><input v-model="minText" class="input" inputmode="decimal" /></label>
          <label><span class="label">Valor máximo (R$)</span><input v-model="maxText" class="input" inputmode="decimal" /></label>
        </div>
        <div><span class="label">Contas e cartões</span><div class="flex flex-wrap gap-2">
          <button v-for="a in store.data.accounts" :key="a.id" class="chip" :class="store.filters.accountIds.includes(a.id) ? on : ''" @click="toggle('accountIds', a.id)">{{ a.name }}</button>
        </div></div>
        <div><span class="label">Arquivos importados</span><div class="flex flex-wrap gap-2">
          <button v-for="i in store.data.imports" :key="i.id" class="chip" :class="store.filters.importIds.includes(i.id) ? on : ''" @click="toggle('importIds', i.id)">{{ i.name }}</button>
        </div></div>
        <div><span class="label">Categorias</span><div class="flex flex-wrap gap-2">
          <button v-for="c in store.data.categories" :key="c.id" class="chip" :class="store.filters.categoryIds.includes(c.id) ? on : ''" @click="toggle('categoryIds', c.id)">{{ c.name }}</button>
        </div></div>
        <div class="grid grid-cols-2 gap-2">
          <label><span class="label">Direção</span><select v-model="store.filters.direction" class="input"><option :value="null">Todas</option><option value="credit">Entradas</option><option value="debit">Saídas</option></select></label>
          <label><span class="label">Essencialidade</span><select v-model="store.filters.essentiality" class="input"><option :value="null">Todas</option><option value="essential">Essenciais</option><option value="optional">Não essenciais</option></select></label>
          <label><span class="label">Recorrência</span><select v-model="store.filters.recurring" class="input"><option :value="null">Todas</option><option :value="true">Recorrentes</option><option :value="false">Não recorrentes</option></select></label>
          <label><span class="label">Parcelamento</span><select v-model="store.filters.installment" class="input"><option :value="null">Todas</option><option :value="true">Parceladas</option><option :value="false">À vista</option></select></label>
        </div>
        <label class="flex items-center gap-2 text-sm"><input v-model="store.filters.onlyUncategorized" type="checkbox" class="h-5 w-5" />Somente pendentes de classificação</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="store.filters.onlyDuplicates" type="checkbox" class="h-5 w-5" />Somente possíveis duplicidades</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="store.filters.includeExcluded" type="checkbox" class="h-5 w-5" />Incluir movimentações ignoradas</label>
        <div v-if="store.data.savedFilters.length"><span class="label">Favoritos</span><div class="flex flex-wrap gap-2">
          <span v-for="s in store.data.savedFilters" :key="s.id" class="chip"><button @click="store.filters = { ...s.filters }">{{ s.name }}</button><button aria-label="Remover favorito" @click="store.remove('savedFilters', s.id)"><X class="h-3 w-3" /></button></span>
        </div></div>
        <div class="flex gap-2"><button class="btn-ghost flex-1" @click="saveFavorite">Salvar favorito</button><button class="btn-ghost flex-1" @click="clear">Limpar</button></div>
        <button class="btn-primary w-full" @click="emit('close')">Ver resultados</button>
      </div>
    </div>
  </Teleport>
</template>
