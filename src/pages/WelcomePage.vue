<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Upload, Sparkles, ShieldCheck } from '@lucide/vue'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()
const router = useRouter()
function importReal() {
  store.setSettings({ onboarded: true })
  router.push('/importar')
}
function demo() {
  if (store.loadDemo()) router.push('/')
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-violet-50 p-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-violet-950">
    <div class="w-full max-w-md text-center">
      <div class="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg">C</div>
      <h1 class="text-3xl font-semibold tracking-tight">Clareza Financeira</h1>
      <p class="mt-3 text-lg text-zinc-600 dark:text-zinc-300">Transforme seus extratos em decisões financeiras inteligentes.</p>
      <div class="mt-8 space-y-3">
        <button class="btn-primary w-full" @click="importReal"><Upload class="h-4 w-4" />Importar meus extratos</button>
        <button class="btn-ghost w-full" @click="demo"><Sparkles class="h-4 w-4" />Explorar demonstração</button>
      </div>
      <p class="muted mt-8 flex items-start gap-2 text-left text-xs">
        <ShieldCheck class="h-4 w-4 shrink-0 text-emerald-600" />
        Tudo é processado e salvo apenas neste navegador (localStorage). Nenhum dado é enviado a servidores. Quem tiver acesso a este perfil do navegador pode ver os dados, e limpar os dados do navegador apaga tudo. Faça backups.
      </p>
    </div>
  </div>
</template>
