import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";

const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASS = process.env.REDIS_PASS || undefined;
const DISABLE_QUEUE = process.env.DISABLE_MARK_INGESTION_QUEUE === "1" || process.env.NODE_ENV === "test";

export interface MarkIngestionJob {
  markId: string;
}

function createInMemoryQueue<T>() {
  const jobs: Array<{ id: string; name: string; data: T }> = [];
  return {
    async add(name: string, data: T) {
      const job = { id: randomUUID(), name, data };
      jobs.push(job);
      return job;
    },
    async drain(_delayed = false) {
      jobs.length = 0;
      return 0;
    },
    async clean(_grace?: number, _limit?: number, _type?: string) {
      jobs.length = 0;
      return [];
    },
    async obliterate(_opts?: { force?: boolean }) {
      jobs.length = 0;
    },
    async waitUntilReady() {},
    async pause() {},
    async resume() {},
  } as unknown as Queue<T>;
}

export const markIngestionQueue = DISABLE_QUEUE
  ? createInMemoryQueue<MarkIngestionJob>()
  : new Queue<MarkIngestionJob>("mark_ingestion", {
      connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASS,
      },
    });
