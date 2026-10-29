<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileText, Share2 } from '@lucide/vue'
import { useAnalytics } from '@/composables/useAnalytics'
import FilterBar from '@/components/FilterBar.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import { shareText, shareSummary } from '@/services/export/export'
import { formatDate } from '@/utils/date'

const a = useAnalytics()
const { store } = a
const title = ref('Relatório financeiro')
const sections = ref({ summary: true, categories: true, merchants: true, monthly: true, insights: true, transactions: false })
const LABELS: Record<keyof typeof sections.value, string> = { summary: 'Indicadores', categories: 'Categorias', merchants: 'Estabelecimentos', monthly: 'Evolução mensal', insights: 'Insights', transactions: 'Transações filtradas' }
const PRESETS = ['Relatório financeiro', 'Fechamento mensal', 'Fechamento anual', 'Relatório de cartão', 'Relatório de fluxo de caixa', 'Relatório de assinaturas', 'Oportunidades de economia']
const sharing = ref(false), status = ref('')
const period = computed(() => a.summary.value.firstDate ? `${formatDate(a.summary.value.firstDate)} a ${formatDate(a.summary.value.lastDate!)}` : '—')
const warnings = computed(() => {
  const w: string[] = []
  if (a.months.value.length < 3) w.push('Menos de 3 meses de dados: tendências e médias têm baixa confiabilidade.')
  const pend = a.txs.value.filter((t) => t.categoryId === 'nao_classificado').length
  if (pend) w.push(`${pend} transações não classificadas.`)
  if (!store.data.accounts.some((x) => x.type === 'checking')) w.push('Nenhuma conta corrente importada: receitas podem estar ausentes.')
  return w
})
const text = computed(() => shareText(period.value, a.summary.value, a.categories.value, a.insights.value.map((i) => i.title)))

async function makePdf() {
  const { buildPdf } = await import('@/services/export/pdf') // lazy: jsPDF fora do bundle inicial
  return buildPdf({ title: title.value, periodLabel: period.value, mode: a.mode.value, summary: a.summary.value, categories: a.categories.value,
    merchants: a.merchants.value, months: a.months.value, insights: a.insights.value, transactions: a.txs.value, cats: store.categoryById, sections: sections.value, warnings: warnings.value })
}
async function exportPdf() { (await makePdf()).save(`${title.value.toLowerCase().replace(/\s+/g, '-')}.pdf`) }
async function doShare(withPdf: boolean) {
  sharing.value = false
  const file = withPdf ? new File([(await makePdf()).output('blob')], 'relatorio.pdf', { type: 'application/pdf' }) : undefined
  const r = await shareSummary(text.value, file)
  status.value = { shared: 'Compartilhado.', whatsapp: 'WhatsApp aberto com o resumo em texto (PDF não é enviado por link).', copied: 'Resumo copiado para a área de transferência.', cancelled: 'Compartilhamento cancelado.' }[r]
}
</script>

<template>
  <EmptyState v-if="!store.data.transactions.length" title="Sem dados para relatórios" action-to="/importar" action-label="Importar" />
  <div v-else class="space-y-4">
    <h1 class="h1">Relatórios e compartilhamento</h1>
    <FilterBar />
    <div class="card space-y-3">
      <label class="block"><span class="label">Modelo</span><select v-model="title" class="input"><option v-for="p in PRESETS" :key="p">{{ p }}</option></select></label>
      <div class="flex flex-wrap gap-3"><label v-for="(l, k) in LABELS" :key="k" class="flex items-center gap-2 text-sm"><input v-model="sections[k]" type="checkbox" class="h-5 w-5" />{{ l }}</label></div>
      <p class="muted text-xs">Período: {{ period }} · {{ a.txs.value.length }} transações · visão {{ a.mode.value === 'cash' ? 'caixa' : 'consumo' }}</p>
      <ul v-if="warnings.length" class="list-disc pl-5 text-xs text-amber-700 dark:text-amber-300"><li v-for="w in warnings" :key="w">{{ w }}</li></ul>
      <div class="flex flex-wrap gap-2"><button class="btn-primary" @click="exportPdf"><FileText class="h-4 w-4" />Exportar PDF</button><button class="btn-ghost" @click="sharing = true"><Share2 class="h-4 w-4" />Compartilhar</button></div>
      <p v-if="status" class="pos text-sm" role="status">{{ status }}</p>
    </div>
    <div class="card"><p class="label">Prévia do resumo compartilhável (sem contas nem descrições originais)</p><pre class="whitespace-pre-wrap text-sm">{{ text }}</pre></div>
    <ConfirmDialog :open="sharing" title="Compartilhar dados financeiros?" message="O resumo acima será enviado ao aplicativo que você escolher. Números de conta e descrições originais são omitidos." confirm-label="Compartilhar texto" @confirm="doShare(false)" @cancel="sharing = false">
      <button class="btn-ghost mt-3 w-full" @click="doShare(true)">Compartilhar com PDF (se o dispositivo suportar)</button>
    </ConfirmDialog>
  </div>
</template>
