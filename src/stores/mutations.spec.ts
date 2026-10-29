import { describe, it, expect } from 'vitest'
import { emptyData } from '@/services/storage/storage'
import { buildDemo } from '@/modules/import/demo'
import * as M from './mutations'

function demoData() {
  const d = emptyData(), demo = buildDemo()
  return { ...d, accounts: demo.accounts, imports: demo.imports, transactions: demo.transactions, goals: demo.goals, budgets: demo.budgets }
}

describe('mutações', () => {
  it('renomeia e exclui importação com suas transações', () => {
    const d = demoData()
    const id = d.imports[0].id
    expect(M.renameImport(d, id, 'Novo').imports[0].name).toBe('Novo')
    const after = M.deleteImport(d, id)
    expect(after.transactions.some((t) => t.importId === id)).toBe(false)
  })
  it('preserva edição manual ao categorizar semelhantes e ao reaplicar regras', () => {
    let d = demoData()
    const [a, b] = d.transactions.filter((t) => t.merchantName === 'Uber')
    d = M.updateTransaction(d, b.id, { categoryId: 'lazer' })
    d = M.categorizeSimilar(d, a, 'transporte', true)
    expect(d.transactions.find((t) => t.id === a.id)!.categoryId).toBe('transporte')
    expect(d.transactions.find((t) => t.id === b.id)!.categoryId).toBe('lazer')
    d = M.reapplyRules(d)
    expect(d.transactions.find((t) => t.id === b.id)!.categoryId).toBe('lazer')
  })
  it('excluir categoria move transações para Não classificado', () => {
    const d = M.remove(demoData(), 'categories', 'delivery')
    expect(d.transactions.some((t) => t.categoryId === 'delivery')).toBe(false)
    expect(d.budgets.some((b) => b.categoryId === 'delivery')).toBe(false)
  })
  it('limpa somente dados de demonstração', () => {
    const d = M.clearDemo(demoData())
    expect(d.transactions).toHaveLength(0)
    expect(d.accounts).toHaveLength(0)
    expect(d.categories.length).toBeGreaterThan(30)
  })
})
