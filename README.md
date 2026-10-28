# Transaction Ledger API

A backend API for managing accounts, processing credit and debit transactions, tracking account balances, and retrieving transaction history with data consistency and reliable transaction handling.

**Stack:** Node.js · Express 5 · TypeScript · SQLite (built-in `node:sqlite`) · Zod · Swagger UI

## Run it locally

**Requirements:** Node.js **22.13 or newer** (`node -v`). No database server, Docker or `.env` is needed.

```bash
npm install
npm start
```

- API: **http://localhost:3000/api**
- Swagger UI (try requests in the browser): **http://localhost:3000/api-docs**

The SQLite database file is created automatically at `data/ledger.db` on first start, with the schema. Delete the `data/` folder to reset all data.

> **Why SQLite?** It is a real relational database (constraints, foreign keys, ACID transactions) that runs inside the app, so no setup is needed. The assignment allows any database.

## API documentation

Base URL: `http://localhost:3000/api`. Bodies are JSON. Amounts are decimals with at most 2 decimal places. IDs are UUIDs. Timestamps are ISO 8601 (UTC).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/accounts` | Create an account |
| GET | `/accounts/:accountId/balance` | Get the current balance |
| POST | `/accounts/:accountId/transactions` | Add a credit or debit |
| GET | `/accounts/:accountId/transactions` | Transaction history (filter, paginate) |
| POST | `/transfers` | Transfer between two accounts (bonus) |

### POST `/accounts`
```json
{ "name": "Alice" }
```
`201`:
```json
{ "message": "Account created",
  "data": { "id": "…uuid…", "name": "Alice", "balance": 0, "created_at": "2026-10-28T12:00:00.000Z" } }
```
Unknown fields (including `balance`) are rejected with `400`, so the client cannot set the balance.

### POST `/accounts/:accountId/transactions`
```json
{ "type": "credit", "amount": 50.25, "reference_id": "ref-1", "description": "Salary" }
```
`type` (`credit` | `debit`), `amount` (> 0) and `reference_id` are required; `description` is optional.

| Outcome | Status |
|---------|--------|
| Created | `201` `{ "message": "Transaction created", "data": {…} }` |
| `reference_id` already used on this account | `200` `{ "message": "Transaction already exists", "data": {original transaction} }`. Nothing is created and the balance is unchanged (see Assumption 2 for why this is `200` rather than `409`) |
| Debit exceeds balance | `422` `INSUFFICIENT_BALANCE` |
| Invalid body or account id | `400` `VALIDATION_ERROR` |
| Account does not exist | `404` `NOT_FOUND` |

The same `reference_id` may be used on different accounts.

### GET `/accounts/:accountId/balance`
`200`: `{ "data": { "account_id": "…", "balance": 100 } }`. `404` if the account does not exist; `400` if the id is not a UUID.

### GET `/accounts/:accountId/transactions`

| Query param | Default | Rules |
|-------------|---------|-------|
| `type` | both | `credit` or `debit` |
| `page` | `1` | positive integer |
| `limit` | `10` | positive integer |

Results are latest first (`created_at` descending). `200`:
```json
{ "data": [ { "id": "…", "account_id": "…", "type": "debit", "amount": 30, "description": "", "reference_id": "ref-2", "created_at": "…" } ],
  "pagination": { "current_page": 1, "page_size": 10, "total_records": 2, "total_pages": 1 } }
```

### POST `/transfers` (bonus)
```json
{ "from_account_id": "…", "to_account_id": "…", "amount": 30, "description": "Rent" }
```
`201` returns both resulting transactions and both new balances. Errors: `404` (either account missing), `422` (insufficient balance in the source), `400` (validation, or same source and destination). The debit, the credit and both balance updates happen in one database transaction, so a partial transfer is impossible.

### Immutability
There are no endpoints to update or delete a transaction.

### Error format
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request data",
             "details": [ { "field": "amount", "message": "amount must be greater than 0" } ] } }
```

| HTTP | `code` | When |
|------|--------|------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields, invalid type or amount, bad UUID, bad pagination, unknown fields |
| 400 | `INVALID_REQUEST_BODY` | Body is not valid JSON |
| 404 | `NOT_FOUND` | Account or route not found |
| 422 | `INSUFFICIENT_BALANCE` | Debit or transfer larger than the balance |
| 500 | `INTERNAL_ERROR` | Unexpected error |

## Project structure

```
src/
├── server.ts            starts the server
├── app.ts               builds the Express app
├── config/              config, SQLite connection, schema
├── routes/              URL → controller mapping
├── controllers/         read request, call service, send response
├── validators/          Zod request validation
├── services/            business rules and atomicity
├── repositories/        SQL only
├── errors/              AppError and subclasses
├── middlewares/         central error handler
├── utils/               money conversion, response presenter
├── docs/                OpenAPI spec for Swagger UI
└── types/
```

Request flow: route → controller → validator → service → repository → database. All classes use static methods.

## Data integrity

- **Atomicity:** inserting a transaction and updating the balance run in one SQLite transaction (`BEGIN IMMEDIATE … COMMIT/ROLLBACK`). Any failure rolls both back.
- **Balance consistency:** the balance changes only together with its transaction row; rejected requests change nothing.
- **Database constraints:** `UNIQUE (account_id, reference_id)`, `CHECK (amount > 0)`, `CHECK (type IN ('credit','debit'))`, `CHECK (balance >= 0)`, foreign keys, and triggers that abort any `UPDATE` or `DELETE` on `transactions`.
- **Exact money:** amounts are stored as integer minor units (paise/cents), never floats.

## Assumptions

1. Single currency. Amounts have at most 2 decimal places (minimum 0.01), and an amount or balance that is too large to store exactly is rejected with `400`.
2. **Duplicate transactions return `200`, not `409 Conflict`.** A repeated `reference_id` on the same account creates nothing, leaves the balance unchanged, and returns `200` with the message "Transaction already exists" and the original transaction. Reason: `reference_id` works as an idempotency key. A client that retries after a timeout or network failure cannot tell whether its first request succeeded; returning `200` with the original transaction tells it the request already took effect, so it can carry on rather than handle an error for a payment that actually went through. This is the convention used by payment APIs such as Stripe's idempotency keys. The incoming type and amount are not compared with the original.
3. Balances cannot go below 0.
4. IDs are server-generated UUIDs. A malformed id returns `400`; a well-formed id that doesn't exist returns `404`.
5. Unknown JSON fields are rejected, which is how a client-supplied `balance` is refused.
6. No authentication, as it is out of scope.
7. Each transfer is stored as one debit and one credit transaction (with generated `reference_id`s), so both show up in the accounts' history.
8. SQLite suits a single node. For multi-instance production use, switch to PostgreSQL with row-level locks.
