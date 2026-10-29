import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/types'
import { detectRecurrences } from './patterns'
import { generateInsights } from './engine'
import { forecastMonth, futureInstallments } from '@/modules/forecast/forecast'
import { DEFAULT_CATEGORIES } from '@/constants/categories'
import { applyFilters, emptyFilters } from '@/modules/transactions/filters'

let n = 0
const tx = (date: string, cents: number, merchant: string, cat = 'outros', p: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`, importId: 'i', accountId: 'bank', originalDate: '', normalizedDate: date, originalDescription: merchant,
  normalizedDescription: merchant, merchantName: merchant, rawAmount: '', amountInCents: cents, transactionType: 'purchase',
  direction: cents < 0 ? 'debit' : 'credit', categoryId: cat, originalCategory: null, paymentMethod: 'other',
  installmentNumber: null, installmentTotal: null, balanceAfterInCents: null, isRecurring: false, isTransfer: false,
  isCreditCardPayment: false, isRefund: false, isExcluded: false, isDuplicateCandidate: false, confidence: 1, userEdited: false, rawSourceRow: '', ...p,
})

const netflix = ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'].map((d, i) => tx(d, i === 3 ? -5990 : -5590, 'Netflix', 'assinaturas'))

describe('recorrências', () => {
  it('detecta mensal com reajuste', () => {
    const r = detectRecurrences(netflix)
    expect(r).toHaveLength(1)
    expect(r[0].frequency).toBe('monthly')
    expect(r[0].priceChangePct).toBeCloseTo(7.16, 1)
  })
  it('não detecta com dados insuficientes', () => {
    expect(detectRecurrences([tx('2026-01-01', -100, 'Loja')])).toHaveLength(0)
  })
})

describe('insights', () => {
  it('gera insights baseados em dados e nada sem dados', () => {
    const txs = [...netflix, tx('2026-03-10', -10000, 'Rest', 'restaurantes'), tx('2026-04-10', -20000, 'Rest', 'restaurantes'), tx('2026-04-01', 500000, 'Sal', 'salario', { transactionType: 'income' })]
    const ins = generateInsights(txs, DEFAULT_CATEGORIES, new Set(), '2026-04')
    expect(ins.some((i) => i.id === 'cat_restaurantes_2026-04')).toBe(true)
    expect(ins.every((i) => i.howCalculated)).toBe(true)
    expect(generateInsights(txs, DEFAULT_CATEGORIES, new Set(), '2025-01')).toHaveLength(0)
  })
})

describe('previsões', () => {
  it('retorna null sem dados', () => {
    expect(forecastMonth([], 'consumption', new Set(), '2026-04-15')).toBeNull()
  })
  it('extrapola com baixa confiança quando há pouco histórico', () => {
    const f = forecastMonth([tx('2026-04-01', -3000, 'X')], 'consumption', new Set(), '2026-04-10')!
    expect(f.confidence).toBe('baixa')
    expect(f.projectedCents).toBe(9000)
  })
  it('parcelas futuras', () => {
    const f = futureInstallments([tx('2026-03-10', -10000, 'Loja', 'compras', { installmentNumber: 8, installmentTotal: 10 })])
    expect(f.items[0].remainingCents).toBe(20000)
    expect(f.byMonth.map(([m]) => m)).toEqual(['2026-04', '2026-05'])
  })
})

describe('filtros', () => {
  it('combina filtros', () => {
    const f = { ...emptyFilters(), categoryIds: ['assinaturas'], dateFrom: '2026-02-01', minCents: 5800 }
    expect(applyFilters(netflix, f, DEFAULT_CATEGORIES)).toHaveLength(1)
    expect(applyFilters(netflix, { ...emptyFilters(), search: 'netf' }, DEFAULT_CATEGORIES)).toHaveLength(4)
  })
})
