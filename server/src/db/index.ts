import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import * as relations from "./relations";

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
} = process.env;

const isProd = process.env.NODE_ENV === "production";

// You can specify any property from the node-postgres connection options
export const db = drizzle({
  schema: { ...schema, ...relations },
  casing: "snake_case",
  connection: {
    connectionString: `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`,
    ssl: false, // TODO: isProd
  },
});
