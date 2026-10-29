/**
 * Converte valor monetário brasileiro (ex: "R$ 1.234,56", "-127,73", "2,05")
 * para centavos inteiros, sem uso de parseFloat. Retorna null se inválido.
 */
export function parseBRLToCents(input: string | null | undefined): number | null {
  if (input == null) return null
  let s = String(input)
    .replace(/[\u00A0\u202F\u2007\s]/g, '')
    .replace(/R\$/gi, '')
    .trim()
  if (!s) return null
  let negative = false
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-') || s.startsWith('\u2212')) {
    negative = !negative
    s = s.slice(1)
  } else if (s.startsWith('+')) s = s.slice(1)
  if (s.endsWith('-')) {
    negative = !negative
    s = s.slice(0, -1)
  }
  // Também aceita "R$" após sinal: "-R$ 10,00"
  s = s.replace(/R\$/gi, '')
  if (!/^[\d.,]+$/.test(s)) return null

  let intPart: string
  let decPart = ''
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0) {
    // Padrão BR: vírgula decimal, ponto milhar
    intPart = s.slice(0, lastComma).replace(/\./g, '')
    decPart = s.slice(lastComma + 1)
    if (decPart.includes('.')) return null
  } else if (lastDot >= 0) {
    const after = s.slice(lastDot + 1)
    const dots = (s.match(/\./g) || []).length
    if (dots === 1 && after.length <= 2) {
      // Ponto decimal (ex: "10.5"), comum em CSV exportados com padrão US
      intPart = s.slice(0, lastDot)
      decPart = after
    } else {
      // Pontos como separador de milhar
      if (!s.split('.').slice(1).every((g) => g.length === 3)) return null
      intPart = s.replace(/\./g, '')
    }
  } else {
    intPart = s
  }
  if (intPart === '') intPart = '0'
  if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(decPart)) return null
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, '0') || '0')
  if (!Number.isSafeInteger(cents)) return null
  return negative ? -cents : cents
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatBRL(cents: number): string {
  return brl.format(cents / 100)
}
export function formatBRLCompact(cents: number): string {
  return Math.abs(cents) < 100000 ? formatBRL(cents) : brlCompact.format(cents / 100)
}

/** Variação percentual de a para b. null quando base é zero (indefinida). */
export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null
  return ((to - from) / Math.abs(from)) * 100
}

export function formatPercent(v: number | null, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(digits).replace('.', ',')}%`
}

export function sumCents(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
