import { defineConfig } from "drizzle-kit";

const { env } = process;

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    host: env.POSTGRES_HOST || "db",
    port: Number(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || "app",
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  },
});
