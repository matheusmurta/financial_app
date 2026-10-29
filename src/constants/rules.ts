import type { CategorizationRule } from '@/types'

type R = [pattern: string, categoryId: string, merchant?: string]
const RULES: R[] = [
  ['UBER', 'mobilidade', 'Uber'], ['99APP', 'mobilidade', '99'], ['99 POP', 'mobilidade', '99'],
  ['IFOOD', 'delivery', 'iFood'], ['IFD*', 'delivery', 'iFood'], ['RAPPI', 'delivery', 'Rappi'],
  ['NETFLIX', 'assinaturas', 'Netflix'], ['SPOTIFY', 'assinaturas', 'Spotify'],
  ['DISNEY', 'assinaturas', 'Disney+'], ['HBOMAX', 'assinaturas', 'Max'],
  ['PRIME VIDEO', 'assinaturas', 'Prime Video'], ['YOUTUBE', 'assinaturas', 'YouTube Premium'],
  ['APPLE.COM', 'servicos_digitais', 'Apple'], ['GOOGLE', 'servicos_digitais', 'Google'],
  ['MICROSOFT', 'servicos_digitais', 'Microsoft'],
  ['AMAZONMKTPLC', 'compras', 'Amazon Marketplace'], ['AMAZON', 'compras', 'Amazon'],
  ['MERCADOLIVRE', 'compras', 'Mercado Livre'], ['MERCADO LIVRE', 'compras', 'Mercado Livre'],
  ['SHOPEE', 'compras', 'Shopee'], ['MAGALU', 'compras', 'Magazine Luiza'],
  ['POSTO', 'combustivel'], ['SHELL', 'combustivel', 'Shell'], ['IPIRANGA', 'combustivel', 'Ipiranga'],
  ['ESTAPAR', 'estacionamento', 'Estapar'], ['ESTACIONAMENTO', 'estacionamento'],
  ['SUPERMERCADO', 'supermercado'], ['CARREFOUR', 'supermercado', 'Carrefour'],
  ['ASSAI', 'supermercado', 'Assaí'], ['ATACADAO', 'supermercado', 'Atacadão'],
  ['PAO DE ACUCAR', 'supermercado', 'Pão de Açúcar'],
  ['DROGA', 'farmacia'], ['FARMACIA', 'farmacia'], ['RAIA', 'farmacia', 'Droga Raia'],
  ['RESTAURANTE', 'restaurantes'], ['LANCHONETE', 'restaurantes'], ['PADARIA', 'alimentacao'],
  ['MCDONALDS', 'restaurantes', "McDonald's"], ['BURGER KING', 'restaurantes', 'Burger King'],
  ['ENEL', 'energia', 'Enel'], ['CEMIG', 'energia', 'Cemig'], ['SABESP', 'agua', 'Sabesp'],
  ['VIVO', 'telefonia', 'Vivo'], ['CLARO', 'telefonia', 'Claro'],
  ['ALUGUEL', 'moradia'], ['CONDOMINIO', 'moradia'], ['ESCOLA', 'educacao'], ['UDEMY', 'educacao', 'Udemy'],
  ['SEGURO', 'seguros'], ['IOF', 'tarifas', 'IOF'], ['TARIFA', 'tarifas'], ['ANUIDADE', 'tarifas'],
  ['JUROS', 'juros'], ['MULTA', 'juros'], ['ENCARGO', 'juros'], ['EMPRESTIMO', 'emprestimos'],
  ['SALARIO', 'salario'], ['PROVENTOS', 'salario'],
  ['APLICACAO', 'investimentos'], ['RESGATE', 'investimentos'], ['CDB', 'investimentos'], ['TESOURO', 'investimentos'],
  ['RENNER', 'vestuario', 'Renner'], ['RIACHUELO', 'vestuario', 'Riachuelo'],
  ['CINEMA', 'entretenimento'], ['INGRESSO', 'entretenimento'],
  ['HOTEL', 'viagens'], ['AIRBNB', 'viagens', 'Airbnb'], ['LATAM', 'viagens', 'LATAM'],
]

/** Prioridade: padrões mais longos (mais específicos) vencem; regras de usuário usam ≥ 1000. */
export const DEFAULT_RULES: CategorizationRule[] = RULES.map(([pattern, categoryId, merchant], i) => ({
  id: `default_${i}`,
  pattern,
  matchType: 'contains',
  categoryId,
  merchantName: merchant ?? null,
  priority: pattern.length,
  enabled: true,
}))
