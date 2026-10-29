<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent } from '@/utils/money'
/** invert=true: aumento é ruim (ex.: despesas). */
const props = defineProps<{ value: number | null; invert?: boolean }>()
const good = computed(() => props.value != null && (props.invert ? props.value < 0 : props.value > 0))
</script>

<template>
  <span v-if="value == null" class="text-[11px] text-zinc-400" title="Sem base de comparação">—</span>
  <span v-else class="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
    :class="Math.abs(value) < 0.05 ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' : good ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'">
    {{ formatPercent(value) }}
  </span>
</template>
