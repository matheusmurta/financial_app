<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import type { CategorizationRule } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import { uid } from '@/utils/text'

const store = useFinanceStore()
const form = ref({ pattern: '', categoryId: 'outros', matchType: 'contains' as CategorizationRule['matchType'] })
const msg = ref('')
const sorted = computed(() => [...store.data.rules].sort((a, b) => b.priority - a.priority))
function add() {
  if (!form.value.pattern.trim()) return
  store.upsert('rules', { id: uid('rule'), ...form.value, pattern: form.value.pattern.trim(), merchantName: null, priority: 1000, enabled: true })
  form.value.pattern = ''
}
const set = (r: CategorizationRule, p: Partial<CategorizationRule>) => store.upsert('rules', { ...r, ...p })
function reapply() { if (store.reapplyRules()) msg.value = 'Regras reaplicadas (transações editadas manualmente foram preservadas).' }
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2"><h1 class="h1">Regras de categorização</h1><button class="btn-ghost" @click="reapply">Reaplicar regras</button></div>
    <p v-if="msg" class="pos text-sm">{{ msg }}</p>
    <p class="muted text-xs">A regra de maior prioridade que casar com a descrição vence. Correções manuais sempre têm precedência.</p>
    <form class="card grid gap-2 md:grid-cols-4" @submit.prevent="add">
      <input v-model="form.pattern" class="input" placeholder="Texto (ex.: UBER)" aria-label="Padrão" />
      <select v-model="form.matchType" class="input" aria-label="Tipo"><option value="contains">Contém</option><option value="startsWith">Começa com</option><option value="exact">Exato</option><option value="regex">Regex</option></select>
      <select v-model="form.categoryId" class="input" aria-label="Categoria"><option v-for="c in store.data.categories" :key="c.id" :value="c.id">{{ c.name }}</option></select>
      <button class="btn-primary">Criar regra</button>
    </form>
    <div class="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
      <div v-for="r in sorted" :key="r.id" class="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
        <input type="checkbox" :checked="r.enabled" class="h-5 w-5" aria-label="Ativa" @change="set(r, { enabled: !r.enabled })" />
        <input :value="r.pattern" class="input min-w-0 flex-1" aria-label="Padrão" @change="set(r, { pattern: ($event.target as HTMLInputElement).value })" />
        <select :value="r.categoryId" class="input w-44" aria-label="Categoria" @change="set(r, { categoryId: ($event.target as HTMLSelectElement).value })"><option v-for="c in store.data.categories" :key="c.id" :value="c.id">{{ c.name }}</option></select>
        <input :value="r.priority" type="number" class="input w-24" aria-label="Prioridade" @change="set(r, { priority: Number(($event.target as HTMLInputElement).value) })" />
        <button class="grid h-10 w-10 place-items-center text-rose-600" aria-label="Remover" @click="store.remove('rules', r.id)"><Trash2 class="h-4 w-4" /></button>
      </div>
    </div>
  </div>
</template>
