## Why

O bot depende de um BFF Clojure no Heroku (`organizze-core`) para juros RecargaPay, gastos com alimentação, categorias e um ledger local de transações. Esse serviço é um hop extra, usa Postgres separado e só é chamado por este bot. Absorver a fatia usada elimina o deploy Clojure e concentra persistência no Mongo que o bot já tem.

## What Changes

- Substituir o cliente HTTP para `organizze-service-*.herokuapp.com` por lógica in-process no `OrganizzeService`.
- Ler categorias e transações **somente** da API oficial do Organizze (`api.organizze.com.br/rest/v2`).
- Persistir no Mongo: transações criadas pelo relatório de fim de semana e snapshots mensais de juros e alimentação.
- Snapshots mensais com **upsert** por `(year, month)` — reexecutar `$atualizar-gastos` no mesmo mês sobrescreve.
- Usar fuso `America/Sao_Paulo` para o mês corrente (não UTC do Heroku).
- Remover `getCategory` (sem callers) e qualquer chamada ao BFF Clojure.
- **Não** migrar histórico do Postgres Heroku; coleções Mongo começam vazias.
- **Não** portar parcelas, tags, import de categorias, CRUD extra nem escrita na API oficial.

Contrato público das funções já usadas (`getExpensesCategories`, `createTransaction`, `getInterest`, `updateInterest`, `getFoodSpending`, `updateFoodSpending`, `getMonthlySummary`) permanece o mesmo para comandos e jobs.

## Capabilities

### New Capabilities

- `organizze-finance`: leitura da API oficial (categorias e transações), cálculo de juros RecargaPay e alimentação, ledger local de transações e snapshots mensais no Mongo, resumo por competência.

### Modified Capabilities

- (nenhuma)

## Impact

- `src/services/finance/OrganizzeService.ts` deixa de ser um wrapper axios do Heroku.
- Novo cliente HTTP da API oficial (Basic Auth + User-Agent) e funções puras de cálculo portadas do Clojure.
- `src/config/env.ts`: credenciais Organizze (`ORGANIZZE_API_BASE_URL`, username, Basic Auth).
- Mongo no banco `agiobot`: coleções `organizze_transactions`, `organizze_monthly_interest`, `organizze_monthly_food_spending`.
- Callers (`DailyBudgetService`, `$atualizar-gastos`, `MonthlyMarketReportJob`) não mudam de contrato; testes do service e jobs precisam mockar o cliente oficial / Mongo em vez do Heroku.
- Deploy: secrets da API oficial no ambiente do bot. O app Clojure no Heroku e o Postgres dele ficam como estão (fora de escopo).
