## Context

See proposal.md for motivation and `specs/organizze-finance/spec.md` for behavior. Today `OrganizzeService` is an axios client to the Clojure BFF on Heroku. That BFF reads `api.organizze.com.br/rest/v2` and writes Postgres. Callers (`DailyBudgetService`, `$atualizar-gastos`, `MonthlyMarketReportJob`) already depend on named exports with stable shapes. The bot already uses `MongoConnection` on database `agiobot` and `nowInSaoPaulo` for local dates.

## Goals / Non-Goals

**Goals:**

- Keep the existing named export surface used by commands and jobs; swap the implementation behind it.
- One official-API HTTP client (Basic Auth + User-Agent) shared by category and transaction reads.
- Pure calculation modules that can be unit-tested without Mongo or HTTP (parity with Clojure 4% RecargaPay and food category names).
- Unique indexes on snapshot collections so upsert by `(year, month)` is enforced.

**Non-Goals:**

- HTTP compatibility with the Clojure routes (no in-process Pedestal replica).
- Writing transactions or categories to Organizze.com.
- Importing Heroku Postgres history.
- Caching categories in Mongo.
- Changing Discord/Telegram UX or job schedules.

## Decisions

### 1. Replace BFF calls inside `OrganizzeService`, do not change callers

- **Choice:** Keep `getCategories`, `getExpensesCategories`, `createTransaction`, `getInterest`, `updateInterest`, `getFoodSpending`, `updateFoodSpending`, `getMonthlySummary` and their TypeScript interfaces. Delete `getCategory`.
- **Why:** Callers already work; the bug to fix is the remote hop, not the command layer.
- **Alternatives:** New module names and a rewrite of `DailyBudgetService` — more churn for the same behavior.

### 2. Official API client with env credentials

- **Choice:** Env vars `ORGANIZZE_API_BASE_URL` (default `https://api.organizze.com.br/rest/v2`), `ORGANIZZE_BASIC_USERNAME`, `ORGANIZZE_BASIC_PASSWORD`, `ORGANIZZE_USER_AGENT` (optional; default to basic username). HTTP Basic Auth plus `User-Agent`, matching the Clojure client. Fail the read if username or password is missing. Timeout in the same 30s band the bot used toward Heroku.
- **Why:** The official API requires both Basic Auth and a User-Agent (typically the account email).
- **Alternatives:** Three Clojure names (`headerUserName`, `basicUsername`, `basicAuthPassword`) — noisier in Node env. Single `ORGANIZZE_TOKEN` header — not what the API expects.

### 3. Date-window reads for interest and food

- **Choice:** `GET /transactions` with `start_date` / `end_date` covering the current `America/Sao_Paulo` month. Categories: `GET /categories` without local cache. If the official API paginates, follow pages until exhausted for that window.
- **Why:** Clojure pulled the entire ledger then filtered in memory; a month window is enough for the specs and avoids timeout as history grows.
- **Alternatives:** Fetch-all like Clojure — simpler, fragile. Persist a category cache — out of scope; live list also fixes `kind === expenses` vs the old local `expense` values.

### 4. Pure ports of Clojure calculation rules

- **Choice:** Standalone functions (same filters and `Math.trunc` / integer truncation as Clojure `long` of `amount * 0.04`). Food names: exact set `Bares e restaurantes`, `Alimentação`, `Meu Almoco`, `Mercado`. Current year/month from Sao Paulo civil date, not `Date#getMonth` in UTC.
- **Why:** Specs require behavioral parity; tests from `organizze-core` translate directly.
- **Alternatives:** Reimplement with rounding instead of truncation — would diverge from 54 cents on 1365.

### 5. Mongo collections and upsert

- **Choice:** `organizze_transactions` (insert-only: description, notes, category_id, amount_cents, date, createdAt). `organizze_monthly_interest` and `organizze_monthly_food_spending` with unique index `{ year: 1, month: 1 }` and `updateOne(..., { upsert: true })` setting `amount_cents` and `updatedAt`.
- **Why:** Unique index makes the upsert spec real; insert-only transactions match “ledger local, no official write”.
- **Alternatives:** Append-only snapshots like Clojure — rejected in exploration. Dedicated Postgres — rejected (Mongo only).

### 6. Monthly summary assembly

- **Choice:** When year+month are passed, always return one entry for that pair (nulls if missing). When omitted, query both snapshot collections for year/month in the last six Sao Paulo months and merge keys that exist in either collection (same shape `{ data: [...] }` the job already consumes).
- **Why:** `MonthlyMarketReportJob` already does `getMonthlySummary(year, month)` then `data.find`. Empty Mongo after cutover means the first end-of-month email shows "—" until `$atualizar-gastos` runs; accepted.

### 7. `createTransaction` category_id is the official id

- **Choice:** `getExpensesCategories` returns official ids; weekend LLM categorization stores that id in Mongo.
- **Why:** No local category table. The old Postgres serial id is gone with the BFF.
- **Alternatives:** Keep a Mongo category cache with local ids — extra sync, import endpoint was explicitly out of scope.

## Risks / Trade-offs

- [Official API pagination or rate limits on a busy month] → Date window + page loop; keep 30s timeout; surface the error to existing command/job catch paths.
- [Food category renamed in Organizze.com] → Totals silently drop that bucket until the name set is updated; names stay hardcoded as in Clojure.
- [First month after cutover has no snapshots] → End-of-month email with em dash; run `$atualizar-gastos` before the last day. No Postgres backfill.
- [Credentials wrong in deploy] → Fail closed on first official read; no Heroku fallback.
- [Weekend `amount_cents` stays positive] → Local ledger only; official interest/food still use negative expenses from Organizze.com. Do not sign-flip unless a later change writes to the official API.
- [`DailyBudgetService` caches categories in memory] → After deploy, first weekend job hits official API; subsequent calls in the same process reuse `state.categories`. Restart refreshes. Acceptable; do not add a TTL in this change.

## Migration Plan

1. Add Organizze env vars to the bot deploy (do not commit secrets).
2. Deploy the in-process implementation. Clojure Heroku app can keep running unused.
3. Smoke: `$atualizar-gastos` (GET calculate + Mongo upsert + email), optional wait for Monday weekend job or invoke the report path in a controlled environment, last-day summary after a snapshot exists.
4. Rollback: previous bot release still points at Heroku; Mongo snapshot collections can be ignored. Do not delete Heroku Postgres.

## Open Questions

None. Pagination details of the official API can be confirmed at implement time without changing specs or this approach.
