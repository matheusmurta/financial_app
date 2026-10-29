import { describe, it, expect } from 'vitest'
import { createStorage, emptyData, parseBackup, serializeBackup, mergeData, StorageQuotaError, STORAGE_KEY, migrate } from './storage'

function memDriver(limit = Infinity) {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (v.length > limit) throw new DOMException('full', 'QuotaExceededError')
      m.set(k, v)
    },
    removeItem: (k: string) => void m.delete(k),
    m,
  }
}

describe('storage', () => {
  it('salva e recupera (simula reload)', () => {
    const d = memDriver()
    const s = createStorage(d)
    const data = emptyData()
    data.accounts.push({ id: 'a1', name: 'Conta', institution: 'X', type: 'checking', color: '#000', isActive: true, createdAt: '' })
    s.save(data)
    const again = createStorage(d).load()
    expect(again.corrupted).toBe(false)
    expect(again.data.accounts[0].name).toBe('Conta')
  })
  it('trata dados corrompidos sem perder cópia', () => {
    const d = memDriver()
    d.setItem(STORAGE_KEY, '{quebrado')
    const r = createStorage(d).load()
    expect(r.corrupted).toBe(true)
    expect(d.getItem(`${STORAGE_KEY}:corrupted`)).toBe('{quebrado')
  })
  it('lança erro de quota em vez de simular sucesso', () => {
    const s = createStorage(memDriver(10))
    expect(() => s.save(emptyData())).toThrow(StorageQuotaError)
  })
  it('migra schema v0', () => {
    const { savedFilters, scenarios, ...old } = emptyData()
    void savedFilters; void scenarios
    const m = migrate({ ...old, schemaVersion: 0 })
    expect(m.schemaVersion).toBe(1)
    expect(m.savedFilters).toEqual([])
  })
  it('backup ida e volta, rejeita inválido, mescla', () => {
    const data = emptyData()
    data.goals.push({ id: 'g', title: 'Meta', targetInCents: 100, currentInCents: 0, targetDate: null })
    const restored = parseBackup(serializeBackup(data))
    expect(restored.goals).toHaveLength(1)
    expect(() => parseBackup('{"foo":1}')).toThrow()
    const merged = mergeData(emptyData(), restored)
    expect(merged.goals).toHaveLength(1)
  })
})
