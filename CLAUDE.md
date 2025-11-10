# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Madi AI is a mortgage refinancing quality check application that ingests search requests and reports, then returns formatted PDF reports highlighting data inaccuracies. The application uses Google's Gemini AI to parse documents and validate client information including names, addresses, counties, legal descriptions, and deed history.

## Tech Stack

- **Runtime**: Bun for TypeScript native engine
- **Server**: Fastify API with Docker Compose orchestration (Nginx, Postgres, Redis, Adminer on Alpine Linux)
- **Database**: PostgreSQL with Drizzle ORM and migrations
- **Client**: React 19 with Mantine UI components, rsbuild for bundling, Tanstack Router and Query
- **API Generation**: Kubb generates type-safe API client from OpenAPI spec
- **Containerization**: Docker with production and development compose files

## Development Commands

### Project Management (using Just)
- `just up` - Start development services with Docker Compose
- `just build` - Build client application
- `just logs` - View Docker container logs
- `just sh` - Interactive shell on API server
- `just gen` - Generate OpenAPI spec from server to `spec/openapi.json`
- `just db <args>` - Run Drizzle Kit commands (e.g., `just db push`, `just db migrate`)

### Server Development
- `bun run start` - Start server with hot reload using nodemon and ts-node
- Database setup: `just db push` for migrations, `just seed` for seeding

### Client Development
- `bun install` - Install dependencies
- `bun dev` - Start development server on port 9000
- `bun run build` - Clean build with TypeScript checks
- `bun run build:analyze` - Build with bundle analysis
- `bun run preview` - Preview production build

## Architecture

### Server Structure (`server/src/`)
- `db/schema.ts` - Drizzle database schema definitions
- `routes/` - API route definitions and schemas
  - `index.ts` - Route implementations
  - `schema.ts` - Request/response schemas using Zod
- `methods/` - Business logic and processing functions
- `queue/` - Background job processing with BullMQ
- `app/` - Application configuration and setup

### Client Structure (`client/src/`)
- `routes/` - Tanstack Router route components
- `components/` - Reusable React components
- `gen/` - Auto-generated API client code from OpenAPI spec
- `api/` - API client configuration
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `utils/` - Utility functions

### Code Generation Workflow
When making changes to API endpoints or database schemas:

1. Modify schemas in `server/src/db/schema.ts` or routes in `server/src/routes/`
2. Run `just gen` to regenerate OpenAPI spec
3. Run code generation in client: `cd client && bun run kubb` (generates React Query hooks and types in `client/src/gen/`)
4. Update client route components to use new generated hooks if endpoints changed

## Development Environment

### Local Services (Docker Compose)
- API Server: http://localhost:3000/
- API Documentation: http://localhost:3000/meta/docs
- Database Admin (Adminer): http://localhost:8081/

### Key Configuration Files
- `.env` - Environment variables (requires `GEMINI_API_KEY` from Google AI Studio)
- `docker-compose.yml` - Development services
- `docker-compose.prod.yml` - Production deployment
- `justfile` - Task automation and shortcuts

## Important Development Notes

- The application uses Google Gemini AI API for document processing
- Database migrations are managed through Drizzle Kit
- API documentation is auto-generated through Fastify Swagger
- Client uses Kubb for type-safe API client generation from OpenAPI specs
- All TypeScript with strict type checking
- Mantine provides the UI component library with Vanilla-Extract for styling

## Schema Change Process

Per `.cursor/rules/schema-changes.mdc`:
1. Make changes to schemas or endpoints
2. Run `cd client && just gen` to regenerate client code
3. Fix React Query hook usage in `client/src/routes` if endpoints changed fundamentally
