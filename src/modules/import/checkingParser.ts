import type { CategorizationRule } from '@/types'
import { parseBRLToCents } from '@/utils/money'
import { parseBRDate } from '@/utils/date'
import { UNCATEGORIZED } from '@/constants/categories'
import { classifyChecking, normalizeMerchant } from './normalize'
import { H, baseFlags, categorize, findCol, type CsvRow, type ParseResult } from './shared'

/** Lê linhas de metadados acima da tabela (Conta, Período, Saldo...). */
export function parseCheckingMeta(meta: CsvRow[], r: ParseResult) {
  for (const { cells } of meta) {
    const key = H(cells[0] ?? '')
    const val = cells.slice(1).filter(Boolean).join(' ').trim()
    if (!key) continue
    if (key.startsWith('PERIODO')) {
      r.metadata.periodo = val
      const m = val.match(/(\d{2}\/\d{2}\/\d{4}).*?(\d{2}\/\d{2}\/\d{4})/)
      if (m) { r.periodStart = parseBRDate(m[1]); r.periodEnd = parseBRDate(m[2]) }
    } else if (key.startsWith('CONTA')) r.metadata.conta = val
    else if (key.startsWith('SALDO')) {
      // Não assumimos que seja saldo final: guardamos como "informado".
      r.metadata.saldoInformado = val
    } else if (!val) r.metadata.titulo = cells[0]
    else r.metadata[cells[0]] = val
  }
}

export function parseChecking(header: string[], body: CsvRow[], d: string, rules: CategorizationRule[], r: ParseResult) {
  const c = {
    date: findCol(header, ['DATA LANCAMENTO', 'DATA']),
    desc: findCol(header, ['DESCRICAO', 'HISTORICO', 'LANCAMENTO']),
    value: findCol(header, ['VALOR']),
    balance: findCol(header, ['SALDO']),
  }
  if (c.date < 0 || c.value < 0) {
    r.errors.push({ line: 0, message: 'Colunas obrigatórias ausentes (Data, Valor).', raw: header.join(d) })
    return
  }
  for (const { line, cells } of body) {
    const raw = cells.join(d)
    const date = parseBRDate(cells[c.date] ?? '')
    const amount = parseBRLToCents(cells[c.value])
    const desc = (c.desc >= 0 ? cells[c.desc] ?? '' : '').trim()
    if (!date) { r.errors.push({ line, message: `Data inválida: "${cells[c.date] ?? ''}"`, raw }); continue }
    if (amount == null) { r.errors.push({ line, message: `Valor inválido: "${cells[c.value] ?? ''}"`, raw }); continue }
    const bal = c.balance >= 0 && cells[c.balance] ? parseBRLToCents(cells[c.balance]) : null
    if (c.balance >= 0 && cells[c.balance] && bal == null)
      r.warnings.push(`Linha ${line}: saldo ilegível ("${cells[c.balance]}") — ignorado.`)

    const cls = classifyChecking(desc, amount)
    const merch = normalizeMerchant(desc || 'Sem descrição')
    const cat = categorize(desc, null, rules)
    let categoryId = cat.categoryId
    if (cls.isCreditCardPayment) categoryId = 'pagamento_fatura'
    else if (cls.transactionType === 'fee') categoryId = 'tarifas'
    else if (cls.transactionType === 'interest') categoryId = 'juros'
    else if (cls.transactionType === 'investment') categoryId = 'investimentos'
    else if (cls.isTransfer) categoryId = 'transferencias'
    else if (cls.isRefund && categoryId === UNCATEGORIZED) categoryId = 'reembolsos'
    else if (cls.transactionType === 'income' && categoryId === UNCATEGORIZED) categoryId = 'salario'

    const name = cat.merchant ?? merch.name
    r.rows.push({
      ...baseFlags(), ...cls, line,
      originalDate: cells[c.date], normalizedDate: date,
      originalDescription: desc, normalizedDescription: name, merchantName: name,
      rawAmount: cells[c.value], amountInCents: amount, direction: amount < 0 ? 'debit' : 'credit',
      categoryId, originalCategory: null, installmentNumber: null, installmentTotal: null,
      balanceAfterInCents: bal, confidence: cat.confidence, rawSourceRow: raw,
    })
  }
  checkBalances(r)
}

/** Verifica saldo[i] = saldo[i-1] + valor[i] (ou ordem inversa). Apenas relata. */
export function checkBalances(r: ParseResult) {
  const rows = r.rows.filter((x) => x.balanceAfterInCents != null)
  if (rows.length < 2) return
  let fwd = 0, rev = 0
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].balanceAfterInCents! + rows[i].amountInCents === rows[i].balanceAfterInCents) fwd++
    if (rows[i].balanceAfterInCents! + rows[i - 1].amountInCents === rows[i - 1].balanceAfterInCents) rev++
  }
  const n = rows.length - 1
  const best = Math.max(fwd, rev)
  if (best === n) r.metadata.verificacaoSaldo = 'consistente'
  else {
    r.metadata.verificacaoSaldo = `${best} de ${n} transições consistentes`
    r.warnings.push(`Saldos inconsistentes em ${n - best} de ${n} transições (pode haver linhas ausentes ou ordem diferente no mesmo dia). Nenhuma correção foi aplicada.`)
  }
}
