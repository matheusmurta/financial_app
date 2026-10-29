<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
defineProps<{ title: string; description?: string; actionTo?: string; actionLabel?: string; compact?: boolean }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="compact ? 'py-8' : 'py-16'">
    <div class="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950"><Sparkles class="h-6 w-6" /></div>
    <p class="font-medium">{{ title }}</p>
    <p v-if="description" class="muted mt-1 max-w-sm">{{ description }}</p>
    <RouterLink v-if="actionTo" :to="actionTo" class="btn-primary mt-4">{{ actionLabel }}</RouterLink>
  </div>
</template>
