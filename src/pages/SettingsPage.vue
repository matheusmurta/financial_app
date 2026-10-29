<script setup lang="ts">
import { ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { download } from '@/services/export/export'

const store = useFinanceStore()
const msg = ref(''), err = ref('')
const pending = ref<string | null>(null)
const restoreMode = ref<'replace' | 'merge'>('merge')
const resetting = ref(false)
const kb = (b: number) => `${(b / 1024).toFixed(0)} KB`

function backup() { download(store.exportBackup(), `clareza-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); msg.value = 'Backup baixado.' }
async function pick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) pending.value = await f.text()
  ;(e.target as HTMLInputElement).value = ''
}
function restore() {
  err.value = ''; msg.value = ''
  try { if (store.restoreBackup(pending.value!, restoreMode.value)) msg.value = 'Backup restaurado.' }
  catch (e) { err.value = `Backup inválido: ${(e as Error).message}` }
  pending.value = null
}
function reset() { resetting.value = false; if (store.resetAll()) msg.value = 'Todos os dados foram apagados.' }
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Configurações e backup</h1>
    <div class="card space-y-2">
      <h2 class="font-semibold">Aparência</h2>
      <select :value="store.data.settings.theme" class="input md:w-60" aria-label="Tema" @change="store.setSettings({ theme: ($event.target as HTMLSelectElement).value as 'light' | 'dark' | 'system' })">
        <option value="system">Seguir o sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select>
    </div>
    <div class="card space-y-2">
      <h2 class="font-semibold">Armazenamento local</h2>
      <div class="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div class="h-full bg-emerald-500" :style="{ width: Math.min(100, store.quotaPct) + '%' }" /></div>
      <p class="muted text-xs">{{ kb(store.usage) }} usados de ~5 MB estimados ({{ store.quotaPct.toFixed(1) }}%) · {{ store.data.transactions.length }} transações.</p>
      <p class="text-xs text-amber-700 dark:text-amber-300">Os dados ficam só neste navegador, sem criptografia. Quem acessa este perfil do navegador pode vê-los, e limpar os dados do site apaga tudo. Faça backups regularmente.</p>
    </div>
    <div class="card space-y-3">
      <h2 class="font-semibold">Backup e restauração</h2>
      <button class="btn-primary" @click="backup">Baixar backup completo (JSON)</button>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="restoreMode" class="input w-auto" aria-label="Modo"><option value="merge">Mesclar com dados atuais</option><option value="replace">Substituir tudo</option></select>
        <label class="btn-ghost cursor-pointer">Restaurar backup<input type="file" accept=".json,application/json" class="hidden" @change="pick" /></label>
      </div>
    </div>
    <div v-if="store.hasDemo" class="card"><button class="btn-ghost" @click="store.clearDemo()">Remover dados de demonstração</button></div>
    <div class="card"><button class="btn-danger" @click="resetting = true">Apagar todos os dados</button></div>
    <p v-if="msg" class="pos text-sm" role="status">{{ msg }}</p><p v-if="err" class="neg text-sm" role="alert">{{ err }}</p>
    <ConfirmDialog :open="!!pending" :danger="restoreMode === 'replace'" title="Restaurar backup?" :message="restoreMode === 'replace' ? 'Os dados atuais serão SUBSTITUÍDOS pelo backup.' : 'O backup será mesclado; em conflitos de id, os dados atuais prevalecem.'" confirm-label="Restaurar" @confirm="restore" @cancel="pending = null" />
    <ConfirmDialog :open="resetting" danger title="Apagar tudo?" message="Importações, transações, regras, orçamentos e metas serão apagados deste navegador. Faça um backup antes." confirm-label="Apagar" @confirm="reset" @cancel="resetting = false" />
  </div>
</template>
