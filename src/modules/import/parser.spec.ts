import { describe, it, expect } from 'vitest'
import { parseFile } from './parser'
import { DEFAULT_RULES } from '@/constants/rules'
import { CARD_CSV, CHECKING_CSV, CARD_CSV_COMMA, enc, encLatin1 } from '@/test/fixtures'
import { parseBRLToCents } from '@/utils/money'
import { parseBRDate } from '@/utils/date'

const opts = { rules: DEFAULT_RULES }

describe('parseBRLToCents', () => {
  it.each([
    ['R$ 864,90', 86490], ['-127,73', -12773], ['2,05', 205], ['R$\u00A01.234,56', 123456],
    ['-R$ 50,00', -5000], ['0,00', 0], ['1.000.000,01', 100000001], ['10', 1000], ['(5,00)', -500],
  ])('%s → %d', (i, o) => expect(parseBRLToCents(i)).toBe(o))
  it.each(['abc', '', '1,2,3', '12,345'])('inválido: %s', (i) => expect(parseBRLToCents(i)).toBeNull())
})

describe('parseBRDate', () => {
  it('converte e valida', () => {
    expect(parseBRDate('31/03/2026')).toBe('2026-03-31')
    expect(parseBRDate('32/03/2026')).toBeNull()
    expect(parseBRDate('29/02/2025')).toBeNull()
  })
})

describe('CSV de cartão', () => {
  const r = parseFile(enc(CARD_CSV), opts)
  it('detecta formato e separador', () => {
    expect(r.format).toBe('credit_card')
    expect(r.delimiter).toBe(';')
  })
  it('mantém precisão e sinal (compra = saída)', () => {
    const a = r.rows.find((x) => x.originalDescription.startsWith('AMAZONMKTPLC'))!
    expect(a.amountInCents).toBe(-86490)
    expect(a.merchantName).toBe('Amazon Marketplace')
    expect(a.originalDescription).toBe('AMAZONMKTPLC*GRUPOMULT')
    expect(a.normalizedDate).toBe('2026-03-31')
  })
  it('preserva descrição com separador entre aspas', () => {
    expect(r.rows.some((x) => x.originalDescription === 'LOJA; COM PONTO E VIRGULA')).toBe(true)
  })
  it('detecta parcelas, estornos e pagamentos', () => {
    const p = r.rows.find((x) => x.installmentTotal)!
    expect([p.installmentNumber, p.installmentTotal]).toEqual([2, 10])
    expect(r.rows.find((x) => x.originalDescription === 'ESTORNO AMAZON')!.isRefund).toBe(true)
    const pay = r.rows.find((x) => x.originalDescription === 'PAGAMENTO RECEBIDO')!
    expect(pay.isCreditCardPayment).toBe(true)
  })
  it('reporta erros por linha sem perder linhas', () => {
    expect(r.errors.map((e) => e.line)).toEqual([8, 9])
    expect(r.rows.length + r.errors.length).toBe(r.totalRows)
  })
})

describe('CSV de conta corrente com metadados', () => {
  const r = parseFile(enc(CHECKING_CSV), opts)
  it('extrai metadados', () => {
    expect(r.format).toBe('checking')
    expect(r.metadata.conta).toBe('XXXXXXXXX')
    expect(r.metadata.saldoInformado).toBe('2,05')
    expect([r.periodStart, r.periodEnd]).toEqual(['2026-03-01', '2026-03-31'])
  })
  it('lê valores, saldos e classifica', () => {
    expect(r.rows).toHaveLength(4)
    expect(r.rows[1].amountInCents).toBe(-12773)
    expect(r.rows[1].balanceAfterInCents).toBe(488219)
    expect(r.rows[0].transactionType).toBe('pix_received')
    expect(r.rows[1].transactionType).toBe('pix_sent')
    expect(r.rows[2].isCreditCardPayment).toBe(true)
    expect(r.rows[3].transactionType).toBe('fee')
    expect(r.metadata.verificacaoSaldo).toBe('consistente')
  })
  it('aponta saldo inconsistente sem corrigir', () => {
    const bad = parseFile(enc(CHECKING_CSV.replace('2.847,19', '2.000,00')), opts)
    expect(bad.warnings.some((w) => w.includes('inconsistentes'))).toBe(true)
    expect(bad.rows[3].balanceAfterInCents).toBe(200000)
  })
})

describe('variações de arquivo', () => {
  it('separador vírgula com aspas', () => {
    const r = parseFile(enc(CARD_CSV_COMMA), opts)
    expect(r.delimiter).toBe(',')
    expect(r.rows.map((x) => x.amountInCents)).toEqual([-5590, -2340])
    expect(r.rows[1].originalDescription).toBe('UBER, TRIP')
  })
  it('UTF-8 com BOM e Windows-1252', () => {
    expect(parseFile(enc('\uFEFF' + CARD_CSV), opts).format).toBe('credit_card')
    const w = parseFile(encLatin1(CHECKING_CSV.replace(/\u00A0/g, ' ')), opts)
    expect(w.encoding).toBe('windows-1252')
    expect(w.rows[0].originalDescription).toContain('Pix recebido')
  })
  it('hash idêntico para mesmo conteúdo', () => {
    expect(parseFile(enc(CARD_CSV), opts).fileHash).toBe(parseFile(enc(CARD_CSV + '\r\n'), opts).fileHash)
  })
  it('arquivo irreconhecível gera erro', () => {
    expect(parseFile(enc('foo;bar\n1;2'), opts).format).toBe('unknown')
  })
})
