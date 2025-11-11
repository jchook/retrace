# Repository Guidelines

(high beep) Nav-com locked. Command center engaged.

## Project Structure & Module Organization
- `client/` React 19 app (Rsbuild, TanStack Router/Query, Kubb). Source in `client/src/`; prod assets in `client/dist/`.
- `server/` Fastify API (TypeScript, Drizzle ORM, Zod/OpenAPI). Source in `server/src/`; API docs in `server/spec/`.
- `docs/` project docs; `infra/` deployment assets; root `justfile` task runner; `docker-compose*.yml` local/prod stacks.

## Architecture & Local Services
- Core stack: Fastify + Postgres/Drizzle + BullMQ/Redis; React + Mantine; Bun runtime; Caddy in production.
- Local URLs: API http://localhost:3000; Docs http://localhost:3000/meta/docs; Client http://localhost:9000; DB admin http://localhost:8081.
- Redis is available for queues (BullMQ). No worker service is started by default in compose.

## Single Source of Truth: DB → API → Client
- Define all persistent data in Drizzle at `server/src/db/schema.ts` (tables, columns, enums).
- Derive route schemas from Drizzle using `drizzle-zod` in `server/src/routes/schema.ts` (createSelectSchema/createInsertSchema).
- Do not hand‑roll duplicate Zod DTOs; prefer deriving from Drizzle and adding `.openapi(...)` only.
- Generate OpenAPI from Fastify+Zod; Kubb consumes `server/spec/openapi.json` to generate the client SDK under `client/src/gen/`.

## Build, Dev, and Generation Commands
- Start full stack (dev): `just up` (API, DB, Redis, client). Logs: `just logs`; shell on API: `just sh`.
- Client dev (HMR): `cd client && bun dev` → http://localhost:9000
- Build client: `cd client && bun run build` (or `just build`).
- Database migrations (Drizzle Kit, auto‑sync): `just db push`
  - Important: Only the user should run `just db push`. The AI must not run migration commands.
- Regenerate OpenAPI + client SDK after schema/route changes: `just gen` (runs `server/just gen` then `client/just gen`).
  - Note: `server/just gen` curls the running API at `/meta/docs/json`, so the API must be running.

## Coding Style & Naming Conventions
- TypeScript everywhere; 2‑space indent via `.editorconfig`.
- Linting: ESLint configured in `client/` and `server/`.
- Formatting: Prettier available; follow existing style.
- Client routes live in `client/src/routes/` using file‑based routing. Example pattern: `items_.$itemId.tsx`.
- Do not edit generated files: `client/src/routeTree.gen.ts`, `client/src/gen/**`.

## Testing Guidelines
- No formal unit test suite yet. Validate endpoints via Scalar/Swagger at `http://localhost:3000/meta/docs` and flows via the client.
- Prefer adding tests alongside code (`client/src/**/__tests__`, `server/src/**/__tests__`) if introducing complex logic.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject; prefix scope when helpful (e.g., `server:`, `client:`, `infra:`). Example: `server: add marks endpoints`.
- PRs: clear description and rationale; link issues; screenshots for UI; logs for infra changes.
- Before review: ensure client builds (`just build`), OpenAPI/spec + SDK regenerated (`just gen`), and docs updated.

## Security & Configuration
- Never commit secrets. Use `.env` (local) with `.env.defaults` as baseline.
- Important envs: `POSTGRES_*`, `APP_*` (server config), `REDIS_*` for queues, optional Caddy TLS vars.
- Mounted storage paths (defaults): `/mnt/documents`, `/mnt/artifacts` — keep large or sensitive files out of git.

## Example Scope in This Repo
- Demo endpoints: Items CRUD + binary document upload/download.
- MVP domain (PRD `PRD.md`): `marks`, `accesses`, `captures` schema present in Drizzle and exposed in route schemas; routes can be added using these types as the source of truth.
