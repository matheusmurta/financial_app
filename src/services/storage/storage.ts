import { z } from 'zod'
import type { AppData } from '@/types'
import { DEFAULT_CATEGORIES } from '@/constants/categories'
import { DEFAULT_RULES } from '@/constants/rules'

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'clareza-financeira:data'

export class StorageQuotaError extends Error {
  constructor() {
    super('Espaço do armazenamento local esgotado. Faça um backup e remova importações antigas.')
    this.name = 'StorageQuotaError'
  }
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    imports: [], accounts: [], transactions: [],
    categories: structuredClone(DEFAULT_CATEGORIES),
    rules: structuredClone(DEFAULT_RULES),
    budgets: [], goals: [], savedFilters: [], scenarios: [],
    settings: { theme: 'system', onboarded: false, emergencyReserveInCents: null, viewMode: 'consumption' },
  }
}

/** Validação estrutural mínima (backups e dados persistidos são fontes não confiáveis). */
const AppDataSchema = z.object({
  schemaVersion: z.number().int(),
  imports: z.array(z.object({ id: z.string(), fileHash: z.string(), accountId: z.string() }).passthrough()),
  accounts: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  transactions: z.array(
    z.object({ id: z.string(), importId: z.string(), normalizedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amountInCents: z.number().int() }).passthrough(),
  ),
  categories: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  rules: z.array(z.object({ id: z.string(), pattern: z.string() }).passthrough()),
  budgets: z.array(z.any()), goals: z.array(z.any()),
  savedFilters: z.array(z.any()).default([]), scenarios: z.array(z.any()).default([]),
  settings: z.object({}).passthrough(),
})

type Migration = (d: Record<string, unknown>) => Record<string, unknown>
/** Migrações indexadas pela versão de origem. Adicione aqui ao subir SCHEMA_VERSION. */
const MIGRATIONS: Record<number, Migration> = {
  0: (d) => ({ ...d, savedFilters: d.savedFilters ?? [], scenarios: d.scenarios ?? [], schemaVersion: 1 }),
}

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let d = { ...raw }
  let v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0
  if (v > SCHEMA_VERSION) throw new Error('Dados criados por uma versão mais nova do aplicativo.')
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v]
    if (!m) throw new Error(`Migração ausente para versão ${v}`)
    d = m(d)
    v = d.schemaVersion as number
  }
  return d
}

export function validateData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Formato inválido.')
  const migrated = migrate(raw as Record<string, unknown>)
  const parsed = AppDataSchema.parse(migrated) as unknown as AppData
  const base = emptyData()
  parsed.settings = { ...base.settings, ...parsed.settings }
  return parsed
}

export interface LoadResult { data: AppData; corrupted: boolean; error?: string }

export interface StorageDriver { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export function createStorage(driver: StorageDriver = localStorage) {
  return {
    load(): LoadResult {
      const raw = driver.getItem(STORAGE_KEY)
      if (!raw) return { data: emptyData(), corrupted: false }
      try {
        return { data: validateData(JSON.parse(raw)), corrupted: false }
      } catch (e) {
        // Preserva cópia corrompida para recuperação manual; nunca sobrescreve silenciosamente.
        try { driver.setItem(`${STORAGE_KEY}:corrupted`, raw) } catch { /* sem espaço */ }
        return { data: emptyData(), corrupted: true, error: (e as Error).message }
      }
    },
    /** Lança StorageQuotaError se não couber; não simula sucesso. */
    save(data: AppData): number {
      const json = JSON.stringify(data)
      try {
        driver.setItem(STORAGE_KEY, json)
      } catch (e) {
        if (isQuotaError(e)) throw new StorageQuotaError()
        throw e
      }
      return json.length * 2
    },
    clear() { driver.removeItem(STORAGE_KEY) },
  }
}

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
}

/** Estimativa de uso (bytes UTF-16) — navegadores costumam limitar ~5 MB por origem. */
export function usageBytes(driver: StorageDriver & { length?: number; key?(i: number): string | null } = localStorage): number {
  const raw = driver.getItem(STORAGE_KEY)
  return raw ? raw.length * 2 : 0
}
export const ESTIMATED_QUOTA_BYTES = 5 * 1024 * 1024

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ app: 'clareza-financeira', exportedAt: new Date().toISOString(), data }, null, 2)
}
export function parseBackup(json: string): AppData {
  const obj = JSON.parse(json)
  if (obj?.app !== 'clareza-financeira' || !obj.data) throw new Error('Arquivo não é um backup do Clareza Financeira.')
  return validateData(obj.data)
}
/** Mescla backup com dados atuais por id (atual prevalece em conflito). */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const ids = new Set(a.map((x) => x.id))
    return [...a, ...b.filter((x) => !ids.has(x.id))]
  }
  return {
    ...current,
    imports: byId(current.imports, incoming.imports),
    accounts: byId(current.accounts, incoming.accounts),
    transactions: byId(current.transactions, incoming.transactions),
    categories: byId(current.categories, incoming.categories),
    rules: byId(current.rules, incoming.rules),
    budgets: byId(current.budgets, incoming.budgets),
    goals: byId(current.goals, incoming.goals),
    savedFilters: byId(current.savedFilters, incoming.savedFilters),
    scenarios: byId(current.scenarios, incoming.scenarios),
  }
}
