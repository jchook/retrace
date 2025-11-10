# Retrace

Minimal, type-safe full‑stack skeleton using Fastify + Drizzle + React.

What’s included:
- Server API (Fastify + Zod + Drizzle) with OpenAPI docs
- Generated client SDK via Kubb (TanStack Query hooks)
- Example Items CRUD + binary uploads to demonstrate multipart handling
- PRD data model (marks/accesses/captures) implemented in Drizzle and exposed in route schemas

## Quick Start

Prereqs: Docker, Docker Compose, Bun, Just.

Commands:
- just up — start API, DB, Redis, and client dev
- just db push — run Drizzle migrations
- just gen — regenerate OpenAPI and client SDK (API must be running)

Local URLs:
- API: http://localhost:3000
- Docs: http://localhost:3000/meta/docs
- Client: http://localhost:9000
- DB admin: http://localhost:8081

## Project Structure
- client/ — React app (Rsbuild, TanStack Router/Query, Kubb)
- server/ — Fastify API (TypeScript, Drizzle ORM)
- server/spec/ — OpenAPI output and example tests
- docker-compose*.yml — local/prod stacks
- PRD.md — Retrace MVP data model and API outline

## Workflow: Single Source of Truth
1) Define DB tables in Drizzle: `server/src/db/schema.ts`
2) Derive route schemas with `drizzle-zod`: `server/src/routes/schema.ts`
3) Generate OpenAPI from Fastify + Zod
4) Run `just gen` to build `server/spec/openapi.json` and client SDK under `client/src/gen/`

Notes:
- Do not edit generated files: `client/src/gen/**` and `client/src/routeTree.gen.ts`
- The worker/queues are optional; Redis is available in docker-compose for future BullMQ jobs
