import { describe, it, expect } from 'vitest'
import { DisabledProvider, answerByRules, buildContext, registerProvider, loadProvider } from './service'
import type { AIProvider } from './types'
import { buildDemo } from '@/modules/import/demo'
import { DEFAULT_CATEGORIES } from '@/constants/categories'
import { summarize } from '@/modules/analytics/engine'

describe('módulo IA', () => {
  it('provider padrão é indisponível e não responde', async () => {
    const p = new DisabledProvider()
    expect(await p.isAvailable()).toBe(false)
    await expect(p.ask()).rejects.toThrow()
  })
  it('provider simulado registrado via factory', async () => {
    const mock: AIProvider = {
      id: 'mock', label: 'Mock', initialize: async () => {}, isAvailable: async () => true,
      analyze: async () => ({ content: 'ok', evidenceIds: [], source: 'model' }),
      ask: async (q) => ({ content: `eco:${q}`, evidenceIds: [], source: 'model' }), cancel: () => {}, dispose: async () => {},
    }
    registerProvider('mock', async () => mock)
    const p = await loadProvider('mock')
    expect((await p.ask('oi', {} as never)).content).toBe('eco:oi')
  })
  it('contexto limitado e respostas por regras', () => {
    const d = buildDemo()
    const cards = new Set(['demo_card'])
    const ctx = buildContext(d.transactions, DEFAULT_CATEGORIES, cards, {}, [], 'consumption', 10)
    expect(ctx.transactions).toHaveLength(10)
    expect(answerByRules('Onde mais gastei?', ctx)?.content).toContain('1.')
    expect(answerByRules('qual a capital da França', ctx)).toBeNull()
  })
})

describe('dados de demonstração', () => {
  it('são marcados e consistentes (fatura não duplicada)', () => {
    const d = buildDemo()
    expect(d.imports.every((i) => i.isDemo)).toBe(true)
    const s = summarize(d.transactions, 'consumption', new Set(['demo_card']))
    const cash = summarize(d.transactions, 'cash', new Set(['demo_card']))
    expect(s.expenseCents).toBeGreaterThan(0)
    const payIds = new Set(d.transactions.filter((t) => t.isCreditCardPayment).map((t) => t.id))
    expect(payIds.size).toBeGreaterThan(0)
    // Consumo nunca inclui pagamento de fatura; caixa inclui.
    expect(s.txExpense.some((id) => payIds.has(id))).toBe(false)
    expect(cash.txExpense.some((id) => payIds.has(id))).toBe(true)
    // Como cada fatura demo quita exatamente as compras do mês, os totais coincidem.
    expect(cash.expenseCents).toBe(s.expenseCents)
  })
})
