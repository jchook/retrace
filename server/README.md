Server
======

Fastify API server with Drizzle ORM and Zod‑based OpenAPI.

Setup
-----

Prereqs: `docker`, `docker compose`, and `just`.

```sh
# Start API, DB, Redis, and client dev
just up

# Apply DB migrations (Drizzle Kit)
just db push

# Regenerate OpenAPI + client SDK (API must be running)
just gen
```

Helpful Links
-------------

Local Development

- API V1: http://localhost:3000/
- API Docs: http://localhost:3000/meta/docs
- DB Admin: http://localhost:8081/

Core Technologies

- Docker / Compose
- Drizzle ORM
- Fastify
- @fastify/swagger (+ Scalar UI)
- zod / drizzle-zod
