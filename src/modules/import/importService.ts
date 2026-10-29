import type { ImportBatch, Transaction } from '@/types'
import { normalizeKey, uid } from '@/utils/text'
import { PARSER_VERSION, type ParseResult, type ParsedRow } from './parser'

export interface DuplicateReport {
  sameFile: ImportBatch | null
  overlapping: ImportBatch[]
  duplicateLines: Set<number>
}

const fp = (accountId: string, r: Pick<ParsedRow, 'normalizedDate' | 'amountInCents' | 'originalDescription'>) =>
  `${accountId}|${r.normalizedDate}|${r.amountInCents}|${normalizeKey(r.originalDescription)}`

/**
 * Detecta arquivo idêntico (hash), períodos sobrepostos e linhas que já
 * existem para a mesma conta. Linhas iguais dentro do MESMO arquivo são
 * legítimas (ex.: duas compras iguais no dia) e só contam como duplicata
 * além da quantidade já existente.
 */
export function checkDuplicates(r: ParseResult, accountId: string, imports: ImportBatch[], existing: Transaction[]): DuplicateReport {
  const sameFile = imports.find((i) => i.fileHash === r.fileHash) ?? null
  const overlapping = imports.filter((i) => i.accountId === accountId && i.periodStart && i.periodEnd && r.periodStart && r.periodEnd
    && i.periodStart <= r.periodEnd && r.periodStart <= i.periodEnd)
  const counts = new Map<string, number>()
  for (const t of existing) if (t.accountId === accountId) counts.set(fp(accountId, t), (counts.get(fp(accountId, t)) ?? 0) + 1)
  const duplicateLines = new Set<number>()
  for (const row of r.rows) {
    const k = fp(accountId, row)
    const c = counts.get(k) ?? 0
    if (c > 0) { duplicateLines.add(row.line); counts.set(k, c - 1) }
  }
  return { sameFile, overlapping, duplicateLines }
}

export interface BuildInput {
  result: ParseResult
  name: string
  filename: string
  accountId: string
  skipDuplicates: boolean
  duplicates: DuplicateReport
  isDemo?: boolean
}

export function buildImport(i: BuildInput): { batch: ImportBatch; transactions: Transaction[] } {
  const importId = uid('imp')
  const transactions: Transaction[] = []
  for (const { line, ...row } of i.result.rows) {
    const dup = i.duplicates.duplicateLines.has(line)
    if (dup && i.skipDuplicates) continue
    transactions.push({ ...row, id: uid('tx'), importId, accountId: i.accountId, isDuplicateCandidate: dup })
  }
  const batch: ImportBatch = {
    id: importId, name: i.name, originalFilename: i.filename, fileHash: i.result.fileHash,
    sourceType: i.result.format === 'checking' ? 'checking' : 'credit_card', accountId: i.accountId,
    periodStart: i.result.periodStart, periodEnd: i.result.periodEnd, importedAt: new Date().toISOString(),
    totalRows: i.result.totalRows, validRows: transactions.length, invalidRows: i.result.errors.filter((e) => e.line > 0).length,
    status: i.result.errors.length ? 'partial' : 'imported', parserVersion: PARSER_VERSION,
    metadata: { ...i.result.metadata, encoding: i.result.encoding, separador: i.result.delimiter === '\t' ? 'tab' : i.result.delimiter },
    isDemo: i.isDemo,
  }
  return { batch, transactions }
}

/** Marca recorrência nas transações (mantém edições do usuário). */
export function markRecurring(txs: Transaction[], recurringIds: Set<string>): Transaction[] {
  return txs.map((t) => (t.isRecurring === recurringIds.has(t.id) ? t : { ...t, isRecurring: recurringIds.has(t.id) }))
}
