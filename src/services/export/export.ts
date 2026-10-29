import type { Transaction, Category, FinancialAccount } from '@/types'
import { formatBRL, formatPercent } from '@/utils/money'
import type { Summary, Group } from '@/modules/analytics/engine'

/** Exportação CSV com escape seguro (neutraliza fórmulas em planilhas). */
export function toCSV(txs: Transaction[], cats: Map<string, Category>, accs: Map<string, FinancialAccount>): string {
  const esc = (v: string) => {
    let s = v
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['Data', 'Descrição original', 'Estabelecimento', 'Categoria', 'Conta', 'Tipo', 'Valor', 'Parcela', 'Ignorada']
  const rows = txs.map((t) => [
    t.normalizedDate.split('-').reverse().join('/'), t.originalDescription, t.merchantName, cats.get(t.categoryId)?.name ?? '',
    accs.get(t.accountId)?.name ?? '', t.transactionType, (t.amountInCents / 100).toFixed(2).replace('.', ','),
    t.installmentTotal ? `${t.installmentNumber}/${t.installmentTotal}` : '', t.isExcluded ? 'sim' : 'não',
  ].map(String).map(esc).join(';'))
  return '\uFEFF' + [head.join(';'), ...rows].join('\r\n')
}

export function download(content: string | Blob, filename: string, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Resumo em texto para compartilhamento. Omite contas/identificadores e descrições originais. */
export function shareText(periodLabel: string, s: Summary, cats: Group[], insights: string[] = []): string {
  const lines = [
    `📊 Resumo financeiro — ${periodLabel}`,
    `Receitas: ${formatBRL(s.incomeCents)}`,
    `Despesas: ${formatBRL(s.expenseCents)}`,
    `Resultado: ${formatBRL(s.netCents)}`,
  ]
  if (s.savingsRate != null) lines.push(`Taxa de poupança: ${formatPercent(s.savingsRate).replace('+', '')}`)
  if (cats.length) lines.push('', 'Maiores categorias:', ...cats.slice(0, 5).map((c) => `• ${c.label}: ${formatBRL(c.cents)}`))
  if (insights.length) lines.push('', 'Destaques:', ...insights.slice(0, 3).map((i) => `• ${i}`))
  lines.push('', 'Gerado localmente pelo Clareza Financeira')
  return lines.join('\n')
}

export type ShareResult = 'shared' | 'whatsapp' | 'copied' | 'cancelled'

export async function shareSummary(text: string, file?: File): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  try {
    if (file && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], text }); return 'shared' }
    if (nav.share) { await nav.share({ text }); return 'shared' }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled'
  }
  const w = window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  if (w) return 'whatsapp'
  await navigator.clipboard?.writeText(text)
  return 'copied'
}
