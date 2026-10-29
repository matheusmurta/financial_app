# Regras financeiras

- Sinal interno: entrada de dinheiro positiva, saída negativa. Na fatura, valores positivos (compras) são convertidos para negativos.
- **Receita efetiva**: crédito em conta corrente que não é transferência, estorno, pagamento de fatura nem investimento.
- **Despesa (consumo)**: débitos de consumo + compras do cartão; estornos reduzem o total; excluídos pagamento de fatura, transferências e investimentos.
- **Despesa (caixa)**: débitos da conta corrente (inclui fatura), exceto transferências marcadas.
- Meses sem arquivo **não** são tratados como zero.
- Saldo "conhecido" = último saldo presente no extrato, nunca estimado. O campo "Saldo" do cabeçalho é guardado como "informado".
- Saldos inconsistentes são reportados, nunca corrigidos.
- Parcelas só são consideradas quando explícitas (ex.: `02/10`).
- Recorrência: mesmo estabelecimento, intervalo regular (≈7/30/365 dias, ≥60% dos intervalos) e valores ±15% da mediana.
- Anomalia de valor: > mediana + 5×MAD e > 2,5× mediana da categoria (≥5 amostras). Nunca declarada fraude.
- Previsão do mês: ritmo diário ponderado pela fração do mês decorrida + média dos meses anteriores; com menos de 2 meses, confiança baixa.
- Duplicidade: mesma conta, data, valor e descrição normalizada já existentes; repetições dentro do mesmo arquivo são legítimas.
