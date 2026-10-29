/** Fixtures 100% sintéticas — nenhum dado financeiro real. */
export const CARD_CSV = [
  'Data;Lançamento;Categoria;Tipo;Valor',
  '31/03/2026;AMAZONMKTPLC*GRUPOMULT;OUTROS;Compra à vista;R$ 864,90',
  '15/03/2026;IFD*RESTAURANTE EXEMPLO;RESTAURANTE;Compra à vista;R$\u00A045,50',
  '10/03/2026;"LOJA; COM PONTO E VIRGULA";VESTUARIO;Compra parcelada;R$ 1.200,00',
  '12/03/2026;LOJA X PARC 02/10;OUTROS;Parcela;R$ 99,99',
  '20/03/2026;ESTORNO AMAZON;OUTROS;Estorno;-R$ 50,00',
  '25/03/2026;PAGAMENTO RECEBIDO;;Pagamento;-R$ 2.000,00',
  '32/03/2026;DATA INVALIDA;OUTROS;Compra à vista;R$ 10,00',
  '01/03/2026;VALOR INVALIDO;OUTROS;Compra à vista;abc',
].join('\n')

export const CHECKING_CSV = [
  'Extrato Conta Corrente',
  'Conta;XXXXXXXXX',
  'Período;01/03/2026 a 31/03/2026',
  'Saldo:;2,05',
  '',
  'Data Lançamento;Descrição;Valor;Saldo',
  '01/03/2026;"Pix recebido: Cp :123-Empresa Exemplo";5.000,00;5.009,92',
  '05/03/2026;"Pix enviado: Cp :10573521-PIX Marketplace";-127,73;4.882,19',
  '10/03/2026;Pagamento de fatura cartão;-2.000,00;2.882,19',
  '15/03/2026;Tarifa pacote serviços;-35,00;2.847,19',
].join('\n')

export const CARD_CSV_COMMA = [
  'Data,Lançamento,Categoria,Tipo,Valor',
  '02/04/2026,NETFLIX.COM,SERVICOS,Compra à vista,"R$ 55,90"',
  '03/04/2026,"UBER, TRIP",TRANSPORTE,Compra à vista,"R$ 23,40"',
].join('\n')

export const enc = (s: string) => new TextEncoder().encode(s)
/** Codifica em Windows-1252 (apenas Latin-1 para os testes). */
export const encLatin1 = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff))
