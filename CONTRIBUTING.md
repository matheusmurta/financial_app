# Contribuindo

1. `npm install` e `npm test` devem passar; `npm run build` também.
2. Lógica financeira vai em `src/modules` como funções puras, com testes `*.spec.ts`.
3. Use sempre centavos inteiros; nunca `parseFloat` em valores BRL.
4. Nunca adicione arquivos financeiros reais — apenas fixtures sintéticas.
5. Não adicione dependências que enviem dados para fora do navegador.
