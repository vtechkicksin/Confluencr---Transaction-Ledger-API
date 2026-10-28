const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const accountIdParam = {
  name: "accountId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Transaction Ledger API",
    version: "1.0.0",
    description:
      "Accounts, credit/debit transactions, balances, paginated history and atomic transfers. " +
      "Amounts are decimals with at most 2 decimal places.",
  },
  servers: [{ url: "/api" }],
  tags: [{ name: "Accounts" }, { name: "Transactions" }, { name: "Transfers" }],
  paths: {
    "/accounts": {
      post: {
        tags: ["Accounts"],
        summary: "Create an account (balance always starts at 0)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                additionalProperties: false,
                properties: { name: { type: "string", example: "Alice" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { $ref: "#/components/schemas/Account" },
                  },
                },
              },
            },
          },
          "400": errorResponse("Validation error (missing name, unknown field such as balance)"),
        },
      },
    },
    "/accounts/{accountId}": {
      get: {
        tags: ["Accounts"],
        summary: "Get an account",
        parameters: [accountIdParam],
        responses: {
          "200": {
            description: "Account",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Account" } },
                },
              },
            },
          },
          "400": errorResponse("Invalid account id"),
          "404": errorResponse("Account not found"),
        },
      },
    },
    "/accounts/{accountId}/balance": {
      get: {
        tags: ["Accounts"],
        summary: "Get current balance",
        parameters: [accountIdParam],
        responses: {
          "200": {
            description: "Balance",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        account_id: { type: "string", format: "uuid" },
                        balance: { type: "number", example: 100 },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid account id"),
          "404": errorResponse("Account not found"),
        },
      },
    },
    "/accounts/{accountId}/transactions": {
      post: {
        tags: ["Transactions"],
        summary: "Add a credit or debit transaction",
        description:
          "Idempotent per account on reference_id: re-sending the same reference_id creates nothing, " +
          "leaves the balance unchanged and returns 200 with the original transaction.",
        parameters: [accountIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "amount", "reference_id"],
                additionalProperties: false,
                properties: {
                  type: { type: "string", enum: ["credit", "debit"] },
                  amount: { type: "number", exclusiveMinimum: 0, example: 50.25 },
                  description: { type: "string", example: "Salary" },
                  reference_id: { type: "string", example: "txn-001" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Transaction created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionResponse" } } },
          },
          "200": {
            description: "Duplicate reference_id: existing transaction returned, balance unchanged",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionResponse" } } },
          },
          "400": errorResponse("Validation error"),
          "404": errorResponse("Account not found"),
          "422": errorResponse("Insufficient balance"),
        },
      },
      get: {
        tags: ["Transactions"],
        summary: "Transaction history (latest first)",
        parameters: [
          accountIdParam,
          { name: "type", in: "query", schema: { type: "string", enum: ["credit", "debit"] } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          "200": {
            description: "Page of transactions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Transaction" } },
                    pagination: {
                      type: "object",
                      properties: {
                        current_page: { type: "integer" },
                        page_size: { type: "integer" },
                        total_records: { type: "integer" },
                        total_pages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid pagination or filter parameters"),
          "404": errorResponse("Account not found"),
        },
      },
    },
    "/accounts/{accountId}/transactions/{transactionId}": {
      get: {
        tags: ["Transactions"],
        summary: "Get one transaction",
        description: "PUT, PATCH and DELETE are rejected with 405: transactions are immutable.",
        parameters: [
          accountIdParam,
          { name: "transactionId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Transaction",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionResponse" } } },
          },
          "404": errorResponse("Account or transaction not found"),
          "405": errorResponse("Transactions cannot be modified or deleted"),
        },
      },
    },
    "/transfers": {
      post: {
        tags: ["Transfers"],
        summary: "Transfer money between two accounts (atomic)",
        description:
          "Debits the source and credits the destination in a single database transaction. " +
          "reference_id is unique per source account; a repeat returns 200 with the original transfer.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["from_account_id", "to_account_id", "amount", "reference_id"],
                additionalProperties: false,
                properties: {
                  from_account_id: { type: "string", format: "uuid" },
                  to_account_id: { type: "string", format: "uuid" },
                  amount: { type: "number", exclusiveMinimum: 0, example: 30 },
                  description: { type: "string" },
                  reference_id: { type: "string", example: "trf-001" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Transfer completed" },
          "200": { description: "Duplicate reference_id: original transfer returned" },
          "400": errorResponse("Validation error"),
          "404": errorResponse("Source or destination account not found"),
          "422": errorResponse("Insufficient balance in source account"),
        },
      },
    },
  },
  components: {
    schemas: {
      Account: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          balance: { type: "number" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          account_id: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["credit", "debit"] },
          amount: { type: "number" },
          description: { type: "string" },
          reference_id: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      TransactionResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          duplicate: { type: "boolean" },
          data: { $ref: "#/components/schemas/Transaction" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "INSUFFICIENT_BALANCE" },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: { field: { type: "string" }, message: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  },
};
