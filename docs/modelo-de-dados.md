# Modelo de dados

Definido em `src/types/index.ts`. Persistido como um único objeto `AppData` na chave `clareza-financeira:data`, versão `schemaVersion` (migrações em `services/storage/storage.ts`).

Entidades: `ImportBatch`, `FinancialAccount`, `Transaction` (valores em `amountInCents`, `rawSourceRow` para auditoria, `userEdited` protege correções manuais), `Category`, `CategorizationRule`, `Budget`, `FinancialGoal`, `Insight` (gerado em tempo de execução, não persistido), `SavedFilter`, `ComparisonScenario`, `AppSettings`.

O CSV completo não é armazenado — apenas as linhas normalizadas, a linha original de cada transação e os metadados.
