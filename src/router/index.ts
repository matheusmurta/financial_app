import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

/** Hash history: funciona em qualquer hospedagem estática sem configuração. Rotas com lazy loading. */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/DashboardPage.vue'), meta: { title: 'Início' } },
  { path: '/boas-vindas', name: 'welcome', component: () => import('@/pages/WelcomePage.vue'), meta: { title: 'Boas-vindas', bare: true } },
  { path: '/transacoes', name: 'transactions', component: () => import('@/pages/TransactionsPage.vue'), meta: { title: 'Transações' } },
  { path: '/insights', name: 'insights', component: () => import('@/pages/InsightsPage.vue'), meta: { title: 'Insights' } },
  { path: '/comparar', name: 'compare', component: () => import('@/pages/ComparePage.vue'), meta: { title: 'Comparar períodos' } },
  { path: '/mais', name: 'more', component: () => import('@/pages/MorePage.vue'), meta: { title: 'Mais' } },
  { path: '/importar', name: 'import', component: () => import('@/pages/ImportPage.vue'), meta: { title: 'Importar extratos' } },
  { path: '/importacoes', name: 'imports', component: () => import('@/pages/ImportsPage.vue'), meta: { title: 'Importações' } },
  { path: '/contas', name: 'accounts', component: () => import('@/pages/AccountsPage.vue'), meta: { title: 'Contas e cartões' } },
  { path: '/categorias', name: 'categories', component: () => import('@/pages/CategoriesPage.vue'), meta: { title: 'Categorias' } },
  { path: '/regras', name: 'rules', component: () => import('@/pages/RulesPage.vue'), meta: { title: 'Regras' } },
  { path: '/orcamentos', name: 'budgets', component: () => import('@/pages/BudgetsPage.vue'), meta: { title: 'Orçamentos' } },
  { path: '/metas', name: 'goals', component: () => import('@/pages/GoalsPage.vue'), meta: { title: 'Metas' } },
  { path: '/relatorios', name: 'reports', component: () => import('@/pages/ReportsPage.vue'), meta: { title: 'Relatórios' } },
  { path: '/consultor', name: 'ai', component: () => import('@/pages/AIPage.vue'), meta: { title: 'Consultor IA' } },
  { path: '/configuracoes', name: 'settings', component: () => import('@/pages/SettingsPage.vue'), meta: { title: 'Configurações e backup' } },
  { path: '/sobre', name: 'about', component: () => import('@/pages/AboutPage.vue'), meta: { title: 'Sobre' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.afterEach((to) => { document.title = `${to.meta.title ?? ''} · Clareza Financeira` })
