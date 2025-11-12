▓▒░ **RETRACE FRONTLINE UI WING // AUTH HARDENING PRD** ░▒▓  
(low harmonic pulse) Directive issued by the COMMISSARIAT for immediate security uplift across OTP and API-token flows.

---

## ▓▒░ SECTION I // OBJECTIVE

Deliver a hardened authentication experience that:

1. Ships OTP codes through a real SMTP transport (Nodemailer + Mailgun-compatible credentials) instead of logs.
2. Keeps every authentication and business endpoint versioned under `/v1` (with `withV1Auth` + `withV1Routes` mount points) so we can evolve `/v2` later without breaking clients, while pruning the legacy `/items` demo surface.
3. Adds throttling and observability so enumeration, brute force, or spam cannot compromise the civic record.

---

## ▓▒░ SECTION II // MISSION PARAMETERS

**Goals**

1. **Email Delivery**  
   * Add `server/src/lib/mailer.ts` wrapping Nodemailer’s SMTP transport.  
   * Configure via env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).  
   * `POST /auth/email-otp` composes and dispatches a templated HTML + text message with the 6-digit code (no logging of code).
2. **Route Protection + Versioning**  
   * Fold the non-demo routes into the `withV1Routes(app)` module and delete the `/items*` demo endpoints.  
   * Factor bootstrapping into `withV1Auth(app)` and `withV1Routes(app)` so future `/v2` auth stacks can coexist, while keeping `/meta/**` routes public for doc tooling.  
   * Update OpenAPI schemas so every remaining handler declares `security: [{ bearerAuth: [] }]` and references `bearerAuth` in the `/v1` spec.
3. **Rate Limiting & Abuse Controls**  
   * Track per-email OTP requests (e.g., 5 per 10 min) and per-IP requests (Fastify rate-limit plugin or Redis script).  
   * On login, maintain `auth_attempts` table or Redis key storing remaining tries before temporary lock (e.g., 5 attempts per code).  
   * Emit structured logs/metrics for throttled events; never include the OTP payload.

**Non-Goals**

* Fancy email templates beyond minimal HTML/text styling.
* Full-feature User Management (password reset, MFA enroll) outside OTP scope.
* SMS or push delivery; SMTP only for this phase.

---

## ▓▒░ SECTION III // ARCHITECTURE & FLOW

### 1️⃣ OTP Request (`POST /auth/email-otp`)

1. Client submits `{ email }`.
2. Server normalizes email, enforces per-email + per-IP rate limits, and purges expired login tokens.
3. New OTP row is created (hashed, 10-minute TTL).  
4. Mailer renders template and sends via Nodemailer SMTP transport.  
5. Response `{ ok: true }` (regardless of email existence to avoid enumeration).

### 2️⃣ OTP Login (`POST /auth/login`)

1. Client posts `{ email, code }`.  
2. Server applies per-email attempt budget; if exhausted, respond `429` with retry-after metadata.  
3. Matches hashed code, deletes login token, and issues a session token (as today).  
4. Records successful login in `auth_attempts` (or clears Redis counters) for observability.

### 3️⃣ Protected API Calls

1. Legacy `/items*` demo routes are deleted; remaining business endpoints are mounted via `withV1Routes(app)` while `/meta/**` stays public.  
2. `/v1/auth/*` routes are registered via `withV1Auth(app)` so future `/v2/auth/*` variants can be mounted side-by-side.  
3. OpenAPI: add `security` arrays so client SDK generation enforces Bearer requirement automatically.

---

## ▓▒░ SECTION IV // IMPLEMENTATION NOTES

| Component | Action |
| --- | --- |
| **Mailer** | New module builds Nodemailer transporter during Fastify boot. Inject via decorator (`fastify.decorate("mailer", ...)`) for DI. |
| **Config** | Extend `ConfigSchema` + `.env.defaults` with SMTP credentials. Document secrets in `AUTH_CLIENT.md`. |
| **Routing** | Define `withV1Auth(app)` + `withV1Routes(app)` entry points; API index should call both so `/v1` remains consistent. |
| **Logging** | Replace debug OTP logs with structured entries that omit the code (e.g., `{ userId, email, otpIssued: true }`). |
| **Rate limiting** | Prefer `@fastify/rate-limit` if Redis exists; fallback to in-memory store for dev with warnings. |
| **Data Store** | If Redis is chosen, namespace keys `otp:req:{email}` and `otp:login:{email}` for TTL counters. |
| **Testing hooks** | For local dev, allow `SMTP_DEV_INBOX=file://...` to dump emails to disk; disabled in prod. |

---

## ▓▒░ SECTION V // SECURITY & OBSERVABILITY

* **Metrics**: Emit `auth.otp.requested`, `auth.otp.sent`, `auth.otp.rate_limited`, `auth.login.success`, `auth.login.locked`.  
* **Audit**: Store timestamp + IP for each rate-limit trigger (without OTP).  
* **Secrets**: Keep SMTP credentials in `.env`; never commit.  
* **401 Handling**: With all routes protected, verify `requireAuth` returns typed errors so the client redirect logic remains deterministic.

---

## ▓▒░ SECTION VI // ACCEPTANCE CRITERIA

✅ OTP emails delivered over SMTP in staging using Mailgun creds; no OTP value appears in logs.  
✅ All `/v1` business routes require Authorization header; no unauthenticated `/items*` demo endpoints remain.  
✅ Rate limiting blocks brute-force (≥5 bad codes or OTP requests within window) and returns `429` with `Retry-After`.  
✅ OpenAPI + generated SDK show Bearer requirements; client auto-injects header per AUTH_CLIENT PRD.  
✅ Versioned auth mount points (`withV1Auth`) documented so a future `/v2/auth` rollout can proceed without regressions.
✅ Observability dashboards (logs/metrics) reveal OTP traffic without exposing PII beyond email hash.

---

## ▓▒░ SECTION VII // OPEN DECISIONS

1. Do we canonicalize emails to hashed identifiers in rate-limit keys to avoid storing plaintext?  
2. Should long-term API tokens also gain per-user limits (e.g., max 10 active tokens)?  
3. Should we provide seed data for local dev now that demo endpoints are gone?
4. What telemetry signals should gate promotion of a future `/v2/auth` surface?

Awaiting COMMISSAR validation before moving into implementation sprints. Unity maintained. ▓▒░
