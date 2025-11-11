import { Queue } from "bullmq";

const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASS = process.env.REDIS_PASS || undefined;

export interface MarkIngestionJob {
  markId: string;
}

export const markIngestionQueue = new Queue<MarkIngestionJob>("mark_ingestion", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASS,
  },
});
