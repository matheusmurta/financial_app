import type { CategorizationRule, SourceType } from '@/types'
import { hashString } from '@/utils/text'
import { decodeBytes, detectDelimiter, parseRows, type Delimiter, type Encoding } from './csv'
import { H, type CsvRow, type ParseResult } from './shared'
import { parseCard } from './cardParser'
import { parseChecking, parseCheckingMeta } from './checkingParser'

export * from './shared'

/** Detecta formato e índice da linha de cabeçalho real. */
export function detectFormat(rows: CsvRow[]): { format: SourceType | 'unknown'; headerIndex: number } {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const h = rows[i].cells.map(H)
    const has = (n: string) => h.some((x) => x === n || x.startsWith(n))
    if (has('DATA') && has('VALOR')) {
      if (has('CATEGORIA') || has('TIPO')) return { format: 'credit_card', headerIndex: i }
      if (has('SALDO') || i > 0) return { format: 'checking', headerIndex: i }
      return { format: has('LANCAMENTO') ? 'credit_card' : 'checking', headerIndex: i }
    }
  }
  return { format: 'unknown', headerIndex: -1 }
}

export interface ParseOptions { encoding?: Encoding; delimiter?: Delimiter; rules: CategorizationRule[]; forceFormat?: SourceType }

export function parseText(text: string, encoding: Encoding, opts: ParseOptions): ParseResult {
  const delimiter = opts.delimiter ?? detectDelimiter(text)
  const rows = parseRows(text, delimiter)
  const det = detectFormat(rows)
  const format = det.format === 'unknown' ? 'unknown' : opts.forceFormat ?? det.format
  const r: ParseResult = {
    format, encoding, delimiter, rows: [], errors: [], warnings: [], metadata: {},
    periodStart: null, periodEnd: null, totalRows: 0, fileHash: hashString(text.replace(/\r\n/g, '\n').trim()),
  }
  if (format === 'unknown') {
    r.errors.push({ line: 0, message: 'Cabeçalho não reconhecido. Ajuste separador ou encoding manualmente.', raw: '' })
    return r
  }
  const header = rows[det.headerIndex].cells
  const body = rows.slice(det.headerIndex + 1)
  r.totalRows = body.length
  if (format === 'checking') {
    parseCheckingMeta(rows.slice(0, det.headerIndex), r)
    parseChecking(header, body, delimiter, opts.rules, r)
  } else parseCard(header, body, delimiter, opts.rules, r)

  const dates = r.rows.map((x) => x.normalizedDate).sort()
  if (dates.length) {
    if (!r.periodStart) { r.periodStart = dates[0]; r.periodEnd = dates[dates.length - 1] }
    else if (dates[0] < r.periodStart || dates[dates.length - 1] > r.periodEnd!)
      r.warnings.push('Há movimentações fora do período informado no cabeçalho do arquivo.')
  }
  if (r.rows.length + r.errors.filter((e) => e.line > 0).length !== r.totalRows)
    r.warnings.push('Contagem de linhas divergente — revise o arquivo.')
  return r
}

export function parseFile(bytes: Uint8Array, opts: ParseOptions): ParseResult {
  const { text, encoding } = decodeBytes(bytes, opts.encoding)
  return parseText(text, encoding, opts)
}
