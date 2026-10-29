import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import type { AppData, Transaction, ImportBatch, TransactionFilters } from '@/types'
import { createStorage, emptyData, StorageQuotaError, usageBytes, ESTIMATED_QUOTA_BYTES, parseBackup, mergeData, serializeBackup } from '@/services/storage/storage'
import { emptyFilters, applyFilters } from '@/modules/transactions/filters'
import { buildDemo } from '@/modules/import/demo'
import * as M from './mutations'

const storage = createStorage()

export const useFinanceStore = defineStore('finance', () => {
  const loaded = storage.load()
  const data = shallowRef<AppData>(loaded.data)
  const loadError = ref<string | null>(loaded.corrupted ? loaded.error ?? 'Dados corrompidos' : null)
  const saveError = ref<string | null>(null)
  const usage = ref(usageBytes())
  const filters = ref<TransactionFilters>(emptyFilters())

  /** Só atualiza o estado se a gravação no localStorage tiver sucesso. */
  function commit(next: AppData): boolean {
    try {
      usage.value = storage.save(next)
      data.value = next
      saveError.value = null
      return true
    } catch (e) {
      saveError.value = e instanceof StorageQuotaError ? e.message : `Falha ao salvar: ${(e as Error).message}`
      return false
    }
  }
  const mut = (fn: (d: AppData) => AppData) => commit(fn(data.value))

  const cardIds = computed(() => new Set(data.value.accounts.filter((a) => a.type === 'credit').map((a) => a.id)))
  const accountById = computed(() => new Map(data.value.accounts.map((a) => [a.id, a])))
  const categoryById = computed(() => new Map(data.value.categories.map((c) => [c.id, c])))
  const filtered = computed(() => applyFilters(data.value.transactions, filters.value, data.value.categories))
  const hasDemo = computed(() => data.value.imports.some((i) => i.isDemo))
  const quotaPct = computed(() => (usage.value / ESTIMATED_QUOTA_BYTES) * 100)

  function loadDemo() {
    if (data.value.imports.some((i) => !i.isDemo)) return false // nunca misturar com dados reais
    const demo = buildDemo()
    return mut((d) => ({
      ...M.clearDemo(d),
      accounts: [...d.accounts.filter((a) => !a.id.startsWith('demo_')), ...demo.accounts],
      imports: demo.imports, transactions: M.refreshRecurring(demo.transactions),
      budgets: [...d.budgets.filter((b) => !b.id.startsWith('demo_')), ...demo.budgets],
      goals: [...d.goals.filter((g) => !g.id.startsWith('demo_')), ...demo.goals],
      settings: { ...d.settings, onboarded: true },
    }))
  }

  const exportBackup = () => serializeBackup(data.value)
  function restoreBackup(json: string, mode: 'replace' | 'merge') {
    const incoming = parseBackup(json)
    return commit(mode === 'replace' ? incoming : mergeData(data.value, incoming))
  }
  function resetAll() {
    const fresh = emptyData()
    fresh.settings.onboarded = true
    return commit(fresh)
  }

  watch(() => data.value.settings.theme, applyTheme, { immediate: true })

  return {
    data, loadError, saveError, usage, quotaPct, filters, filtered, cardIds, accountById, categoryById, hasDemo,
    loadDemo, exportBackup, restoreBackup, resetAll,
    addImport: (b: ImportBatch, t: Transaction[]) => mut((d) => M.addImport(d, b, t)),
    renameImport: (id: string, name: string) => mut((d) => M.renameImport(d, id, name)),
    deleteImport: (id: string) => mut((d) => M.deleteImport(d, id)),
    clearDemo: () => mut(M.clearDemo),
    updateTransaction: (id: string, p: Partial<Transaction>) => mut((d) => M.updateTransaction(d, id, p)),
    categorizeSimilar: (t: Transaction, c: string, rule: boolean) => mut((d) => M.categorizeSimilar(d, t, c, rule)),
    reapplyRules: () => mut(M.reapplyRules),
    upsert: <K extends M.ListKey>(k: K, item: AppData[K][number]) => mut((d) => M.upsert(d, k, item)),
    remove: (k: M.ListKey, id: string) => mut((d) => M.remove(d, k, id)),
    setSettings: (p: Partial<AppData['settings']>) => mut((d) => ({ ...d, settings: { ...d.settings, ...p } })),
  }
})

function applyTheme(theme: AppData['settings']['theme']) {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', !!dark)
}
