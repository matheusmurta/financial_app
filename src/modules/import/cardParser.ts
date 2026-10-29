import type { CategorizationRule } from '@/types'
import { parseBRLToCents } from '@/utils/money'
import { parseBRDate } from '@/utils/date'
import { UNCATEGORIZED } from '@/constants/categories'
import { classifyCard, detectInstallment, normalizeMerchant } from './normalize'
import { baseFlags, categorize, findCol, type CsvRow, type ParseResult } from './shared'

/** Parser do CSV de fatura: Data;Lançamento;Categoria;Tipo;Valor */
export function parseCard(header: string[], body: CsvRow[], d: string, rules: CategorizationRule[], r: ParseResult) {
  const c = {
    date: findCol(header, ['DATA']),
    desc: findCol(header, ['LANCAMENTO', 'DESCRICAO', 'ESTABELECIMENTO']),
    cat: findCol(header, ['CATEGORIA']),
    type: findCol(header, ['TIPO']),
    value: findCol(header, ['VALOR']),
  }
  if (c.date < 0 || c.desc < 0 || c.value < 0) {
    r.errors.push({ line: 0, message: 'Colunas obrigatórias ausentes (Data, Lançamento, Valor).', raw: header.join(d) })
    return
  }
  for (const { line, cells } of body) {
    const raw = cells.join(d)
    const date = parseBRDate(cells[c.date] ?? '')
    const fatura = parseBRLToCents(cells[c.value])
    const desc = (cells[c.desc] ?? '').trim()
    if (!date) { r.errors.push({ line, message: `Data inválida: "${cells[c.date] ?? ''}"`, raw }); continue }
    if (fatura == null) { r.errors.push({ line, message: `Valor inválido: "${cells[c.value] ?? ''}"`, raw }); continue }
    if (!desc) { r.errors.push({ line, message: 'Descrição vazia', raw }); continue }

    const typeField = c.type >= 0 ? cells[c.type] ?? '' : ''
    const origCat = c.cat >= 0 ? cells[c.cat] || null : null
    const cls = classifyCard(desc, typeField, fatura)
    const merch = normalizeMerchant(desc)
    const cat = categorize(desc, origCat, rules)
    const inst = detectInstallment(desc, typeField)

    let categoryId = cat.categoryId
    if (cls.isCreditCardPayment) categoryId = 'pagamento_fatura'
    else if (cls.transactionType === 'fee') categoryId = 'tarifas'
    else if (cls.transactionType === 'interest') categoryId = 'juros'
    else if (cls.isRefund && categoryId === UNCATEGORIZED) categoryId = 'reembolsos'

    // Na fatura, positivo = gasto. Convenção interna: saída de dinheiro é negativa.
    const amount = -fatura
    const name = cat.merchant ?? merch.name
    r.rows.push({
      ...baseFlags(), ...cls, line,
      originalDate: cells[c.date], normalizedDate: date,
      originalDescription: desc, normalizedDescription: name, merchantName: name,
      rawAmount: cells[c.value], amountInCents: amount, direction: amount < 0 ? 'debit' : 'credit',
      categoryId, originalCategory: origCat,
      installmentNumber: inst?.n ?? null, installmentTotal: inst?.total ?? null,
      balanceAfterInCents: null,
      confidence: merch.confident ? cat.confidence : Math.min(cat.confidence, 0.6),
      rawSourceRow: raw,
    })
  }
}
