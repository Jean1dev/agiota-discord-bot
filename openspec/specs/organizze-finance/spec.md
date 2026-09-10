# organizze-finance Specification

## Purpose

Concentra no bot a leitura da API oficial do Organizze, o cálculo de juros RecargaPay e alimentação, e a persistência local de transações e snapshots mensais no Mongo.

## Requirements

### Requirement: Expense categories come from the official Organizze API
The system MUST load categories from the official Organizze REST API. Expense categories MUST be those whose `kind` is `expenses`. The system MUST NOT read categories from the retired Clojure service.

#### Scenario: Expense categories listed
- **WHEN** the bot requests expense categories
- **THEN** the result is the official API category list filtered to `kind` equal to `expenses`

#### Scenario: Official API unavailable for categories
- **WHEN** the official API fails while loading categories
- **THEN** the operation fails without falling back to the Clojure service

### Requirement: Weekend transactions persist only in Mongo
The system MUST persist a created transaction in Mongo with description, optional notes, official `category_id`, `amount_cents`, and the date in `America/Sao_Paulo`. The system MUST NOT create that transaction on the official Organizze API.

#### Scenario: Transaction stored locally
- **WHEN** the weekend report creates a categorized transaction
- **THEN** a document is inserted into the local transactions collection and the official Organizze API is not called with a write

### Requirement: Current-month RecargaPay interest from official transactions
The system MUST compute monthly interest from official Organizze transactions for the current year and month in `America/Sao_Paulo`. Only expenses (`amount_cents` less than zero) whose description matches `RECARGAPAY` case-insensitively MUST be included. Interest for each included transaction MUST be 4 percent of the absolute `amount_cents`, truncated to an integer number of cents. The response MUST include total interest in cents and BRL, year, month, and per-transaction items with id, description, date, `amount_cents`, and `interest_cents`.

#### Scenario: RecargaPay expenses in the current month
- **WHEN** interest is requested and the official API returns RecargaPay expenses in the current Sao Paulo month plus other transactions
- **THEN** only those RecargaPay expenses are included and the total interest is the sum of 4 percent of each absolute amount in cents

#### Scenario: No matching transactions
- **WHEN** interest is requested and no RecargaPay expenses exist in the current Sao Paulo month
- **THEN** the total interest is zero cents and the items list is empty

### Requirement: Current-month food spending from official data
The system MUST compute food spending from official categories and transactions for the current year and month in `America/Sao_Paulo`. Included category names MUST be exactly `Bares e restaurantes`, `Alimentação`, `Meu Almoco`, and `Mercado`. Only expenses (`amount_cents` less than zero) in those categories and in the current Sao Paulo month MUST be included. The total MUST be the sum of the absolute `amount_cents`. The response MUST include total in cents and BRL, year, month, and items with id, description, date, `amount_cents`, and `category_id`.

#### Scenario: Food expenses in the current month
- **WHEN** food spending is requested and official data includes food-category expenses in the current Sao Paulo month plus non-food or other-month transactions
- **THEN** only the current-month food expenses are included and the total is the sum of their absolute amounts in cents

#### Scenario: No food expenses
- **WHEN** food spending is requested and no matching expenses exist in the current Sao Paulo month
- **THEN** the total is zero cents and the items list is empty

### Requirement: Monthly snapshots upsert by year and month
When interest or food spending is saved, the system MUST upsert a Mongo document keyed by `year` and `month` with `amount_cents`. A second save for the same year and month MUST replace the previous amount. The system MUST NOT append a second document for the same competence. Historical rows in the Heroku Postgres MUST NOT be imported.

#### Scenario: First save of the month
- **WHEN** interest or food spending is saved for a year and month with no existing snapshot
- **THEN** a new snapshot document is stored with that `amount_cents`

#### Scenario: Repeat save of the same month
- **WHEN** interest or food spending is saved again for the same year and month
- **THEN** the existing snapshot is updated to the new `amount_cents` and only one document remains for that competence

### Requirement: Monthly summary reads Mongo snapshots
The system MUST build the monthly summary from Mongo snapshots, not from the official API and not from the Clojure service. When year and month are provided, the result MUST include that competence with `interest_cents` and `food_spending_cents` set to the stored amounts or null when a snapshot is missing. When year and month are omitted, the result MUST cover the last six months in `America/Sao_Paulo` inclusive of the current month, including only competences that have at least one snapshot.

#### Scenario: Summary for a month with both snapshots
- **WHEN** the monthly summary is requested for a year and month that have interest and food snapshots
- **THEN** the entry for that competence contains both stored cent amounts

#### Scenario: Summary for a month with no snapshots
- **WHEN** the monthly summary is requested for a year and month with no Mongo snapshots
- **THEN** the entry has `interest_cents` and `food_spending_cents` as null

#### Scenario: Default window
- **WHEN** the monthly summary is requested without year or month
- **THEN** the result is limited to snapshots in the last six Sao Paulo months

### Requirement: Official API credentials from environment
The system MUST obtain official Organizze base URL and authentication from environment configuration. If required credentials are missing when an official API call is attempted, the operation MUST fail with a clear error. The system MUST NOT call the retired Clojure Heroku URL.

#### Scenario: Missing credentials
- **WHEN** an official Organizze read is attempted and required credentials are not configured
- **THEN** the operation fails without contacting the official API or the Clojure service

#### Scenario: No Clojure BFF
- **WHEN** any Organizze finance operation runs
- **THEN** no HTTP request is made to the retired `organizze-service` Heroku host
