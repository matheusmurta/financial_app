<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { MORE_NAV } from '@/constants/nav'
</script>

<template>
  <div class="space-y-3">
    <h1 class="h1">Mais</h1>
    <nav class="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
      <RouterLink v-for="n in MORE_NAV" :key="n.to" :to="n.to" class="flex min-h-14 items-center gap-3 px-4">
        <component :is="n.icon" class="h-5 w-5 text-emerald-600" /><span class="flex-1">{{ n.label }}</span><ChevronRight class="h-4 w-4 text-zinc-400" />
      </RouterLink>
    </nav>
  </div>
</template>
