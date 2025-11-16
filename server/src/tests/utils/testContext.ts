import { randomUUID } from "node:crypto";

export interface TestContext {
  runId: string;
  workerId: string;
  namespace: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __TEST_CONTEXT__: TestContext | undefined;
}

export async function initTestContext(): Promise<TestContext> {
  if (global.__TEST_CONTEXT__) return global.__TEST_CONTEXT__;

  const runId = process.env.VITEST_TEST_RUN_ID ?? randomUUID().replace(/-/g, "").slice(0, 12);
  const workerId = process.env.VITEST_WORKER_ID ?? "0";
  const namespace = `run${runId}-w${workerId}`;

  global.__TEST_CONTEXT__ = { runId, workerId, namespace };
  return global.__TEST_CONTEXT__;
}

export function getTestContext(): TestContext {
  if (!global.__TEST_CONTEXT__) {
    throw new Error("Test context not initialized");
  }
  return global.__TEST_CONTEXT__;
}

export function namespacedLabel(label: string) {
  const ctx = getTestContext();
  return `${label}-${ctx.namespace}`;
}
