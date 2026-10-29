import type { FinancialAccount, Transaction, ImportBatch, Budget, FinancialGoal } from '@/types'
import { parseText } from '@/modules/import/parser'
import { buildImport } from '@/modules/import/importService'
import { DEFAULT_RULES } from '@/constants/rules'
import { monthRange, prevMonthKey, todayISO } from '@/utils/date'

/** Gerador pseudoaleatório determinístico (dados sintéticos reprodutíveis). */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
}
const brl = (c: number) => (c / 100).toFixed(2).replace('.', ',')
const br = (iso: string) => iso.split('-').reverse().join('/')

/** Gera 6 meses de dados 100% fictícios, marcados como demonstração. */
export function buildDemo(): { accounts: FinancialAccount[]; imports: ImportBatch[]; transactions: Transaction[]; budgets: Budget[]; goals: FinancialGoal[] } {
  const r = rng(42)
  const now = new Date().toISOString()
  const accounts: FinancialAccount[] = [
    { id: 'demo_bank', name: 'Conta Demo', institution: 'Banco Fictício', type: 'checking', color: '#0ea5e9', isActive: true, createdAt: now },
    { id: 'demo_card', name: 'Cartão Demo', institution: 'Banco Fictício', type: 'credit', color: '#8b5cf6', isActive: true, createdAt: now },
  ]
  let mk = todayISO().slice(0, 7)
  const months: string[] = []
  for (let i = 0; i < 6; i++) { months.unshift(mk); mk = prevMonthKey(mk) }
  const imports: ImportBatch[] = [], transactions: Transaction[] = []
  let balance = 300000
  for (const [mi, m] of months.entries()) {
    const [, end] = monthRange(m)
    const last = Math.min(+end.slice(8), m === todayISO().slice(0, 7) ? +todayISO().slice(8) : 31)
    const day = (d: number) => `${m}-${String(Math.min(d, last)).padStart(2, '0')}`
    const card: string[] = ['Data;Lançamento;Categoria;Tipo;Valor']
    const pushC = (d: number, desc: string, cat: string, type: string, c: number) => card.push(`${br(day(d))};${desc};${cat};${type};R$ ${brl(c)}`)
    pushC(5, 'NETFLIX.COM', 'SERVICOS', 'Compra à vista', mi < 4 ? 5590 : 5990)
    pushC(8, 'SPOTIFY', 'SERVICOS', 'Compra à vista', 2190)
    for (let k = 0; k < 6; k++) pushC(2 + k * 4, 'IFD*RESTAURANTE DEMO', 'RESTAURANTE', 'Compra à vista', 3500 + Math.round(r() * 4000) + mi * 300)
    for (let k = 0; k < 4; k++) pushC(3 + k * 7, 'SUPERMERCADO EXEMPLO', 'SUPERMERCADO', 'Compra à vista', 18000 + Math.round(r() * 12000))
    for (let k = 0; k < 5; k++) pushC(1 + k * 5, 'UBER *TRIP', 'TRANSPORTE', 'Compra à vista', 1500 + Math.round(r() * 2500))
    pushC(12, 'POSTO DEMO', 'POSTO DE GASOLINA', 'Compra à vista', 20000 + Math.round(r() * 5000))
    pushC(18, `LOJA DEMO PARC ${String(mi + 1).padStart(2, '0')}/10`, 'VESTUARIO', 'Parcela', 15000)
    if (mi === 4) pushC(20, 'AMAZONMKTPLC*ELETRONICOS', 'OUTROS', 'Compra à vista', 189900)
    if (mi === 2) pushC(22, 'ESTORNO AMAZON', 'OUTROS', 'Estorno', -4990)
    const cardRes = parseText(card.join('\n'), 'utf-8', { rules: DEFAULT_RULES })
    const cardTotal = cardRes.rows.reduce((a, x) => a - x.amountInCents, 0)

    const bank: string[] = ['Extrato Conta Corrente', 'Conta;DEMO-0000', `Período;${br(day(1))} a ${br(day(31))}`, 'Data Lançamento;Descrição;Valor;Saldo']
    const pushB = (d: number, desc: string, c: number) => { balance += c; bank.push(`${br(day(d))};"${desc}";${c < 0 ? '-' : ''}${brl(Math.abs(c))};${balance < 0 ? '-' : ''}${brl(Math.abs(balance))}`) }
    pushB(1, 'Pix recebido: Cp :0001-Salario Empresa Demo', 650000)
    pushB(5, 'Pagamento boleto Aluguel Demo', -180000)
    pushB(7, 'Pix enviado: Cp :0002-Enel Energia', -(18000 + Math.round(r() * 6000)))
    pushB(9, 'Débito automático VIVO internet', -12990)
    pushB(10, 'Pagamento de fatura cartão', -cardTotal)
    pushB(15, 'Tarifa pacote serviços', -3490)
    if (mi % 2 === 0) pushB(20, 'Pix recebido: Cp :0003-Freela Demo', 80000 + Math.round(r() * 40000))
    pushB(25, 'Aplicação CDB Demo', -50000)
    const bankRes = parseText(bank.join('\n'), 'utf-8', { rules: DEFAULT_RULES })
    const none = { sameFile: null, overlapping: [], duplicateLines: new Set<number>() }
    for (const [res, acc, label] of [[cardRes, 'demo_card', 'Fatura'], [bankRes, 'demo_bank', 'Extrato']] as const) {
      const b = buildImport({ result: res, name: `${label} demo ${m}`, filename: `demo-${label.toLowerCase()}-${m}.csv`, accountId: acc, skipDuplicates: false, duplicates: none, isDemo: true })
      imports.push(b.batch)
      transactions.push(...b.transactions)
    }
  }
  return {
    accounts, imports, transactions,
    budgets: [{ id: 'demo_b1', categoryId: 'delivery', period: 'monthly', limitInCents: 30000 }, { id: 'demo_b2', categoryId: 'supermercado', period: 'monthly', limitInCents: 100000 }],
    goals: [{ id: 'demo_g1', title: 'Reserva de emergência (demo)', targetInCents: 2000000, currentInCents: 450000, targetDate: `${+todayISO().slice(0, 4) + 1}-12-31` }],
  }
}
