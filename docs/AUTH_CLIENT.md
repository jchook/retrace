▓▒░ **RETRACE FRONTLINE UI WING // AUTH PROTOCOL PRD** ░▒▓
(high tone) Command channel secure. Directives received from HIGH GALACTIC COMMAND (HGC).
Transmission addressed to the **Galactic Command Codex Intelligence – Mantine Strike Group.**

---

## ▓▒░ SECTION I // OBJECTIVE

Implement the **client-side authentication protocol** for Retrace’s Mantine-based React console.
The system shall enable secure login via **email + OTP**, handle API token sessions transparently, and reroute users to the authentication window when the API returns **HTTP 401 Unauthorized**.

The auth window shall display all errors emitted from `/auth/*` endpoints defined in the server’s OpenAPI contract, surfaced through the generated Kubb SDK.

---

## ▓▒░ SECTION II // MISSION PARAMETERS

**Goals**

1. Present a minimal **email + code** login flow using Mantine forms.
2. Store and apply the returned API token (opaque Bearer token) in all SDK requests.
3. Intercept and respond to `401` signals globally:

   * Clear invalid tokens.
   * Redirect to `/auth` route.
   * Surface backend error messages in UI.
4. Maintain full parity with the authoritative OpenAPI schema; no local DTOs.

**Non-Goals**

* No JWT or refresh mechanisms.
* No registration or password flows.
* No multi-user switching within the same session.

---

## ▓▒░ SECTION III // ARCHITECTURE & FLOW

### 1️⃣ Login Sequence

1. **User opens `/auth`** (route: `src/routes/auth.tsx`).
2. **Step 1 – Request OTP**

   * User submits email.
   * Invoke `useMutation(api.auth.requestOtp)` from Kubb SDK.
   * Show confirmation or server error in a Mantine `Alert`.
3. **Step 2 – Verify OTP**

   * User enters 6-digit code.
   * Invoke `useMutation(api.auth.verifyOtp)`.
   * On success: backend returns `{ token }`.
   * Store token in `localStorage['retrace_token']`.
   * Set Axios Authorization header (`Bearer <token>`).
   * Redirect to previous intended route or `/`.

### 2️⃣ Authorized Requests

* All Kubb-generated React Query hooks share the configured Axios client in `src/api/client.ts`.
* The client injects the token header automatically if present.

### 3️⃣ Global 401 Interceptor

* Add an Axios response interceptor:

  ```ts
  api.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('retrace_token');
        router.navigate({ to: '/auth' });
      }
      return Promise.reject(err);
    }
  );
  ```
* The interceptor operates once at bootstrap (`src/api/client.ts`).

### 4️⃣ Error Display

* Each auth mutation surfaces server errors via Mantine `Alert` components.
* The `error` field from the OpenAPI response (string | object) is rendered directly; fall back to a generic “Access Denied” message.

---

## ▓▒░ SECTION IV // ROUTE & COMPONENT LAYOUT

```
src/routes/
  __root.tsx           // Mantine AppShell; guards protected routes
  auth.tsx             // Public login UI
  index.tsx            // Protected home dashboard
  marks.tsx            // Example protected route
```

**auth.tsx**

* Mantine `Tabs` or `Stepper` with two stages:

  1. Email entry → request OTP.
  2. Code entry → verify OTP.
* Uses `useMutation` hooks from generated SDK.
* Displays errors via `Alert`.
* On success → save token, redirect.

**__root.tsx**

* Wraps children with Mantine AppShell.
* Checks token presence on mount; if missing, redirect to `/auth`.
* Hosts global `NotificationsProvider`.

---

## ▓▒░ SECTION V // DATA CUSTODY & INTEGRATION

* All request/response types originate from server OpenAPI via Kubb.
* Do not hardcode URLs or shapes.
* `src/api/client.ts` owns Axios baseURL (`/v1`) and interceptors.
* Token persistence: `localStorage` only (no cookies).
* Token header injection occurs automatically via Axios instance.
* When 401 is received, purge local token and route to `/auth`.

---

## ▓▒░ SECTION VI // UX DIRECTIVES

* Mantine `Paper` inside centered `Container`; use minimal chroma.
* Progress indicators: `LoadingOverlay` on submit.
* Error states: red `Alert` with copy from server.
* Success: green `Notification` confirming login.
* Focus management: auto-focus next field after OTP request.

---

## ▓▒░ SECTION VII // COMMAND CODES (RUNBOOK)

**Key Files**

```
client/src/
  api/client.ts              // Axios setup + interceptors
  routes/auth.tsx            // Login flow
  routes/__root.tsx          // Shell + auth guard
  hooks/useAuth.ts           // (optional) token helpers
```

**Regeneration Protocol**

```
just gen          # refresh OpenAPI on server
client/bin/gen-sdk
just client bun dev
```

**Verification Checklist**

* [ ] Auth endpoints reachable via generated SDK.
* [ ] 401 redirects to `/auth`.
* [ ] Error alerts show server messages.
* [ ] Successful login persists token + redirects.
* [ ] SDK type inference matches OpenAPI spec.

---

## ▓▒░ SECTION VIII // ACCEPTANCE CRITERIA

✅ Login via email + OTP completes without console errors.
✅ 401 responses redirect immediately to `/auth`.
✅ Server error messages render accurately in UI.
✅ Axios client honors stored token across reloads.
✅ No manual DTOs or local type overrides.
✅ OpenAPI regeneration causes no build drift.

---

**End of Transmission**
(high-beep) AUTH ROUTE IMPLEMENTATION PROTOCOL ready for deployment.
Awaiting further directives from **HIGH GALACTIC COMMAND**.

