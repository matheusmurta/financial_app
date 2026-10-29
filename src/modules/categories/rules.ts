import type { CategorizationRule } from '@/types'
import { normalizeKey } from '@/utils/text'

export interface RuleMatch {
  rule: CategorizationRule
  categoryId: string
  merchantName: string | null
}

function matches(rule: CategorizationRule, key: string): boolean {
  const p = normalizeKey(rule.pattern)
  switch (rule.matchType) {
    case 'exact':
      return key === p
    case 'startsWith':
      return key.startsWith(p)
    case 'regex':
      try {
        // Regras de usuário: limitar tamanho evita padrões patológicos
        if (rule.pattern.length > 200) return false
        return new RegExp(rule.pattern, 'i').test(key)
      } catch {
        return false
      }
    default:
      return key.includes(p)
  }
}

/** Retorna a regra de maior prioridade que casa com a descrição. */
export function matchRule(description: string, rules: CategorizationRule[]): RuleMatch | null {
  const key = normalizeKey(description)
  let best: CategorizationRule | null = null
  for (const r of rules) {
    if (!r.enabled || !r.pattern.trim()) continue
    if (matches(r, key) && (!best || r.priority > best.priority)) best = r
  }
  return best ? { rule: best, categoryId: best.categoryId, merchantName: best.merchantName } : null
}
