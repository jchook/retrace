Perfect — updated to the unified token model per the addendum.

---

# 🧭 **Retrace Authentication – Unified Token PRD (MVP)**

## 1. Purpose

Provide a **minimal, password-less authentication system** for Retrace that supports:

* **Email + OTP** login for users (short-lived tokens).
* **API tokens** for browser extensions and CLI (long-lived).
* Immediate OTP deletion on use — no lingering single-use tokens.
* Single unified table (`auth_tokens`) with typed `kind` field.
* Native PostgreSQL 17 `gen_random_uuid()` IDs for now.

---

## 2. Core Concepts

| Entity          | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| **users**       | Permanent identity records (email, metadata).                      |
| **auth_tokens** | All credentials — OTPs, API tokens, etc. Differentiated by `kind`. |

---

## 3. Authentication Flows

### 3.1. Email + OTP (Password-less Login)

**Request OTP**

* Endpoint: `POST /auth/request-otp`
* Input: `{ "email": "user@example.com" }`
* Steps:

  1. Create or find user.
  2. Generate 6-digit code.
  3. Hash code → insert into `auth_tokens` with `kind='login'` and `expiresAt = now() + 10 min`.
  4. Send email.

**Verify OTP**

* Endpoint: `POST /auth/verify-otp`
* Input: `{ "email": "user@example.com", "code": "123456" }`
* Steps:

  1. Hash provided code.
  2. Look up active `auth_tokens` where `kind='login'`, `expiresAt > now()`.
  3. On success: delete that row (`DELETE FROM auth_tokens WHERE id=?`).
  4. Create a short-lived session or issue an API token.

Result: OTPs are single-use and leave no residue.

---

### 3.2. API Tokens

**Create Token**

* Endpoint: `POST /auth/api-tokens`
* Auth: verified session.
* Input: `{ "name": "Browser Extension" }`
* Steps:

  1. Generate random 32-byte string.
  2. Hash → store in `auth_tokens` with `kind='api'`, `expiresAt = now() + 90 days`.
  3. Return raw token once to client.

**Use Token**

* Header: `Authorization: Bearer <token>`
* Steps:

  1. Hash incoming token.
  2. Lookup valid non-revoked `auth_tokens.kind='api'`.
  3. Attach `userId` to request context.

**Revoke Token**

* Endpoint: `DELETE /auth/api-tokens/:id` → `revoked=true`.

---

## 4. Data Model (Drizzle Schema)

```ts
import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const authTokenKind = pgEnum("auth_token_kind", ["login", "api", "verify"]);

export const users = pgTable("users", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  email: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const authTokens = pgTable("auth_tokens", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: authTokenKind().notNull(),

  tokenHash: text().notNull(),   // SHA-256 of code or token
  name: text(),                  // optional (API tokens)
  scope: text().array(),         // optional

  revoked: boolean().notNull().default(false),
  revokedAt: timestamp({ withTimezone: true }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  lastUsedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});
```

---

## 5. Cleanup & Lifecycle

OTPs are deleted immediately on use

---

## 6. Security Guidelines

| Concern           | Practice                                            |
| ----------------- | --------------------------------------------------- |
| **Token secrecy** | Store only hashes (`sha256`). Never log raw values. |
| **Expiry**        | OTP = 10 min, API = 90 days (default).              |
| **Transport**     | HTTPS only.                                         |
| **Rate limits**   | Enforce per-email and per-IP on OTP requests.       |
| **Entropy**       | API tokens ≥ 32 bytes random.                       |
| **Auditing**      | Log login events separately if needed.              |

---

## 7. Endpoints Summary

 | Method   | Path                   | Description                   | Auth    |
 |----------|------------------------|-------------------------------|---------|
 | `POST`   | `/auth/email-otp`      | Send OTP to email             | —       |
 | `POST`   | `/auth/login`          | Verify OTP and create session | —       |
 | `POST`   | `/auth/api-tokens`     | Create API token              | Session |
 | `GET`    | `/auth/api-tokens`     | List user tokens              | Session |
 | `DELETE` | `/auth/api-tokens/:id` | Revoke token                  | Session |

---

## 8. Success Criteria

✅ Users can sign in via email + OTP.
✅ OTPs are deleted on successful verification.
✅ API tokens work for browser/CLI with `Bearer` header.
✅ Deleted, revoked, or expired tokens are denied.
✅ All IDs generated via `gen_random_uuid()`.
✅ Hourly cleanup leaves DB in steady state.

---

**Summary:**
Retrace Auth MVP uses a **single `auth_tokens` table** keyed by `kind`, unifying OTP and API tokens under one schema.
OTPs are deleted on use, tokens are hashed, and cleanup is trivial.
Simple, secure, and aligned with the small‑data, local‑first Retrace philosophy.
