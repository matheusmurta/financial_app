import Papa from 'papaparse'

export type Encoding = 'utf-8' | 'windows-1252'
export type Delimiter = ';' | ',' | '\t'

/** Decodifica bytes: remove BOM; usa windows-1252 se UTF-8 for inválido. */
export function decodeBytes(bytes: Uint8Array, forced?: Encoding): { text: string; encoding: Encoding } {
  if (forced) return { text: stripBom(new TextDecoder(forced).decode(bytes)), encoding: forced }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { text: stripBom(text), encoding: 'utf-8' }
  } catch {
    return { text: stripBom(new TextDecoder('windows-1252').decode(bytes)), encoding: 'windows-1252' }
  }
}

export function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/** Detecta separador contando ocorrências fora de aspas nas primeiras linhas não vazias. */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 30)
  const score: Record<Delimiter, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const line of lines) {
    let inQ = false
    const counts: Record<Delimiter, number> = { ';': 0, ',': 0, '\t': 0 }
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (!inQ && ch in counts) counts[ch as Delimiter]++
    }
    for (const d of Object.keys(counts) as Delimiter[]) score[d] += counts[d]
  }
  // Vírgula aparece como decimal em BRL; só vence se claramente dominante
  if (score[';'] > 0 && score[';'] >= score['\t']) return ';'
  if (score['\t'] > 0 && score['\t'] >= score[',']) return '\t'
  return score[','] > 0 ? ',' : ';'
}

/** Divide em linhas mantendo número de linha original (1-based). */
export function parseRows(text: string, delimiter: Delimiter): { line: number; cells: string[] }[] {
  const res = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: false })
  const out: { line: number; cells: string[] }[] = []
  // Papa não informa linha física; recalculamos considerando quebras dentro de aspas
  let line = 1
  for (const cells of res.data) {
    const raw = cells.join(delimiter)
    const breaks = (raw.match(/\n/g) || []).length
    if (cells.some((c) => c.replace(/[\u00A0\s]/g, '') !== ''))
      out.push({ line, cells: cells.map((c) => c.replace(/\u00A0/g, ' ').trim()) })
    line += 1 + breaks
  }
  return out
}
