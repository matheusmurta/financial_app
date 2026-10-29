<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from '@lucide/vue'
import type { Transaction } from '@/types'
import { useFinanceStore } from '@/stores/finance'
import { formatBRL } from '@/utils/money'
import { formatDate } from '@/utils/date'

const props = defineProps<{ tx: Transaction | null }>()
const emit = defineEmits<{ close: [] }>()
const store = useFinanceStore()
const categoryId = ref('')
const merchant = ref('')
const applySimilar = ref(true)
const createRule = ref(false)
watch(() => props.tx, (t) => { if (t) { categoryId.value = t.categoryId; merchant.value = t.merchantName } }, { immediate: true })

function save() {
  const t = props.tx!
  if (merchant.value.trim() && merchant.value !== t.merchantName) store.updateTransaction(t.id, { merchantName: merchant.value.trim(), normalizedDescription: merchant.value.trim() })
  const cur = store.data.transactions.find((x) => x.id === t.id)!
  if (categoryId.value !== t.categoryId) {
    if (applySimilar.value || createRule.value) store.categorizeSimilar(cur, categoryId.value, createRule.value)
    else store.updateTransaction(t.id, { categoryId: categoryId.value })
  }
  emit('close')
}
function flag(p: Partial<Transaction>) { store.updateTransaction(props.tx!.id, p); emit('close') }
</script>

<template>
  <Teleport to="body">
    <div v-if="tx" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" @click.self="emit('close')">
      <div class="card max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-b-none md:rounded-b-2xl" role="dialog" aria-label="Editar transação">
        <div class="flex items-start justify-between">
          <div><p class="text-lg font-semibold">{{ formatBRL(tx.amountInCents) }}</p><p class="muted text-xs">{{ formatDate(tx.normalizedDate) }} · {{ store.accountById.get(tx.accountId)?.name }}</p></div>
          <button class="grid h-10 w-10 place-items-center" aria-label="Fechar" @click="emit('close')"><X /></button>
        </div>
        <div class="rounded-lg bg-zinc-50 p-2 text-xs dark:bg-zinc-800">
          <p><b>Descrição original:</b> {{ tx.originalDescription }}</p>
          <p v-if="tx.originalCategory"><b>Categoria do arquivo:</b> {{ tx.originalCategory }}</p>
          <p><b>Tipo:</b> {{ tx.transactionType }} <template v-if="tx.installmentTotal">· parcela {{ tx.installmentNumber }}/{{ tx.installmentTotal }}</template></p>
          <p v-if="tx.balanceAfterInCents != null"><b>Saldo após:</b> {{ formatBRL(tx.balanceAfterInCents) }}</p>
          <p><b>Confiança da classificação:</b> {{ Math.round(tx.confidence * 100) }}%{{ tx.userEdited ? ' · editada por você' : '' }}</p>
        </div>
        <label class="block"><span class="label">Estabelecimento</span><input v-model="merchant" class="input" /></label>
        <label class="block"><span class="label">Categoria</span>
          <select v-model="categoryId" class="input"><option v-for="c in store.data.categories" :key="c.id" :value="c.id">{{ c.name }}</option></select>
        </label>
        <label class="flex items-center gap-2 text-sm"><input v-model="applySimilar" type="checkbox" class="h-5 w-5" />Aplicar a transações semelhantes (não altera as editadas manualmente)</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="createRule" type="checkbox" class="h-5 w-5" />Criar regra automática para "{{ tx.merchantName }}"</label>
        <button class="btn-primary w-full" @click="save">Salvar</button>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-ghost" @click="flag({ isTransfer: !tx.isTransfer, categoryId: tx.isTransfer ? 'nao_classificado' : 'transferencias' })">{{ tx.isTransfer ? 'Desmarcar transferência' : 'Marcar transferência' }}</button>
          <button class="btn-ghost" @click="flag({ isRefund: !tx.isRefund })">{{ tx.isRefund ? 'Desmarcar reembolso' : 'Marcar reembolso' }}</button>
          <button class="btn-ghost" @click="flag({ isCreditCardPayment: !tx.isCreditCardPayment, categoryId: tx.isCreditCardPayment ? 'nao_classificado' : 'pagamento_fatura' })">{{ tx.isCreditCardPayment ? 'Não é fatura' : 'É pagamento de fatura' }}</button>
          <button class="btn-ghost" @click="flag({ isExcluded: !tx.isExcluded })">{{ tx.isExcluded ? 'Incluir nos indicadores' : 'Ignorar nos indicadores' }}</button>
          <button v-if="tx.isDuplicateCandidate" class="btn-ghost col-span-2" @click="flag({ isDuplicateCandidate: false })">Não é duplicata</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
