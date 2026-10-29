import type { Category, Essentiality } from '@/types'

type Def = [id: string, name: string, icon: string, color: string, ess: Essentiality]

const DEFS: Def[] = [
  ['moradia', 'Moradia', 'Home', '#0ea5e9', 'essential'],
  ['alimentacao', 'Alimentação', 'Utensils', '#f97316', 'essential'],
  ['supermercado', 'Supermercado', 'ShoppingCart', '#22c55e', 'essential'],
  ['restaurantes', 'Restaurantes', 'UtensilsCrossed', '#fb923c', 'optional'],
  ['delivery', 'Delivery', 'Bike', '#ef4444', 'optional'],
  ['transporte', 'Transporte', 'Bus', '#3b82f6', 'essential'],
  ['combustivel', 'Combustível', 'Fuel', '#64748b', 'essential'],
  ['estacionamento', 'Estacionamento', 'ParkingCircle', '#94a3b8', 'optional'],
  ['mobilidade', 'Aplicativos de mobilidade', 'Car', '#1d4ed8', 'optional'],
  ['saude', 'Saúde', 'HeartPulse', '#e11d48', 'essential'],
  ['farmacia', 'Farmácia', 'Pill', '#f43f5e', 'essential'],
  ['educacao', 'Educação', 'GraduationCap', '#8b5cf6', 'essential'],
  ['lazer', 'Lazer', 'PartyPopper', '#d946ef', 'optional'],
  ['entretenimento', 'Entretenimento', 'Clapperboard', '#a855f7', 'optional'],
  ['viagens', 'Viagens', 'Plane', '#06b6d4', 'optional'],
  ['compras', 'Compras', 'ShoppingBag', '#eab308', 'optional'],
  ['eletronicos', 'Eletrônicos', 'Smartphone', '#6366f1', 'optional'],
  ['vestuario', 'Vestuário', 'Shirt', '#ec4899', 'optional'],
  ['servicos_digitais', 'Serviços digitais', 'Cloud', '#14b8a6', 'optional'],
  ['assinaturas', 'Assinaturas', 'Repeat', '#7c3aed', 'optional'],
  ['contas', 'Contas e serviços', 'Receipt', '#0891b2', 'essential'],
  ['agua', 'Água', 'Droplet', '#0284c7', 'essential'],
  ['energia', 'Energia', 'Zap', '#facc15', 'essential'],
  ['internet', 'Internet', 'Wifi', '#0d9488', 'essential'],
  ['telefonia', 'Telefonia', 'Phone', '#2563eb', 'essential'],
  ['seguros', 'Seguros', 'ShieldCheck', '#475569', 'essential'],
  ['impostos', 'Impostos', 'Landmark', '#78716c', 'essential'],
  ['tarifas', 'Tarifas', 'BadgePercent', '#dc2626', 'neutral'],
  ['juros', 'Juros', 'TrendingDown', '#b91c1c', 'neutral'],
  ['emprestimos', 'Empréstimos', 'HandCoins', '#9f1239', 'essential'],
  ['investimentos', 'Investimentos', 'PiggyBank', '#059669', 'neutral'],
  ['transferencias', 'Transferências', 'ArrowLeftRight', '#64748b', 'neutral'],
  ['pagamento_fatura', 'Pagamento de fatura', 'CreditCard', '#475569', 'neutral'],
  ['salario', 'Salário', 'Wallet', '#10b981', 'neutral'],
  ['renda_extra', 'Renda extra', 'Sparkles', '#34d399', 'neutral'],
  ['reembolsos', 'Reembolsos', 'Undo2', '#2dd4bf', 'neutral'],
  ['outros', 'Outros', 'Shapes', '#a1a1aa', 'optional'],
  ['nao_classificado', 'Não classificado', 'CircleHelp', '#71717a', 'neutral'],
]

export const DEFAULT_CATEGORIES: Category[] = DEFS.map(([id, name, icon, color, essentiality]) => ({
  id, name, icon, color, parentId: null, essentiality, custom: false,
}))

export const UNCATEGORIZED = 'nao_classificado'

/** Categorias que não representam consumo nem receita efetiva. */
export const NON_CONSUMPTION_CATEGORIES = new Set(['transferencias', 'pagamento_fatura', 'investimentos'])

/** Mapeamento de categorias textuais vindas do CSV do cartão. */
export const ORIGINAL_CATEGORY_MAP: Record<string, string> = {
  SUPERMERCADO: 'supermercado', SUPERMERCADOS: 'supermercado',
  RESTAURANTE: 'restaurantes', RESTAURANTES: 'restaurantes',
  ALIMENTACAO: 'alimentacao', TRANSPORTE: 'transporte',
  'POSTO DE GASOLINA': 'combustivel', COMBUSTIVEL: 'combustivel',
  SAUDE: 'saude', FARMACIA: 'farmacia', EDUCACAO: 'educacao',
  LAZER: 'lazer', ENTRETENIMENTO: 'entretenimento',
  VIAGEM: 'viagens', VIAGENS: 'viagens', 'TURISMO E ENTRETENIM': 'viagens',
  VESTUARIO: 'vestuario', SERVICOS: 'contas', ELETRONICOS: 'eletronicos',
  DEPARTAMENTO: 'compras', 'LOJA DE DEPARTAMENTO': 'compras', OUTROS: 'outros',
}
