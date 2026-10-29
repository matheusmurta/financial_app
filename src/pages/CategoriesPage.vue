<script setup lang="ts">
import { ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import type { Category } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { uid } from '@/utils/text'

const store = useFinanceStore()
const name = ref('')
const deleting = ref<string | null>(null)
function add() {
  if (!name.value.trim()) return
  store.upsert('categories', { id: uid('cat'), name: name.value.trim(), icon: 'Shapes', color: '#14b8a6', parentId: null, essentiality: 'optional', custom: true })
  name.value = ''
}
const set = (c: Category, p: Partial<Category>) => store.upsert('categories', { ...c, ...p })
const count = (id: string) => store.data.transactions.filter((t) => t.categoryId === id).length
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Categorias</h1>
    <form class="card flex gap-2" @submit.prevent="add"><input v-model="name" class="input" placeholder="Nova categoria" aria-label="Nova categoria" /><button class="btn-primary">Criar</button></form>
    <div class="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
      <div v-for="c in store.data.categories" :key="c.id" class="flex flex-wrap items-center gap-2 px-3 py-2">
        <input type="color" :value="c.color" class="h-8 w-8 rounded" aria-label="Cor" @change="set(c, { color: ($event.target as HTMLInputElement).value })" />
        <input :value="c.name" class="input min-w-0 flex-1" aria-label="Nome" @change="set(c, { name: ($event.target as HTMLInputElement).value })" />
        <select :value="c.essentiality" class="input w-36" aria-label="Essencialidade" @change="set(c, { essentiality: ($event.target as HTMLSelectElement).value as Category['essentiality'] })">
          <option value="essential">Essencial</option><option value="optional">Não essencial</option><option value="neutral">Neutra</option>
        </select>
        <span class="muted w-12 text-right text-xs">{{ count(c.id) }}</span>
        <button v-if="c.id !== 'nao_classificado'" class="grid h-10 w-10 place-items-center text-rose-600" aria-label="Excluir" @click="deleting = c.id"><Trash2 class="h-4 w-4" /></button>
      </div>
    </div>
    <ConfirmDialog :open="!!deleting" danger title="Excluir categoria?" message="As transações dela irão para 'Não classificado'; regras e orçamentos ligados a ela serão removidos." confirm-label="Excluir" @confirm="deleting && store.remove('categories', deleting); deleting = null" @cancel="deleting = null" />
  </div>
</template>
