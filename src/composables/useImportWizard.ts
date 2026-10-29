import { ref } from 'vue'
import type { SourceType } from '@/types'
import { parseFile, type ParseResult } from '@/modules/import/parser'
import { checkDuplicates, buildImport, type DuplicateReport } from '@/modules/import/importService'
import type { Delimiter, Encoding } from '@/modules/import/csv'
import { useFinanceStore } from '@/stores/finance'
import { uid } from '@/utils/text'

export interface PendingFile {
  key: string
  file: File
  bytes: Uint8Array
  result: ParseResult
  name: string
  accountId: string
  newAccountName: string
  institution: string
  skipDuplicates: boolean
  dup: DuplicateReport
  encoding?: Encoding
  delimiter?: Delimiter
}

/** Estado do assistente de importação. Nada é salvo antes de confirm(). */
export function useImportWizard() {
  const store = useFinanceStore()
  const files = ref<PendingFile[]>([])
  const progress = ref(0)
  const busy = ref(false)
  const imported = ref<{ name: string; count: number }[]>([])
  const error = ref<string | null>(null)

  const defaultAccount = (t: SourceType | 'unknown') =>
    store.data.accounts.find((a) => a.type === (t === 'checking' ? 'checking' : 'credit'))?.id ?? '__new'

  function analyze(p: Omit<PendingFile, 'result' | 'dup'> & Partial<PendingFile>): PendingFile {
    const result = parseFile(p.bytes, { rules: store.data.rules, encoding: p.encoding, delimiter: p.delimiter })
    const dup = checkDuplicates(result, p.accountId, store.data.imports, store.data.transactions)
    return { ...p, result, dup } as PendingFile
  }

  async function addFiles(list: FileList | File[]) {
    busy.value = true; error.value = null
    const arr = [...list]
    for (const [i, file] of arr.entries()) {
      if (file.size > 20 * 1024 * 1024) { error.value = `${file.name}: arquivo maior que 20 MB.`; continue }
      const bytes = new Uint8Array(await file.arrayBuffer())
      await new Promise((r) => setTimeout(r, 0)) // cede a vez à UI entre arquivos
      const first = parseFile(bytes, { rules: store.data.rules })
      const accountId = defaultAccount(first.format)
      files.value.push(analyze({
        key: uid('f'), file, bytes, name: file.name.replace(/\.csv$/i, ''), accountId,
        newAccountName: first.format === 'checking' ? 'Conta corrente' : 'Cartão de crédito', institution: '', skipDuplicates: true,
      }))
      progress.value = Math.round(((i + 1) / arr.length) * 100)
    }
    busy.value = false
  }

  function reparse(f: PendingFile) {
    const i = files.value.findIndex((x) => x.key === f.key)
    if (i >= 0) files.value[i] = analyze(f)
  }
  const remove = (key: string) => (files.value = files.value.filter((f) => f.key !== key))

  function confirm(): boolean {
    imported.value = []
    for (const f of files.value) {
      if (f.result.format === 'unknown' || !f.result.rows.length) continue
      let accountId = f.accountId
      if (accountId === '__new') {
        accountId = uid('acc')
        const ok = store.upsert('accounts', {
          id: accountId, name: f.newAccountName || 'Nova conta', institution: f.institution,
          type: f.result.format === 'checking' ? 'checking' : 'credit', color: f.result.format === 'checking' ? '#0ea5e9' : '#8b5cf6',
          isActive: true, createdAt: new Date().toISOString(),
        })
        if (!ok) return false
      }
      const dup = checkDuplicates(f.result, accountId, store.data.imports, store.data.transactions)
      const { batch, transactions } = buildImport({ result: f.result, name: f.name, filename: f.file.name, accountId, skipDuplicates: f.skipDuplicates, duplicates: dup })
      if (!store.addImport(batch, transactions)) return false
      imported.value.push({ name: f.name, count: transactions.length })
    }
    files.value = []
    return true
  }

  return { files, progress, busy, error, imported, addFiles, reparse, remove, confirm }
}
