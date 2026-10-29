export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
/** Normaliza para comparação: sem acento, maiúsculas, espaços simples. */
export function normalizeKey(s: string): string {
  return stripAccents(s).toUpperCase().replace(/[\u00A0\s]+/g, ' ').trim()
}
export function titleCase(s: string): string {
  const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return s
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
let counter = 0
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1e6
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rnd}`
}
/** Hash determinístico (FNV-1a 53 bits) — para detecção de duplicidade, não segurança. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef ^ 0,
    h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
