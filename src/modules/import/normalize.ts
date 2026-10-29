import type { TransactionType, Transaction } from '@/types'
import { normalizeKey, titleCase } from '@/utils/text'

const ALIASES: [RegExp, string][] = [
  [/^AMAZONMKTPLC/, 'Amazon Marketplace'],
  [/^AMAZON/, 'Amazon'],
  [/^IFD\*|^IFOOD/, 'iFood'],
  [/^UBER\s*\*?\s*EATS/, 'Uber Eats'],
  [/^UBER/, 'Uber'],
  [/^NETFLIX/, 'Netflix'],
  [/^SPOTIFY/, 'Spotify'],
  [/^MERCADOLIVRE|^MERCADO\s*LIVRE|^MP\s*\*/, 'Mercado Livre'],
  [/^APPLE\.COM/, 'Apple'],
  [/^GOOGLE/, 'Google'],
  [/^PAYPAL\s*\*/, 'PayPal'],
]

/**
 * Normaliza a descrição comercial. Mantém a original quando não há
 * transformação confiável (retorna titleCase limpo).
 */
export function normalizeMerchant(description: string): { name: string; confident: boolean } {
  const key = normalizeKey(description)
  for (const [re, name] of ALIASES) if (re.test(key)) return { name, confident: true }
  // Extratos: "Pix enviado: Cp :10573521-PIX Marketplace" → "PIX Marketplace"
  const pix = description.match(/pix\s+(?:enviado|recebido)\s*:?\s*(?:cp\s*:?\s*\d+\s*-\s*)?(.+)$/i)
  if (pix && pix[1].trim()) return { name: titleCase(pix[1].trim()), confident: true }
  const cleaned = description
    .replace(/\s*\d{2}\/\d{2}\s*$/, '') // parcela no final
    .replace(/\*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return { name: cleaned ? titleCase(cleaned) : description, confident: false }
}

/** Extrai parcelamento: "PARC 02/10", "2/10", "Parcela 3 de 12". */
export function detectInstallment(...texts: string[]): { n: number; total: number } | null {
  for (const t of texts) {
    if (!t) continue
    const m =
      t.match(/parc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i) ||
      t.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})\s*$/)
    if (m) {
      const n = +m[1], total = +m[2]
      if (n >= 1 && total >= 2 && n <= total && total <= 48) return { n, total }
    }
  }
  return null
}

export interface Classification {
  transactionType: TransactionType
  paymentMethod: Transaction['paymentMethod']
  isTransfer: boolean
  isCreditCardPayment: boolean
  isRefund: boolean
}

/** Classifica movimentação de conta corrente pela descrição e sinal. */
export function classifyChecking(desc: string, cents: number): Classification {
  const k = normalizeKey(desc)
  const base: Classification = {
    transactionType: cents >= 0 ? 'deposit' : 'other',
    paymentMethod: 'other',
    isTransfer: false,
    isCreditCardPayment: false,
    isRefund: false,
  }
  if (/PAGAMENTO\s+(DE\s+)?FATURA|PAG\s*FATURA|FATURA\s+CART|PGTO\s+CARTAO/.test(k))
    return { ...base, transactionType: 'card_payment', isCreditCardPayment: true, paymentMethod: 'boleto' }
  if (/ESTORNO|DEVOLUCAO|REEMBOLSO/.test(k)) return { ...base, transactionType: 'refund', isRefund: true }
  if (/\bIOF\b|TARIFA|CESTA\s+DE\s+SERV|ANUIDADE|MENSALIDADE\s+PACOTE/.test(k)) return { ...base, transactionType: 'fee' }
  if (/JUROS|MULTA|ENCARGO|MORA\b/.test(k)) return { ...base, transactionType: 'interest' }
  if (/EMPRESTIMO|FINANCIAMENTO|CONSIGNADO/.test(k)) return { ...base, transactionType: 'loan' }
  if (/APLICACAO|RESGATE|CDB|TESOURO|INVEST|POUPANCA/.test(k)) return { ...base, transactionType: 'investment', isTransfer: true }
  if (/SALARIO|PROVENTO|FOLHA\s+DE\s+PAG/.test(k)) return { ...base, transactionType: 'income', paymentMethod: 'transfer' }
  if (/PIX\s+ENVIADO|PIX\s+ENV|PIX\s*-\s*ENVIADO/.test(k)) return { ...base, transactionType: 'pix_sent', paymentMethod: 'pix' }
  if (/PIX\s+RECEBIDO|PIX\s+REC/.test(k)) return { ...base, transactionType: 'pix_received', paymentMethod: 'pix' }
  if (/MESMA\s+TITULARIDADE|ENTRE\s+CONTAS|TRANSF.*PROPRIA/.test(k))
    return { ...base, transactionType: 'transfer', isTransfer: true, paymentMethod: 'transfer' }
  if (/\bTED\b|\bDOC\b|TRANSFERENCIA|TRANSF\b/.test(k)) return { ...base, transactionType: 'transfer', paymentMethod: 'transfer' }
  if (/SAQUE/.test(k)) return { ...base, transactionType: 'withdrawal' }
  if (/DEPOSITO/.test(k)) return { ...base, transactionType: 'deposit' }
  if (/COMPRA|DEBITO|CARTAO/.test(k)) return { ...base, transactionType: 'purchase', paymentMethod: 'debit' }
  if (/BOLETO|PAGAMENTO|PAGTO/.test(k)) return { ...base, transactionType: cents < 0 ? 'purchase' : 'deposit', paymentMethod: 'boleto' }
  return base
}

/**
 * Classifica lançamento de cartão. Na fatura, valores positivos são compras
 * (débito para o usuário) e negativos são créditos/estornos/pagamentos.
 */
export function classifyCard(desc: string, typeField: string, faturaCents: number): Classification {
  const k = normalizeKey(`${typeField} ${desc}`)
  const base: Classification = {
    transactionType: 'purchase',
    paymentMethod: 'credit_card',
    isTransfer: false,
    isCreditCardPayment: false,
    isRefund: false,
  }
  if (/PAGAMENTO|PAGTO|PGTO/.test(k) && (faturaCents < 0 || /FATURA|RECEBIDO/.test(k)))
    return { ...base, transactionType: 'card_payment', isCreditCardPayment: true }
  if (/ESTORNO|DEVOLUCAO|CANCELAMENTO|REEMBOLSO/.test(k)) return { ...base, transactionType: 'refund', isRefund: true }
  if (/\bIOF\b|TARIFA|ANUIDADE/.test(k)) return { ...base, transactionType: 'fee' }
  if (/JUROS|MULTA|ENCARGO|ROTATIVO/.test(k)) return { ...base, transactionType: 'interest' }
  if (faturaCents < 0 || /CREDITO/.test(k)) return { ...base, transactionType: 'refund', isRefund: true }
  return base
}
