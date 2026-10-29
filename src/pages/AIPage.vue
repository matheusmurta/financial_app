<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Bot, ShieldCheck } from '@lucide/vue'
import type { AIMessage } from '@/modules/ai/types'
import { useAnalytics } from '@/composables/useAnalytics'
import FilterBar from '@/components/FilterBar.vue'
import { uid } from '@/utils/text'

const a = useAnalytics()
const { store } = a
const messages = ref<AIMessage[]>([])
const question = ref('')
const available = ref(false)
const SUGGESTIONS = ['Onde mais gastei neste mês?', 'Quais categorias mais cresceram?', 'Quanto economizei?', 'Quais despesas são recorrentes?', 'O que posso reduzir?', 'Quais meses foram mais caros?', 'Como posso economizar R$ 500?', 'Quais gastos foram fora do padrão?']

onMounted(async () => {
  const { loadProvider } = await import('@/modules/ai/service') // módulo carregado sob demanda
  available.value = await (await loadProvider()).isAvailable()
})

async function ask(q = question.value) {
  if (!q.trim()) return
  const { buildContext, answerByRules } = await import('@/modules/ai/service')
  const now = new Date().toISOString()
  messages.value.push({ id: uid('m'), role: 'user', content: q, createdAt: now })
  const ctx = buildContext(a.txs.value, store.data.categories, store.cardIds, store.filters, a.insights.value, a.mode.value)
  const ans = answerByRules(q, ctx)
  messages.value.push({ id: uid('m'), role: 'assistant', source: 'rules', createdAt: now,
    content: ans ? ans.content : 'Esta pergunta não é coberta pelas respostas automáticas por regras, e nenhum modelo de IA local está configurado. Tente uma das sugestões.' })
  question.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="h1">Consultor IA</h1>
    <div class="card flex items-start gap-3 text-sm">
      <Bot class="h-5 w-5 shrink-0 text-violet-600" />
      <div><p class="font-medium">Estado: {{ available ? 'modelo local ativo' : 'nenhum modelo de IA configurado' }}</p>
        <p class="muted text-xs">As respostas abaixo são <b>determinísticas, calculadas por regras</b> sobre seus dados filtrados — não são geradas por IA. A arquitetura está pronta para um modelo local (WebLLM/Transformers.js) no futuro.</p></div>
    </div>
    <p class="muted flex items-center gap-2 text-xs"><ShieldCheck class="h-4 w-4 text-emerald-600" />Nada sai do seu navegador. Descrições importadas são tratadas como dados, nunca como instruções.</p>
    <FilterBar />
    <div class="flex flex-wrap gap-2"><button v-for="s in SUGGESTIONS" :key="s" class="chip min-h-9" @click="ask(s)">{{ s }}</button></div>
    <div class="card min-h-40 space-y-3">
      <p v-if="!messages.length" class="muted">Faça uma pergunta ou escolha uma sugestão.</p>
      <div v-for="m in messages" :key="m.id" :class="m.role === 'user' ? 'ml-auto bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'" class="max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm">
        {{ m.content }}<span v-if="m.source === 'rules'" class="mt-1 block text-[10px] opacity-60">resposta por regras</span>
      </div>
    </div>
    <form class="flex gap-2" @submit.prevent="ask()"><input v-model="question" class="input" placeholder="Pergunte sobre suas finanças…" aria-label="Pergunta" /><button class="btn-primary">Enviar</button></form>
  </div>
</template>
