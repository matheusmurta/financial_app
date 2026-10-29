import type { Transaction, Category, TransactionFilters, Insight } from '@/types'

/** Contexto financeiro mínimo enviado a um provider. Descrições são DADOS NÃO CONFIÁVEIS. */
export interface FinancialAIContext {
  selectedPeriod: { from: string | null; to: string | null }
  selectedAccounts: string[]
  financialSummary: { incomeCents: number; expenseCents: number; netCents: number }
  categorySummary: { category: string; cents: number }[]
  merchantSummary: { merchant: string; cents: number }[]
  transactions: Pick<Transaction, 'id' | 'normalizedDate' | 'merchantName' | 'amountInCents' | 'categoryId'>[]
  trends: { month: string; expenseCents: number }[]
  anomalies: string[]
  recurringPayments: { merchant: string; monthlyCents: number }[]
  activeFilters: Partial<TransactionFilters>
  dataQuality: { transactionCount: number; monthsCovered: number; uncategorized: number }
  generatedInsights: Pick<Insight, 'title' | 'description'>[]
}

export interface AIMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; evidenceIds?: string[]; source?: 'rules' | 'model'; createdAt: string }
export interface AIAnswer { content: string; evidenceIds: string[]; source: 'rules' | 'model' }
export interface AIProgress { stage: 'idle' | 'loading' | 'ready' | 'error'; percent: number; message?: string }

export interface AIProvider {
  readonly id: string
  readonly label: string
  initialize(onProgress?: (p: AIProgress) => void): Promise<void>
  isAvailable(): Promise<boolean>
  analyze(context: FinancialAIContext, signal?: AbortSignal): Promise<AIAnswer>
  ask(question: string, context: FinancialAIContext, signal?: AbortSignal): Promise<AIAnswer>
  cancel(): void
  dispose(): Promise<void>
}

export class AIUnavailableError extends Error {
  constructor(msg = 'Nenhum modelo de IA local está configurado.') { super(msg); this.name = 'AIUnavailableError' }
}

export type { Category }
