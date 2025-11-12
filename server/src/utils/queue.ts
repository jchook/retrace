import type { FastifyBaseLogger } from "fastify";
import { markIngestionQueue } from "../queue/queues";

export async function enqueueMarkIngestion(markId: string, log: FastifyBaseLogger) {
  try {
    await markIngestionQueue.add("ingest", { markId });
  } catch (err) {
    log.warn({ err, markId }, "Failed to enqueue mark ingestion job");
  }
}
