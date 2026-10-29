export type SourceType = 'credit_card' | 'checking'
export type Direction = 'credit' | 'debit'
export type TransactionType =
  | 'purchase'
  | 'refund'
  | 'income'
  | 'fee'
  | 'interest'
  | 'card_payment'
  | 'transfer'
  | 'pix_sent'
  | 'pix_received'
  | 'withdrawal'
  | 'deposit'
  | 'investment'
  | 'loan'
  | 'other'
export type Essentiality = 'essential' | 'optional' | 'neutral'

export interface ImportBatch {
  id: string
  name: string
  originalFilename: string
  fileHash: string
  sourceType: SourceType
  accountId: string
  periodStart: string | null
  periodEnd: string | null
  importedAt: string
  totalRows: number
  validRows: number
  invalidRows: number
  status: 'imported' | 'partial'
  parserVersion: string
  metadata: Record<string, string>
  isDemo?: boolean
}

export interface FinancialAccount {
  id: string
  name: string
  institution: string
  type: 'checking' | 'credit'
  color: string
  isActive: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  importId: string
  accountId: string
  originalDate: string
  /** ISO yyyy-MM-dd */
  normalizedDate: string
  originalDescription: string
  normalizedDescription: string
  merchantName: string
  rawAmount: string
  /** Sinal: positivo = entrada de dinheiro / crédito; negativo = saída / débito */
  amountInCents: number
  transactionType: TransactionType
  direction: Direction
  categoryId: string
  originalCategory: string | null
  paymentMethod: 'credit_card' | 'pix' | 'debit' | 'transfer' | 'boleto' | 'other'
  installmentNumber: number | null
  installmentTotal: number | null
  balanceAfterInCents: number | null
  isRecurring: boolean
  isTransfer: boolean
  isCreditCardPayment: boolean
  isRefund: boolean
  isExcluded: boolean
  isDuplicateCandidate: boolean
  confidence: number
  userEdited: boolean
  rawSourceRow: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  parentId: string | null
  essentiality: Essentiality
  custom: boolean
}

export interface CategorizationRule {
  id: string
  pattern: string
  matchType: 'contains' | 'exact' | 'startsWith' | 'regex'
  categoryId: string
  merchantName: string | null
  priority: number
  enabled: boolean
}

export interface Budget {
  id: string
  categoryId: string
  period: 'monthly' | 'weekly'
  limitInCents: number
}

export interface FinancialGoal {
  id: string
  title: string
  targetInCents: number
  currentInCents: number
  targetDate: string | null
}

export type InsightType = 'positive' | 'negative' | 'alert' | 'opportunity' | 'trend' | 'forecast' | 'info'

export interface Insight {
  id: string
  type: InsightType
  severity: 1 | 2 | 3
  title: string
  description: string
  evidence: string[]
  transactionIds: string[]
  howCalculated: string
  estimatedImpactInCents: number | null
  period: string
  confidence: number
  generatedAt: string
}

export interface TransactionFilters {
  dateFrom: string | null
  dateTo: string | null
  accountIds: string[]
  importIds: string[]
  categoryIds: string[]
  types: TransactionType[]
  direction: Direction | null
  search: string
  minCents: number | null
  maxCents: number | null
  essentiality: Essentiality | null
  recurring: boolean | null
  installment: boolean | null
  onlyUncategorized: boolean
  includeExcluded: boolean
  onlyDuplicates: boolean
}

export interface ComparisonScenario {
  id: string
  name: string
  selectedPeriods: { a: [string, string]; b: [string, string] }
  selectedAccounts: string[]
  filters: Partial<TransactionFilters>
  configuration: Record<string, unknown>
}

export interface SavedFilter {
  id: string
  name: string
  filters: TransactionFilters
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  onboarded: boolean
  emergencyReserveInCents: number | null
  viewMode: 'consumption' | 'cash'
}

export interface AppData {
  schemaVersion: number
  imports: ImportBatch[]
  accounts: FinancialAccount[]
  transactions: Transaction[]
  categories: Category[]
  rules: CategorizationRule[]
  budgets: Budget[]
  goals: FinancialGoal[]
  savedFilters: SavedFilter[]
  scenarios: ComparisonScenario[]
  settings: AppSettings
}
