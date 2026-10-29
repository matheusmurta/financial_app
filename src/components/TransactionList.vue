<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Transaction } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import { formatBRL } from '@/utils/money'
import { formatDate } from '@/utils/date'

const props = defineProps<{ items: Transaction[]; pageSize?: number }>()
const emit = defineEmits<{ select: [t: Transaction] }>()
const store = useFinanceStore()
const limit = ref(props.pageSize ?? 50)
watch(() => props.items, () => (limit.value = props.pageSize ?? 50))
const sorted = computed(() => [...props.items].sort((a, b) => b.normalizedDate.localeCompare(a.normalizedDate)))
const visible = computed(() => sorted.value.slice(0, limit.value))
</script>

<template>
  <ul class="divide-y divide-zinc-100 dark:divide-zinc-800">
    <li v-for="t in visible" :key="t.id">
      <button class="flex w-full items-center gap-3 py-3 text-left" @click="emit('select', t)">
        <span class="h-9 w-9 shrink-0 rounded-xl" :style="{ background: (store.categoryById.get(t.categoryId)?.color ?? '#999') + '33' }">
          <span class="mx-auto mt-3.5 block h-2 w-2 rounded-full" :style="{ background: store.categoryById.get(t.categoryId)?.color }" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium" :class="t.isExcluded ? 'line-through opacity-60' : ''">{{ t.merchantName }}</span>
          <span class="block truncate text-xs text-zinc-500">
            {{ formatDate(t.normalizedDate) }} · {{ store.categoryById.get(t.categoryId)?.name ?? 'Sem categoria' }} · {{ store.accountById.get(t.accountId)?.name }}
            <template v-if="t.installmentTotal"> · {{ t.installmentNumber }}/{{ t.installmentTotal }}</template>
            <template v-if="t.isDuplicateCandidate"> · ⚠ possível duplicata</template>
          </span>
        </span>
        <span class="text-sm font-semibold tabular-nums" :class="t.amountInCents >= 0 ? 'pos' : ''">{{ formatBRL(t.amountInCents) }}</span>
      </button>
    </li>
  </ul>
  <button v-if="sorted.length > limit" class="btn-ghost mt-3 w-full" @click="limit += 100">Mostrar mais ({{ sorted.length - limit }} restantes)</button>
</template>
