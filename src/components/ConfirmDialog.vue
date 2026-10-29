<script setup lang="ts">
defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" role="dialog" aria-modal="true" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <div class="card w-full max-w-md">
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <p class="muted mt-2 whitespace-pre-line">{{ message }}</p>
        <slot />
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn-ghost" @click="emit('cancel')">Cancelar</button>
          <button :class="danger ? 'btn-danger' : 'btn-primary'" @click="emit('confirm')">{{ confirmLabel ?? 'Confirmar' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
