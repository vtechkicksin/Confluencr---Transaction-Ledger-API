# Transaction Ledger API

A backend API for managing accounts, processing credit and debit transactions, tracking balances, retrieving paginated transaction history, and transferring money between accounts, with data consistency and atomic updates.

**Stack:** Node.js · Express 5 · TypeScript · SQLite (built-in `node:sqlite`) · Zod · Swagger UI

## Run it locally

**Requirements:** Node.js **22.5 or newer** (`node -v`). Nothing else: no database server, no Docker, no `.env`.

```bash
npm install
npm start
```

The API is now at **http://localhost:3000** and interactive docs (Swagger UI, can send requests) at **http://localhost:3000/api-docs**.

The SQLite database file is created automatically at `data/ledger.db` on first start (schema included). Delete the `data/` folder to reset all data.

| Variable  | Default          | Purpose                                   |
|-----------|------------------|-------------------------------------------|
| `PORT`    | `3000`           | HTTP port                                 |
| `DB_PATH` | `data/ledger.db` | SQLite file (`:memory:` for a throwaway DB) |

Other scripts: `npm run dev` (restart on change), `npm run typecheck`.

> **Why SQLite?** It is a real relational database (constraints, foreign keys, ACID transactions) that runs inside the app, so a reviewer needs no setup. The schema and SQL are standard and would move to PostgreSQL with minor changes.

## Quick walkthrough (curl)

```bash
# 1. Create two accounts (copy the returned ids)
curl -s -X POST localhost:3000/api/accounts -H 'content-type: application/json' -d '{"name":"Alice"}'
curl -s -X POST localhost:3000/api/accounts -H 'content-type: application/json' -d '{"name":"Bob"}'

ALICE=<alice-id>; BOB=<bob-id>

# 2. Credit, then debit
curl -s -X POST localhost:3000/api/accounts/$ALICE/transactions -H 'content-type: application/json' \
  -d '{"type":"credit","amount":100,"reference_id":"ref-1","description":"Deposit"}'
curl -s -X POST localhost:3000/api/accounts/$ALICE/transactions -H 'content-type: application/json' \
  -d '{"type":"debit","amount":30,"reference_id":"ref-2"}'

# 3. Same reference_id again -> 200 "Transaction already exists", balance unchanged
curl -s -X POST localhost:3000/api/accounts/$ALICE/transactions -H 'content-type: application/json' \
  -d '{"type":"debit","amount":30,"reference_id":"ref-2"}'

# 4. Balance and history
curl -s localhost:3000/api/accounts/$ALICE/balance
curl -s "localhost:3000/api/accounts/$ALICE/transactions?type=debit&page=1&limit=5"

# 5. Transfer 30 from Alice to Bob
curl -s -X POST localhost:3000/api/transfers -H 'content-type: application/json' \
  -d "{\"from_account_id\":\"$ALICE\",\"to_account_id\":\"$BOB\",\"amount\":30,\"reference_id\":\"trf-1\"}"
```

## API documentation

Base URL: `http://localhost:3000/api`. All bodies are JSON. Amounts are decimals with at most 2 decimal places. IDs are UUIDs. Timestamps are ISO 8601 (UTC).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/accounts` | Create an account |
| GET | `/accounts/:accountId` | Get an account |
| GET | `/accounts/:accountId/balance` | Get the current balance |
| POST | `/accounts/:accountId/transactions` | Add a credit or debit |
| GET | `/accounts/:accountId/transactions` | Transaction history (filter, paginate) |
| GET | `/accounts/:accountId/transactions/:transactionId` | Get one transaction |
| POST | `/transfers` | Transfer between two accounts (bonus) |
| GET | `/health` | Health check |

### POST `/accounts`
```json
{ "name": "Alice" }
```
`201`:
```json
{ "message": "Account created",
  "data": { "id": "…uuid…", "name": "Alice", "balance": 0, "created_at": "2026-10-28T12:00:00.000Z" } }
```
`balance` cannot be supplied: any unknown field (including `balance`) is rejected with `400`.

### POST `/accounts/:accountId/transactions`
```json
{ "type": "credit", "amount": 50.25, "reference_id": "ref-1", "description": "Salary" }
```
`type` (`credit` | `debit`), `amount` (> 0) and `reference_id` are required; `description` is optional.

| Outcome | Status |
|---------|--------|
| Created | `201` `{ "message": "Transaction created", "duplicate": false, "data": {…} }` |
| `reference_id` already used on this account | `200` `{ "message": "Transaction already exists", "duplicate": true, "data": {original transaction} }`: nothing created, balance unchanged |
| Debit exceeds balance | `422` `INSUFFICIENT_BALANCE` |
| Invalid body / id | `400` `VALIDATION_ERROR` |
| Account does not exist | `404` `NOT_FOUND` |

The same `reference_id` may be used on different accounts.

### GET `/accounts/:accountId/balance`
`200`: `{ "data": { "account_id": "…", "balance": 100 } }`; `404` if the account does not exist; `400` if the id is not a UUID.

### GET `/accounts/:accountId/transactions`
Query parameters (all optional):

| Param | Default | Rules |
|-------|---------|-------|
| `type` | both | `credit` or `debit` |
| `page` | `1` | positive integer |
| `limit` | `10` | integer 1–100 |

Results are **latest first** (`created_at` descending). `200`:
```json
{ "data": [ { "id": "…", "account_id": "…", "type": "debit", "amount": 30, "description": "", "reference_id": "ref-2", "created_at": "…" } ],
  "pagination": { "current_page": 1, "page_size": 10, "total_records": 2, "total_pages": 1 } }
```
A page beyond the last returns an empty `data` array with the correct totals.

### POST `/transfers` (bonus)
```json
{ "from_account_id": "…", "to_account_id": "…", "amount": 30, "reference_id": "trf-1", "description": "Rent" }
```
`201` returns the transfer plus `from_account_balance` and `to_account_balance` after the move. Errors: `404` (either account missing), `422` (insufficient balance in source), `400` (validation, or same source and destination). A repeated `reference_id` from the same source account returns `200` with the original transfer and moves no money again. Each transfer records one debit and one credit transaction (visible in both accounts' history).

### Immutability
There are no update or delete endpoints. `PUT`, `PATCH` and `DELETE` on transaction URLs return `405 METHOD_NOT_ALLOWED`.

### Error format
Every error has the same shape:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request data",
             "details": [ { "field": "amount", "message": "amount must be greater than 0" } ] } }
```

| HTTP | `code` | When |
|------|--------|------|
| 400 | `VALIDATION_ERROR` | Missing/invalid fields, invalid type or amount, bad UUID, bad pagination, unknown fields |
| 400 | `INVALID_REQUEST_BODY` | Body is not valid JSON |
| 404 | `NOT_FOUND` | Account / transaction / route not found |
| 405 | `METHOD_NOT_ALLOWED` | Attempt to modify or delete a transaction |
| 422 | `INSUFFICIENT_BALANCE` | Debit or transfer larger than the balance |
| 500 | `INTERNAL_ERROR` | Unexpected error (details are logged, not returned) |

## Project structure

```
src/
├── server.ts            starts the server
├── app.ts               builds the Express app (middleware, routes, error handling)
├── config/              config, SQLite connection + transaction helper, schema
├── routes/              URL → controller mapping only
├── controllers/         HTTP layer: read request, call service, send response
├── validators/          Zod request validation, one class per resource
├── services/            business rules (balance checks, duplicates, atomicity)
├── repositories/        SQL only
├── errors/              AppError and subclasses → consistent HTTP errors
├── middlewares/         central error handler
├── utils/               money conversion, response presenter
├── docs/                OpenAPI spec served by Swagger UI
└── types/
```

Request flow: **route → controller → validator → service → repository → database**. Every class uses static methods, with no constructors or hidden state.

## How data integrity is guaranteed

- **Atomicity:** inserting a transaction and updating the balance run inside one SQLite transaction (`BEGIN IMMEDIATE … COMMIT/ROLLBACK`). Any failure rolls both back. Transfers do the same for four writes (two transactions, two balances), so a partial transfer is impossible. `BEGIN IMMEDIATE` takes the write lock first, so concurrent requests cannot act on a stale balance.
- **Balance consistency:** the balance is only ever changed together with the matching transaction row, and rejected requests change nothing.
- **Database constraints** (enforced even outside the application):
  - `UNIQUE (account_id, reference_id)`: no duplicate transactions per account
  - `CHECK (amount > 0)`, `CHECK (type IN ('credit','debit'))`, `CHECK (balance >= 0)`
  - foreign keys from transactions and transfers to accounts
  - triggers that **abort any UPDATE or DELETE** on `transactions` (immutability)
- **Exact money arithmetic:** amounts are stored as integer minor units (paise/cents), never floats. The API converts to and from decimals.

## Assumptions

1. **Single currency**, no currency field. Amounts have at most 2 decimal places and must not exceed 1,000,000,000.
2. **Duplicate `reference_id` is idempotent**, not an error: it returns `200` with the original transaction so safe client retries work. The incoming `type`/`amount` are not compared with the original; the original always wins.
3. **Accounts cannot overdraw**: balance never goes below 0 (enforced in code and by a DB `CHECK`).
4. **Accounts can't be updated or deleted**, since the assignment doesn't ask for it. The name is fixed after creation.
5. **IDs are server-generated UUIDs.** A malformed id returns `400`; a well-formed id that doesn't exist returns `404`.
6. **Unknown JSON fields are rejected** (`400`) rather than silently ignored, which is how a client-supplied `balance` is refused.
7. **No authentication or authorization**, since it is out of scope. Anyone with the URL can use every endpoint.
8. **Transfers** require a `reference_id` (unique per source account) so they are idempotent too. Transfer legs appear in each account's history as ordinary transactions with generated references (`transfer:<id>:debit|credit`).
9. **History ordering** is `created_at` descending, with insertion order as the tie-breaker for transactions created in the same millisecond.
10. **SQLite scales to a single node.** For multi-instance production use, swap in PostgreSQL and use row-level locks (`SELECT … FOR UPDATE`) in place of SQLite's database-level write lock.
