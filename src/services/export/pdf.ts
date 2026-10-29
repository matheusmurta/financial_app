import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Transaction, Category, Insight } from '@/types'
import type { Summary, Group, MonthRow } from '@/modules/analytics/engine'
import { formatBRL, formatPercent } from '@/utils/money'
import { formatDate, formatMonth } from '@/utils/date'

export interface ReportSections { summary: boolean; categories: boolean; merchants: boolean; monthly: boolean; insights: boolean; transactions: boolean }
export interface ReportInput {
  title: string; periodLabel: string; mode: 'consumption' | 'cash'
  summary: Summary; categories: Group[]; merchants: Group[]; months: MonthRow[]; insights: Insight[]
  transactions: Transaction[]; cats: Map<string, Category>; sections: ReportSections; warnings: string[]
  chartImages?: { title: string; dataUrl: string }[]
}

/** Gera PDF A4 com tabelas paginadas e rodapé. Tudo local (jsPDF). */
export function buildPdf(r: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 18
  doc.setFillColor(5, 150, 105); doc.rect(0, 0, W, 4, 'F')
  doc.setFontSize(18); doc.text(r.title, 14, y); y += 7
  doc.setFontSize(10); doc.setTextColor(100)
  doc.text(`Período: ${r.periodLabel} · Visão: ${r.mode === 'cash' ? 'caixa' : 'consumo'} · Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, y)
  doc.setTextColor(0); y += 8
  const table = (title: string, head: string[], body: (string | number)[][]) => {
    if (!body.length) return
    doc.setFontSize(12); doc.text(title, 14, y)
    autoTable(doc, { startY: y + 2, head: [head], body, theme: 'striped', headStyles: { fillColor: [5, 150, 105] }, styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' }, margin: { left: 14, right: 14 } })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    if (y > 260) { doc.addPage(); y = 18 }
  }
  const s = r.summary
  if (r.sections.summary) table('Indicadores', ['Indicador', 'Valor', 'Como é calculado'], [
    ['Receitas', formatBRL(s.incomeCents), 'Créditos bancários, exceto transferências/estornos'],
    ['Despesas', formatBRL(s.expenseCents), r.mode === 'cash' ? 'Saídas da conta corrente' : 'Consumo; exclui pagamento de fatura e transferências'],
    ['Resultado', formatBRL(s.netCents), 'Receitas − Despesas'],
    ['Taxa de poupança', s.savingsRate == null ? 'indisponível' : formatPercent(s.savingsRate), 'Resultado ÷ Receitas'],
    ['Consumo no cartão', formatBRL(s.cardSpendCents), 'Compras − estornos nos cartões'],
    ['Tarifas e juros', formatBRL(s.feesCents), 'Lançamentos classificados como tarifa/juros'],
  ])
  for (const img of r.chartImages ?? []) {
    if (y > 190) { doc.addPage(); y = 18 }
    doc.setFontSize(12); doc.text(img.title, 14, y)
    doc.addImage(img.dataUrl, 'PNG', 14, y + 2, W - 28, (W - 28) * 0.5); y += (W - 28) * 0.5 + 10
  }
  if (r.sections.monthly) table('Evolução mensal', ['Mês', 'Receitas', 'Despesas', 'Resultado'], r.months.map((m) => [formatMonth(m.month), formatBRL(m.incomeCents), formatBRL(m.expenseCents), formatBRL(m.netCents)]))
  const tot = s.expenseCents || 1
  if (r.sections.categories) table('Despesas por categoria', ['Categoria', 'Valor', '%', 'Qtd.'], r.categories.map((g) => [g.label, formatBRL(g.cents), `${((g.cents / tot) * 100).toFixed(1)}%`, g.count]))
  if (r.sections.merchants) table('Principais estabelecimentos', ['Estabelecimento', 'Valor', 'Qtd.'], r.merchants.slice(0, 20).map((g) => [g.label, formatBRL(g.cents), g.count]))
  if (r.sections.insights) table('Insights', ['Insight', 'Detalhe', 'Cálculo'], r.insights.map((i) => [i.title, i.description, i.howCalculated]))
  if (r.sections.transactions) table('Transações', ['Data', 'Estabelecimento', 'Categoria', 'Valor'],
    [...r.transactions].sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate)).map((t) => [formatDate(t.normalizedDate), t.merchantName, r.cats.get(t.categoryId)?.name ?? '', formatBRL(t.amountInCents)]))
  if (r.warnings.length) table('Avisos sobre os dados', ['Aviso'], r.warnings.map((w) => [w]))
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(130)
    doc.text('Clareza Financeira · relatório gerado localmente · valores baseados apenas nos arquivos importados', 14, 290)
    doc.text(`${i}/${pages}`, W - 14, 290, { align: 'right' })
  }
  return doc
}
