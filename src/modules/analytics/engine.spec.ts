import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/types'
import { summarize, byCategory, monthly, movingAverage } from './engine'
import { compare } from '@/modules/comparison/compare'
import { DEFAULT_CATEGORIES } from '@/constants/categories'
import { percentChange } from '@/utils/money'

let n = 0
function tx(p: Partial<Transaction>): Transaction {
  const amount = p.amountInCents ?? 0
  return {
    id: `t${n++}`, importId: 'i', accountId: 'bank', originalDate: '', normalizedDate: '2026-03-10',
    originalDescription: 'x', normalizedDescription: 'x', merchantName: 'x', rawAmount: '', amountInCents: amount,
    transactionType: 'purchase', direction: amount < 0 ? 'debit' : 'credit', categoryId: 'outros', originalCategory: null,
    paymentMethod: 'other', installmentNumber: null, installmentTotal: null, balanceAfterInCents: null,
    isRecurring: false, isTransfer: false, isCreditCardPayment: false, isRefund: false, isExcluded: false,
    isDuplicateCandidate: false, confidence: 1, userEdited: false, rawSourceRow: '', ...p,
  }
}
const cards = new Set(['card'])
const data = [
  tx({ amountInCents: 500000, transactionType: 'income', categoryId: 'salario' }),
  tx({ amountInCents: -10000, categoryId: 'supermercado' }),
  tx({ amountInCents: -200000, isCreditCardPayment: true, categoryId: 'pagamento_fatura' }),
  tx({ amountInCents: -100000, isTransfer: true, categoryId: 'transferencias' }),
  tx({ accountId: 'card', amountInCents: -150000, categoryId: 'compras' }),
  tx({ accountId: 'card', amountInCents: -60000, categoryId: 'restaurantes' }),
  tx({ accountId: 'card', amountInCents: 10000, isRefund: true, categoryId: 'compras' }),
  tx({ amountInCents: -999, isExcluded: true }),
]

describe('motor financeiro', () => {
  it('consumo: não duplica pagamento de fatura nem conta transferências', () => {
    const s = summarize(data, 'consumption', cards)
    expect(s.incomeCents).toBe(500000)
    // 100 + 1500 + 600 - 100 (estorno) = 2100,00
    expect(s.expenseCents).toBe(210000)
    expect(s.cardSpendCents).toBe(200000)
    expect(s.netCents).toBe(290000)
    expect(s.savingsRate).toBeCloseTo(58)
    expect(s.excludedCount).toBe(1)
  })
  it('caixa: fatura é saída, compras do cartão não', () => {
    const s = summarize(data, 'cash', cards)
    expect(s.expenseCents).toBe(210000)
    expect(s.bankOutflowCents).toBe(310000)
  })
  it('agrega por categoria com estorno reduzindo', () => {
    const g = byCategory(data, 'consumption', cards, DEFAULT_CATEGORIES)
    expect(g.find((x) => x.key === 'compras')!.cents).toBe(140000)
    expect(g[0].label).toBe('Compras')
  })
  it('agrupa por mês sem inventar meses vazios', () => {
    const m = monthly([...data, tx({ normalizedDate: '2026-05-01', amountInCents: -100 })], 'consumption', cards)
    expect(m.map((x) => x.month)).toEqual(['2026-03', '2026-05'])
  })
  it('variação percentual e médias', () => {
    expect(percentChange(100, 125)).toBe(25)
    expect(percentChange(0, 10)).toBeNull()
    expect(movingAverage([3, 6, 9], 3)).toEqual([null, null, 6])
  })
  it('sem receitas → taxa de poupança indefinida', () => {
    expect(summarize([tx({ amountInCents: -100 })], 'consumption', cards).savingsRate).toBeNull()
  })
  it('compara períodos com aviso de cobertura', () => {
    const c = compare(data, [tx({ amountInCents: -420000, categoryId: 'compras' })],
      ['2026-03-01', '2026-03-31'], ['2026-04-01', '2026-04-30'], 'consumption', cards, DEFAULT_CATEGORIES)
    expect(c.expenseDelta).toBe(210000)
    expect(c.expensePct).toBe(100)
    expect(c.coverageWarning).toContain('31 vs 30')
    expect(c.categories[0].key).toBe('compras')
  })
})
