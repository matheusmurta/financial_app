import type { AppData, Transaction, ImportBatch } from '@/types'
import { detectRecurrences } from '@/modules/insights/patterns'
import { markRecurring } from '@/modules/import/importService'
import { matchRule } from '@/modules/categories/rules'
import { uid } from '@/utils/text'

/** Mutações puras sobre AppData (testáveis sem Vue). */
export const refreshRecurring = (txs: Transaction[]) =>
  markRecurring(txs, new Set(detectRecurrences(txs).flatMap((r) => r.ids)))

export const addImport = (d: AppData, batch: ImportBatch, txs: Transaction[]): AppData =>
  ({ ...d, imports: [...d.imports, batch], transactions: refreshRecurring([...d.transactions, ...txs]) })

export const renameImport = (d: AppData, id: string, name: string): AppData =>
  ({ ...d, imports: d.imports.map((i) => (i.id === id ? { ...i, name } : i)) })

export const deleteImport = (d: AppData, id: string): AppData =>
  ({ ...d, imports: d.imports.filter((i) => i.id !== id), transactions: refreshRecurring(d.transactions.filter((t) => t.importId !== id)) })

export function clearDemo(d: AppData): AppData {
  const demo = new Set(d.imports.filter((i) => i.isDemo).map((i) => i.id))
  const keepAcc = new Set(d.imports.filter((i) => !i.isDemo).map((i) => i.accountId))
  return {
    ...d,
    imports: d.imports.filter((i) => !demo.has(i.id)),
    transactions: d.transactions.filter((t) => !demo.has(t.importId)),
    accounts: d.accounts.filter((a) => !a.id.startsWith('demo_') || keepAcc.has(a.id)),
    goals: d.goals.filter((g) => !g.id.startsWith('demo_')),
    budgets: d.budgets.filter((b) => !b.id.startsWith('demo_')),
  }
}

export const updateTransaction = (d: AppData, id: string, patch: Partial<Transaction>): AppData =>
  ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch, userEdited: true } : t)) })

/** Aplica categoria ao mesmo estabelecimento sem sobrescrever outras edições manuais. */
export function categorizeSimilar(d: AppData, t: Transaction, categoryId: string, createRule: boolean): AppData {
  const rules = createRule
    ? [...d.rules, { id: uid('rule'), pattern: t.merchantName, matchType: 'contains' as const, categoryId, merchantName: t.merchantName, priority: 1000, enabled: true }]
    : d.rules
  return {
    ...d, rules,
    transactions: d.transactions.map((x) => {
      if (x.id === t.id) return { ...x, categoryId, userEdited: true }
      if (x.merchantName === t.merchantName && !x.userEdited) return { ...x, categoryId }
      return x
    }),
  }
}

/** Reaplica regras apenas em transações não editadas pelo usuário. */
export const reapplyRules = (d: AppData): AppData => ({
  ...d,
  transactions: d.transactions.map((t) => {
    if (t.userEdited || t.isCreditCardPayment || t.isTransfer) return t
    const m = matchRule(t.originalDescription, d.rules)
    return m ? { ...t, categoryId: m.categoryId, merchantName: m.merchantName ?? t.merchantName } : t
  }),
})

export type ListKey = 'accounts' | 'categories' | 'rules' | 'budgets' | 'goals' | 'savedFilters'

export function upsert<K extends ListKey>(d: AppData, key: K, item: AppData[K][number]): AppData {
  const list = d[key] as { id: string }[]
  const exists = list.some((x) => x.id === item.id)
  return { ...d, [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item] }
}

/** Remove preservando integridade: categoria → "Não classificado"; conta → remove importações dela. */
export function remove(d: AppData, key: ListKey, id: string): AppData {
  const next = { ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) } as AppData
  if (key === 'categories') {
    next.transactions = d.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: 'nao_classificado' } : t))
    next.rules = d.rules.filter((r) => r.categoryId !== id)
    next.budgets = d.budgets.filter((b) => b.categoryId !== id)
  }
  if (key === 'accounts') {
    const imps = new Set(d.imports.filter((i) => i.accountId === id).map((i) => i.id))
    next.imports = d.imports.filter((i) => !imps.has(i.id))
    next.transactions = d.transactions.filter((t) => !imps.has(t.importId))
  }
  return next
}
