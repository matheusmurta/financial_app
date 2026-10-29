<script setup lang="ts">
import { computed, ref } from 'vue'
import { Upload, CircleCheck } from '@lucide/vue'
import { useImportWizard } from '@/composables/useImportWizard'
import { useFinanceStore } from '@/stores/finance'
import ImportPreview from '@/components/ImportPreview.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useFinanceStore()
const w = useImportWizard()
const step = ref<1 | 2 | 3>(1)
const dragging = ref(false)
const confirming = ref(false)
const input = ref<HTMLInputElement | null>(null)
const validCount = computed(() => w.files.value.reduce((a, f) => a + (f.result.format === 'unknown' ? 0 : f.result.rows.length - (f.skipDuplicates ? f.dup.duplicateLines.size : 0)), 0))
const invalidCount = computed(() => w.files.value.reduce((a, f) => a + f.result.errors.length, 0))

async function onFiles(list: FileList | null) {
  if (!list?.length) return
  await w.addFiles(list)
  if (w.files.value.length) step.value = 2
}
function onDrop(e: DragEvent) { dragging.value = false; onFiles(e.dataTransfer?.files ?? null) }
function doImport() {
  confirming.value = false
  if (store.hasDemo) store.clearDemo() // não mistura demo com dados reais
  if (w.confirm()) step.value = 3
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Importar extratos</h1>
    <ol class="flex gap-2 text-xs" aria-label="Etapas">
      <li v-for="(l, i) in ['Arquivos', 'Configurar e revisar', 'Resultado']" :key="l" class="flex-1 rounded-full py-1 text-center" :class="step === i + 1 ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'">{{ i + 1 }}. {{ l }}</li>
    </ol>

    <template v-if="step === 1 || step === 2">
      <div class="card flex flex-col items-center justify-center border-2 border-dashed py-10 text-center" :class="dragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : ''"
        @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <Upload class="mb-2 h-8 w-8 text-emerald-600" />
        <p class="font-medium">Arraste arquivos CSV aqui</p>
        <p class="muted text-xs">Faturas de cartão e extratos de conta corrente · vários arquivos de uma vez</p>
        <button class="btn-primary mt-4" @click="input?.click()">Selecionar arquivos</button>
        <input ref="input" type="file" accept=".csv,text/csv,text/plain" multiple class="hidden" @change="onFiles(($event.target as HTMLInputElement).files); ($event.target as HTMLInputElement).value = ''" />
        <p v-if="w.busy.value" class="muted mt-3">Processando… {{ w.progress.value }}%</p>
        <p v-if="w.error.value" class="neg mt-3 text-sm">{{ w.error.value }}</p>
      </div>
      <p v-if="store.hasDemo" class="rounded-xl bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950 dark:text-violet-200">Ao confirmar, os dados de demonstração serão removidos para não se misturarem aos seus.</p>
    </template>

    <template v-if="step === 2">
      <ImportPreview v-for="f in w.files.value" :key="f.key" :f="f" @reparse="w.reparse(f)" @remove="w.remove(f.key)" />
      <div class="card sticky bottom-20 flex flex-wrap items-center justify-between gap-2 md:bottom-4">
        <p class="text-sm"><b>{{ validCount }}</b> linhas serão importadas<span v-if="invalidCount" class="neg"> · {{ invalidCount }} com erro serão ignoradas</span></p>
        <div class="flex gap-2"><button class="btn-ghost" @click="w.files.value = []; step = 1">Cancelar</button><button class="btn-primary" :disabled="!validCount" @click="confirming = true">Importar</button></div>
      </div>
    </template>

    <div v-if="step === 3" class="card space-y-3 text-center">
      <CircleCheck class="mx-auto h-10 w-10 text-emerald-600" />
      <p class="text-lg font-semibold">Importação concluída</p>
      <ul class="text-sm"><li v-for="i in w.imported.value" :key="i.name">{{ i.name }}: {{ i.count }} transações</li></ul>
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink to="/" class="btn-primary">Ver painel</RouterLink>
        <RouterLink :to="{ path: '/transacoes' }" class="btn-ghost" @click="store.filters.onlyUncategorized = true">Corrigir categorias</RouterLink>
        <button class="btn-ghost" @click="step = 1">Importar outro</button>
      </div>
    </div>

    <ConfirmDialog :open="confirming" title="Confirmar importação" :message="`Serão salvas ${validCount} transações neste navegador. Linhas inválidas${invalidCount ? ` (${invalidCount})` : ''} não serão importadas.`" confirm-label="Importar" @confirm="doImport" @cancel="confirming = false" />
  </div>
</template>
