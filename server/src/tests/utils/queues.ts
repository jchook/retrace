import { markIngestionQueue } from "../../queue/queues";

let warned = false;

export async function resetQueues() {
  if (process.env.VITEST_DISABLE_REDIS === "1") return;
  try {
    await markIngestionQueue.drain(true);
    // Clean completed/failed so retries do not leak between tests
    await markIngestionQueue.clean(0, 0, "completed");
    await markIngestionQueue.clean(0, 0, "failed");
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn("[integration] Unable to reset BullMQ queues:", err);
    }
  }
}
