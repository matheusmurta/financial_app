<script setup lang="ts">
import { ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import type { FinancialAccount } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { summarize } from '@/modules/analytics/engine'
import { formatBRL } from '@/utils/money'
import { uid } from '@/utils/text'

const store = useFinanceStore()
const form = ref({ name: '', institution: '', type: 'checking' as FinancialAccount['type'], color: '#0ea5e9' })
const deleting = ref<string | null>(null)
function add() {
  if (!form.value.name.trim()) return
  store.upsert('accounts', { id: uid('acc'), ...form.value, name: form.value.name.trim(), isActive: true, createdAt: new Date().toISOString() })
  form.value.name = ''; form.value.institution = ''
}
const stats = (id: string) => summarize(store.data.transactions.filter((t) => t.accountId === id), 'consumption', store.cardIds)
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Contas e cartões</h1>
    <form class="card grid gap-2 md:grid-cols-5" @submit.prevent="add">
      <input v-model="form.name" class="input md:col-span-2" placeholder="Nome (ex.: Nubank Roxinho)" aria-label="Nome" />
      <input v-model="form.institution" class="input" placeholder="Instituição" aria-label="Instituição" />
      <select v-model="form.type" class="input" aria-label="Tipo"><option value="checking">Conta corrente</option><option value="credit">Cartão de crédito</option></select>
      <button class="btn-primary">Adicionar</button>
    </form>
    <div class="grid gap-3 md:grid-cols-2">
      <div v-for="a in store.data.accounts" :key="a.id" class="card space-y-2">
        <div class="flex items-center gap-2">
          <input type="color" :value="a.color" class="h-8 w-8 rounded" aria-label="Cor" @change="store.upsert('accounts', { ...a, color: ($event.target as HTMLInputElement).value })" />
          <input :value="a.name" class="input flex-1" aria-label="Nome" @change="store.upsert('accounts', { ...a, name: ($event.target as HTMLInputElement).value })" />
          <button class="grid h-10 w-10 place-items-center text-rose-600" aria-label="Excluir" @click="deleting = a.id"><Trash2 class="h-4 w-4" /></button>
        </div>
        <input :value="a.institution" class="input" placeholder="Instituição" @change="store.upsert('accounts', { ...a, institution: ($event.target as HTMLInputElement).value })" />
        <p class="muted text-xs">{{ a.type === 'credit' ? 'Cartão de crédito' : 'Conta corrente' }} · {{ stats(a.id).count }} transações · despesas {{ formatBRL(stats(a.id).expenseCents) }}</p>
      </div>
    </div>
    <ConfirmDialog :open="!!deleting" danger title="Excluir conta?" message="As importações e transações desta conta também serão excluídas." confirm-label="Excluir" @confirm="deleting && store.remove('accounts', deleting); deleting = null" @cancel="deleting = null" />
  </div>
</template>
