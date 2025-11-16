import { sql } from "drizzle-orm";
import { db } from "../../db";

const TABLES = [
  "captures",
  "accesses",
  "documents",
  "marks",
  "auth_tokens",
  "items",
  "users",
];

export async function resetDatabase() {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`));
}
