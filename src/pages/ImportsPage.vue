<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Trash2 } from '@lucide/vue'
import { useFinanceStore } from '@/stores/finance'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/date'

const store = useFinanceStore()
const deleting = ref<string | null>(null)
function rename(id: string, current: string) {
  const n = prompt('Novo nome:', current)
  if (n?.trim()) store.renameImport(id, n.trim())
}
function confirmDelete() { if (deleting.value) store.deleteImport(deleting.value); deleting.value = null }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between"><h1 class="h1">Importações</h1><RouterLink to="/importar" class="btn-primary">Importar</RouterLink></div>
    <EmptyState v-if="!store.data.imports.length" title="Nenhuma importação" compact />
    <div v-for="i in [...store.data.imports].reverse()" :key="i.id" class="card">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ i.name }} <span v-if="i.isDemo" class="chip !py-0">demo</span></p>
          <p class="muted text-xs">{{ i.originalFilename }} · {{ store.accountById.get(i.accountId)?.name ?? 'conta removida' }}</p>
          <p class="muted text-xs">{{ i.periodStart ? `${formatDate(i.periodStart)} a ${formatDate(i.periodEnd!)}` : '' }} · {{ i.validRows }} importadas de {{ i.totalRows }} · {{ i.invalidRows }} inválidas · {{ new Date(i.importedAt).toLocaleString('pt-BR') }}</p>
          <p v-if="i.metadata.verificacaoSaldo" class="muted text-xs">Verificação de saldo: {{ i.metadata.verificacaoSaldo }}</p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button class="grid h-10 w-10 place-items-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Renomear" @click="rename(i.id, i.name)"><Pencil class="h-4 w-4" /></button>
          <button class="grid h-10 w-10 place-items-center rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Excluir" @click="deleting = i.id"><Trash2 class="h-4 w-4" /></button>
        </div>
      </div>
    </div>
    <ConfirmDialog :open="!!deleting" danger title="Excluir importação?" message="Todas as transações deste arquivo serão removidas, incluindo suas edições. Esta ação não pode ser desfeita." confirm-label="Excluir" @confirm="confirmDelete" @cancel="deleting = null" />
  </div>
</template>
