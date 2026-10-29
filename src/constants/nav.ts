import { House, ArrowLeftRight, Lightbulb, GitCompareArrows, Ellipsis, Upload, Wallet, Tags, ListChecks, PiggyBank, Target, FileText, Bot, Settings, Info, FolderOpen } from '@lucide/vue'

export const PRIMARY_NAV = [
  { to: '/', label: 'Início', icon: House },
  { to: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/comparar', label: 'Comparar', icon: GitCompareArrows },
  { to: '/mais', label: 'Mais', icon: Ellipsis },
]

export const MORE_NAV = [
  { to: '/importar', label: 'Importar extratos', icon: Upload },
  { to: '/importacoes', label: 'Importações', icon: FolderOpen },
  { to: '/contas', label: 'Contas e cartões', icon: Wallet },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/regras', label: 'Regras', icon: ListChecks },
  { to: '/orcamentos', label: 'Orçamentos', icon: PiggyBank },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/consultor', label: 'Consultor IA', icon: Bot },
  { to: '/configuracoes', label: 'Configurações e backup', icon: Settings },
  { to: '/sobre', label: 'Sobre o projeto', icon: Info },
]
