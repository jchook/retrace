import { randomUUID } from "node:crypto";
import type { GlobalSetupContext } from "vitest/node";

export default async function globalSetup(_ctx: GlobalSetupContext) {
  process.env.NODE_ENV = "test";
  process.env.VITEST_TEST_RUN_ID ??= randomUUID().replace(/-/g, "").slice(0, 12);
  process.env.VITEST_DISABLE_REDIS ??= "1";
  process.env.DISABLE_MARK_INGESTION_QUEUE ??= "1";
}
