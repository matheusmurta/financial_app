<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { Moon, Sun, TriangleAlert } from '@lucide/vue'
import { PRIMARY_NAV, MORE_NAV } from '@/constants/nav'
import { useFinanceStore } from '@/stores/finance'

const route = useRoute()
const store = useFinanceStore()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const moreActive = computed(() => MORE_NAV.some((n) => route.path.startsWith(n.to)))
const dark = computed(() => document.documentElement.classList.contains('dark') && store.data.settings.theme !== 'light')
function toggleTheme() { store.setSettings({ theme: store.data.settings.theme === 'dark' ? 'light' : 'dark' }) }
</script>

<template>
  <div class="min-h-dvh md:flex">
    <aside class="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
      <RouterLink to="/" class="mb-6 flex items-center gap-2 px-2">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white">C</span>
        <span class="font-semibold">Clareza Financeira</span>
      </RouterLink>
      <nav class="flex-1 space-y-1 overflow-y-auto" aria-label="Navegação principal">
        <RouterLink v-for="n in [...PRIMARY_NAV.slice(0, 4), ...MORE_NAV]" :key="n.to" :to="n.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          :class="isActive(n.to) ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-zinc-600 dark:text-zinc-300'">
          <component :is="n.icon" class="h-4 w-4" />{{ n.label }}
        </RouterLink>
      </nav>
      <button class="btn-ghost mt-2" @click="toggleTheme"><component :is="dark ? Sun : Moon" class="h-4 w-4" />Tema</button>
    </aside>

    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200/70 bg-white/80 px-4 py-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/80" style="padding-top: calc(env(safe-area-inset-top) + .75rem)">
        <span class="font-semibold">{{ route.meta.title }}</span>
        <button class="grid h-10 w-10 place-items-center rounded-xl" aria-label="Alternar tema" @click="toggleTheme"><component :is="dark ? Sun : Moon" class="h-5 w-5" /></button>
      </header>
      <div v-if="store.hasDemo" class="bg-violet-600 px-4 py-2 text-center text-xs text-white">
        Modo demonstração — dados fictícios. <RouterLink to="/configuracoes" class="underline">Remover e começar</RouterLink>
      </div>
      <div v-if="store.saveError || store.loadError" role="alert" class="flex items-center gap-2 bg-rose-600 px-4 py-2 text-sm text-white">
        <TriangleAlert class="h-4 w-4 shrink-0" />{{ store.saveError || `Dados locais inválidos foram preservados em cópia separada: ${store.loadError}` }}
      </div>
      <main class="pb-safe mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-8 md:pb-8">
        <slot />
      </main>
    </div>

    <nav class="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/95" aria-label="Navegação inferior">
      <RouterLink v-for="n in PRIMARY_NAV" :key="n.to" :to="n.to" class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]"
        :class="isActive(n.to) || (n.to === '/mais' && moreActive) ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'">
        <component :is="n.icon" class="h-5 w-5" />{{ n.label }}
      </RouterLink>
    </nav>
  </div>
</template>
