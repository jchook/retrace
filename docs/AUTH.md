Perfect — below is a concise, engineering-ready **Auth PRD** for your Retrace MVP, incorporating everything we’ve decided:
email + OTP login, long-lived API tokens, Postgres 18 `uuidv7()` IDs, and opaque token verification.

---

# 🧭 **Retrace Authentication – MVP PRD**

## 1. Purpose

Provide a minimal, secure authentication layer for **Retrace** that supports:

* Password-less login via **email + 6-digit OTP**.
* Long-lived **API tokens** for browser extensions and CLIs.
* Simple revocation, no JWT complexity.
* PostgreSQL 18+ native `uuidv7()` IDs.

This system must work for both a single-user self-hosted setup and a multi-user public deployment.

---

## 2. Core Entities

| Table          | Purpose                            | Lifetime     |
| -------------- | ---------------------------------- | ------------ |
| **users**      | Canonical user identities (email). | Permanent    |
| **user_otps**  | One-time 6-digit login codes.      | Minutes      |
| **api_tokens** | Long-lived opaque credentials.     | Weeks–Months |

---

## 3. Authentication Flows

### 3.1. Email + OTP Login

1. **Request OTP**

   * Endpoint: `POST /auth/request-otp`
   * Input: `{ "email": "user@example.com" }`
   * Backend creates or finds user, generates random 6-digit code.
   * Hash code (SHA-256), insert into `user_otps`.
   * Send email via configured SMTP provider.
2. **Verify OTP**

   * Endpoint: `POST /auth/verify-otp`
   * Input: `{ "email": "user@example.com", "code": "123456" }`
   * Check latest unused OTP where `expiresAt > now()`.
   * Mark `used=true` on success.
   * Create session cookie or short-lived bearer token (for web).

### 3.2. API Token

1. **Create Token**

   * Endpoint: `POST /auth/api-tokens`
   * Auth: valid web session.
   * Input: `{ "name": "Browser Extension" }`
   * Server generates random 32-byte string, hashes it (SHA-256), stores in `api_tokens`.
   * Returns raw token once; client stores it.
2. **Use Token**

   * Header: `Authorization: Bearer <token>`
   * Backend hashes incoming token, looks up record where `revoked=false` and `expiresAt > now()`.
   * Attaches `userId` to request context.
3. **Revoke Token**

   * Endpoint: `DELETE /auth/api-tokens/:id`
   * Marks record `revoked=true`.

---

## 4. Data Model (Drizzle Schema)

```ts
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  email: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const userOtps = pgTable("user_otps", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  userId: uuid().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  used: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const apiTokens = pgTable("api_tokens", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  userId: uuid().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text().notNull(),
  name: text(),             // "Safari extension", "CLI"
  scope: text().array(),
  expiresAt: timestamp({ withTimezone: true }),
  lastUsedAt: timestamp({ withTimezone: true }),
  revoked: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});
```

---

## 5. Security Considerations

| Aspect        | Practice                                                           |
| ------------- | ------------------------------------------------------------------ |
| OTP storage   | Hash 6-digit code with SHA-256 before DB insert.                   |
| Token storage | Hash token string before DB insert.                                |
| Expiry        | OTPs expire after 10 min; tokens configurable (default = 90 days). |
| Revocation    | Immediate via `revoked=true`.                                      |
| Transport     | Always via HTTPS / TLS.                                            |
| Brute-force   | Limit OTP requests per email/IP.                                   |
| Logging       | Never log raw tokens or codes.                                     |

---

## 6. API Endpoints (Summary)

| Method   | Path                   | Description                 | Auth    |
| -------- | ---------------------- | --------------------------- | ------- |
| `POST`   | `/auth/request-otp`    | Send OTP to user            | —       |
| `POST`   | `/auth/verify-otp`     | Verify OTP & create session | —       |
| `POST`   | `/auth/api-tokens`     | Create new API token        | session |
| `GET`    | `/auth/api-tokens`     | List tokens                 | session |
| `DELETE` | `/auth/api-tokens/:id` | Revoke token                | session |

---

## 7. Request Validation (Zod)

* 6-digit OTP: `/^[0-9]{6}$/`
* Email: standard RFC 5321 regex or `z.string().email()`.
* Token name: optional, ≤ 100 chars.

---

## 8. Success Criteria

✅ User can request and verify OTP login.
✅ Authenticated user can create and revoke API tokens.
✅ Bearer token authentication resolves `userId` from DB.
✅ Revoked or expired tokens are denied.
✅ All IDs generated via native Postgres 18 `uuidv7()`.

---

## 9. Future Extensions

| Feature              | Description                                        |
| -------------------- | -------------------------------------------------- |
| Refresh tokens       | For persistent sessions.                           |
| OAuth provider login | Optional alternative to email + OTP.               |
| Rate-limit table     | For brute-force defense.                           |
| JWT upgrade          | For stateless multi-node scaling (optional later). |

---

**Summary:**
Retrace’s MVP authentication uses a clean, two-table credential model — `user_otps` for short-term proofs, `api_tokens` for long-term access — keyed by `users`.
All IDs use Postgres 18 `uuidv7()`, and all secrets are hashed before storage.

