import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** "31/03/2026" → "2026-03-31"; retorna null se inválida. */
export function parseBRDate(input: string): string | null {
  const m = String(input ?? '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  let d: number, mo: number, y: number
  if (m) {
    d = +m[1]
    mo = +m[2]
    y = m[3].length === 2 ? 2000 + +m[3] : +m[3]
  } else {
    const iso = String(input ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!iso) return null
    y = +iso[1]
    mo = +iso[2]
    d = +iso[3]
  }
  if (mo < 1 || mo > 12 || d < 1) return null
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  if (d > dim) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export const monthKey = (iso: string) => iso.slice(0, 7)

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}
export function formatMonth(key: string): string {
  const s = format(parseISO(key + '-01'), 'MMM/yy', { locale: ptBR })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function formatMonthLong(key: string): string {
  const s = format(parseISO(key + '-01'), "MMMM 'de' yyyy", { locale: ptBR })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function daysBetweenInclusive(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a)) + 1
}
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
export function shiftDays(iso: string, n: number): string {
  return format(addDays(parseISO(iso), n), 'yyyy-MM-dd')
}
export function monthRange(key: string): [string, string] {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [`${key}-01`, `${key}-${String(last).padStart(2, '0')}`]
}
export function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}
export function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}
/** Lista meses entre dois keys inclusive */
export function monthsBetween(a: string, b: string): string[] {
  const out: string[] = []
  let k = a
  while (k <= b && out.length < 600) {
    out.push(k)
    k = nextMonthKey(k)
  }
  return out
}
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export function weekday(iso: string): number {
  return parseISO(iso).getDay()
}
