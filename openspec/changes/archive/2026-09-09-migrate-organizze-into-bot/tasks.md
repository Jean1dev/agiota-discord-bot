## 1. Environment and official API client

- [x] 1.1 Add `ORGANIZZE_API_BASE_URL` (default `https://api.organizze.com.br/rest/v2`), `ORGANIZZE_BASIC_USERNAME`, `ORGANIZZE_BASIC_PASSWORD`, and optional `ORGANIZZE_USER_AGENT` to `src/config/env.ts` and verify `tests/unit/config/env.test.ts` covers missing credentials vs default base URL
- [x] 1.2 Implement an official Organizze HTTP client (Basic Auth + User-Agent, 30s timeout) with `GET /categories` and paginated `GET /transactions` using `start_date`/`end_date`, failing closed when username or password is missing, and verify unit tests mock HTTP and assert no request is made without credentials
- [x] 1.3 Confirm the client never targets `organizze-service` Heroku and verify a repo search in `src/` for that host returns no matches after the service rewrite (task 4)

## 2. Calculation rules

- [x] 2.1 Port RecargaPay interest filters and 4% truncation (`1365` cents → `54` interest cents; case-insensitive `RECARGAPAY`; expenses only; Sao Paulo year/month) and verify unit tests mirror the Clojure cases in `interest_calculation_test.clj`
- [x] 2.2 Port food-spending filters (exact names `Bares e restaurantes`, `Alimentação`, `Meu Almoco`, `Mercado`; expenses only; current Sao Paulo month; absolute sum) and verify unit tests mirror `food_spending_calculation_test.clj`

## 3. Mongo persistence

- [x] 3.1 Persist weekend transactions with `insertOne` into `organizze_transactions` (description, notes, category_id, amount_cents, Sao Paulo date, createdAt) and verify a unit test with a mocked collection asserts insert payload and no official-API write
- [x] 3.2 Upsert `organizze_monthly_interest` and `organizze_monthly_food_spending` on unique `{ year, month }` with `amount_cents`, creating unique indexes if missing, and verify a unit test that saving twice for the same competence leaves a single document with the latest amount
- [x] 3.3 Implement `getMonthlySummary` from those collections (year+month always one entry with nulls when missing; omit params → last six Sao Paulo months, merge keys that exist) and verify unit tests for both snapshots present, both missing, and the six-month window

## 4. Wire `OrganizzeService` and drop the BFF

- [x] 4.1 Replace axios-to-Heroku in `OrganizzeService` with the client, calculators, and Mongo helpers; keep the existing named exports and response shapes; delete `getCategory`; verify TypeScript compile and that `$atualizar-gastos` / `DailyBudgetService` / `MonthlyMarketReportJob` still import the same functions
- [x] 4.2 Ensure `getExpensesCategories` filters official categories by `kind === 'expenses'` and `createTransaction` uses the official category id, and verify existing `UpdateMonthlySpendingCommand` and `MonthlyMarketReportJob` tests still pass against the unchanged export mocks

## 5. Verification

- [x] 5.1 Run `npx jest --testPathPatterns='Organizze|MonthlyMarket|UpdateMonthly|env' --maxWorkers=2 --forceExit` and fix regressions from this change
- [x] 5.2 Document deploy env vars for operators (base URL, basic user/password, optional User-Agent) without committing secrets, and confirm `src/` has no remaining `organizze-service-50474ce67034.herokuapp.com` URL
