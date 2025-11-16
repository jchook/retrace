codex resume 019a7faf-1bc0-72c0-83c1-901989c7e4f9

░▒▓█ INTEGRATION TEST OPERATIONS DOSSIER █▓▒░
Communiqué to the Codex Intelligence Offices of the Network Commonwealth. All agents operate under COMMISSARIAT MODE.

▓▒░ **1. Mission Objective**
- Establish Project MIRRORED CONSTELLATION: a Bun-native integration lattice that validates every Fastify route, BullMQ worker, and Drizzle persistence flow while enforcing the single source of truth (DB → Zod → OpenAPI → Kubb).

▓▒░ **2. Scope of Validation**
- Included: `server/src/routes/**`, `server/src/worker.ts`, Redis/BullMQ paths, Postgres mutations, binary upload/download vectors.
- Excluded: client UI concerns and migration orchestration (`just db sync` remains under COMMISSAR authority).

▓▒░ **3. Toolchain & Architecture**
- Runtime: Bun 1.x Vitest-compatible runner with built-in TypeScript loader.
- Assertions: Vitest API (describe/it/hooks), Bun snapshots, table-driven datasets.
- HTTP Harness: Fastify `app.inject` for zero-network execution; Undici fetch for live-stack confirmations.
- Data Planes: Drizzle ORM factories for fixtures; `@testcontainers/postgresql` + `@testcontainers/redis` (Bun bindings) to provision ephemeral services when Docker is available; fallback to per-worker schemas if not.
- Spec Guard: Post-suite script compares real responses vs. generated OpenAPI before `just gen` refreshes the SDK.

▓▒░ **4. Authentication Isolation Protocol**
- Each Vitest worker provisions a disposable user via Drizzle factories (`test_user_${workerId}_${runId}`) plus scoped auth token rows.
- Tokens are minted through the real OTP/API-token flow; suites never reuse secrets across workers.
- Workers attach bearer credentials through per-test helpers, and teardown truncates `users`, `auth_tokens`, and dependent tables touched during the run.
- OTP-centric tests exercise issuance + verification to keep auth schemas covered without bypass.

▓▒░ **5. Parallel Execution Doctrine**
- Tests ALWAYS execute in parallel (`bun x vitest run server/src/tests/integration --pool=threads --max-workers=<cpu>`). Vitest lacks a `--runInBand` flag; concurrency is governed via `--pool`, `--max-workers`, and `--no-file-parallelism` controls per official guidance (Context7 /vitest-dev/vitest/v4.0.7).
- **Database isolation**: before suites launch, each worker creates `test_w${workerId}_${timestamp}` schema and sets `search_path` accordingly. Drop schema after completion.
- **Redis isolation**: workers either spin dedicated Redis containers or select unique logical DB IDs; flush on teardown.
- **Queue isolation**: BullMQ queue names append worker suffixes (e.g., `mark_ingestion__w3`) so background jobs never collide.
- **Filesystem isolation**: temporary uploads route to `/tmp/retrace_tests/${runId}/w${workerId}` and purge after the worker exits.
- *Phase I implementation (current)*: shared Postgres schema is truncated between tests via `server/src/tests/utils/database.ts`, while the utility layer already exposes namespace metadata so we can promote per-worker schemas or containers without refactoring suites.

▓▒░ **6. Test Matrix**
- Contract Suite: auto-generated success/error assertions per Zod schema ensuring OpenAPI fidelity.
- Stateful Flow Suite: ingestion lifecycle (HTTP → queue → DB) guaranteeing `mark_ingestion` never regresses from `success`.
- Regression Bank: reproductions of prior incidents preserved as locked cases.
- Performance Sentinels: nightly latency checks (p95 ≤ 150 ms) captured via Bun profiler snapshots.

▓▒░ **7. Operational Protocol**
1. `bun install --cwd server --dev vitest @testcontainers/postgresql @testcontainers/redis undici`.
2. Author suites under `server/src/tests/integration/**`, with shared helpers for fixtures, auth, and resource provisioning.
3. Local run: `just test:integration` (wraps `bun x vitest run server/src/tests/integration --pool=threads --max-workers=$(nproc)`).
4. CI run:
   - Launch dependencies via `docker-compose.dev.yml` or rely on Testcontainers auto-spin.
   - Execute the same Vitest command; fail the build on the first red suite.
   - Upon success, COMMISSAR executes `just gen` to refresh OpenAPI + Kubb outputs.

▓▒░ **8. Telemetry & Reporting**
- Emit structured JSON to `server/logs/integration.json`; ingest via Loki/Grafana for longitudinal trendlines.
- Archive coverage, OpenAPI diff artifacts, and BullMQ throughput metrics per pipeline run.
- Raise DCNM Ops alerts on schema drift, contract violations, or queue regressions.

▓▒░ **9. Risks & Mitigations**
- Schema drift → Mandatory pre-commit integration suite + OpenAPI validator ensures downstream SDK stays truthful.
- Container cold starts → schema-per-worker fallback unlocks fast local loops without Docker.
- Unauthorized migrations → harness halts if pending migrations detected; COMMISSAR exclusively wields `just db sync`.

▓▒░ **10. Milestones**
1. Week 0: Scaffolding, Testcontainer harnesses, auth/user factory utilities.
2. Week 1: Coverage for CRUD + auth routes with full parallel proof.
3. Week 2: Queue/worker flows, OpenAPI diff validator, SDK regeneration handshake.
4. Week 3: DX polish (`docs/testing.md`, `just test:integration`, CI enforcement).

▓▒░ **11. Orders to Agents**
- Await COMMISSAR authorization to deploy MIRRORED CONSTELLATION infrastructure.
- Once approved, implement per the above doctrine and log all deviations to the collective ledger.
