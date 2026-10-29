<script setup lang="ts">
import { ref } from 'vue'
import VariationBadge from './VariationBadge.vue'
import { formatBRL } from '@/utils/money'

const props = defineProps<{
  label: string
  cents?: number | null
  text?: string
  variation?: number | null
  invert?: boolean
  hint?: string
  tone?: 'pos' | 'neg' | 'neutral'
  estimated?: boolean
}>()
const open = ref(false)
void props
</script>

<template>
  <div class="card flex flex-col gap-1">
    <button class="flex items-center justify-between text-left" :aria-expanded="open" @click="open = !open">
      <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">{{ label }}<span v-if="estimated" class="ml-1 rounded bg-violet-100 px-1 text-[10px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">estimado</span></span>
      <VariationBadge v-if="variation !== undefined" :value="variation ?? null" :invert="invert" />
    </button>
    <span class="text-lg font-semibold tabular-nums md:text-xl" :class="tone === 'pos' ? 'pos' : tone === 'neg' ? 'neg' : ''">
      {{ text ?? (cents == null ? '—' : formatBRL(cents)) }}
    </span>
    <p v-if="hint && open" class="text-xs text-zinc-500">{{ hint }}</p>
  </div>
</template>
