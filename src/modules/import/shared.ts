import type { CategorizationRule, SourceType, Transaction } from '@/types'
import { normalizeKey } from '@/utils/text'
import { matchRule } from '@/modules/categories/rules'
import { ORIGINAL_CATEGORY_MAP, UNCATEGORIZED } from '@/constants/categories'
import type { Delimiter, Encoding } from './csv'

export const PARSER_VERSION = '1.0.0'

export interface RowError { line: number; message: string; raw: string }
export interface ParsedRow extends Omit<Transaction, 'id' | 'importId' | 'accountId'> { line: number }
export interface CsvRow { line: number; cells: string[] }

export interface ParseResult {
  format: SourceType | 'unknown'
  encoding: Encoding
  delimiter: Delimiter
  rows: ParsedRow[]
  errors: RowError[]
  warnings: string[]
  metadata: Record<string, string>
  periodStart: string | null
  periodEnd: string | null
  totalRows: number
  fileHash: string
}

/** Normaliza cabeçalho: sem acento, maiúsculo, apenas letras e espaços. */
export const H = (s: string) => normalizeKey(s).replace(/[^A-Z ]/g, '').trim()

export function findCol(header: string[], names: string[]): number {
  const h = header.map(H)
  for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i }
  for (const n of names) { const i = h.findIndex((x) => x.startsWith(n)); if (i >= 0) return i }
  return -1
}

export function categorize(desc: string, originalCategory: string | null, rules: CategorizationRule[]) {
  const m = matchRule(desc, rules)
  if (m) return { categoryId: m.categoryId, merchant: m.merchantName, confidence: 0.9 }
  if (originalCategory) {
    const mapped = ORIGINAL_CATEGORY_MAP[normalizeKey(originalCategory)]
    if (mapped) return { categoryId: mapped, merchant: null as string | null, confidence: 0.7 }
  }
  return { categoryId: UNCATEGORIZED, merchant: null as string | null, confidence: 0.2 }
}

export const baseFlags = () => ({ isRecurring: false, isExcluded: false, isDuplicateCandidate: false, userEdited: false })
