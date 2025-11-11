import { Worker } from "bullmq";
import fs from "node:fs";
import path from "node:path";
import mime from "mime-types";
import { db } from "./db";
import { accesses, captures, marks } from "./db/schema";
import { eq } from "drizzle-orm";
import { config } from "./app/config";

const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASS = process.env.REDIS_PASS || undefined;

type MarkIngestionJob = {
  markId: string;
};

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function headersToJson(headers: Headers): string {
  const obj: Record<string, string> = {};
  headers.forEach((v, k) => (obj[k] = v));
  return JSON.stringify(obj);
}

async function processJob(job: { data: MarkIngestionJob }) {
  const { markId } = job.data;
  const [mark] = await db.select().from(marks).where(eq(marks.id, markId));
  if (!mark) throw new Error(`Mark not found: ${markId}`);
  const url = mark.url;
  if (!url) throw new Error("Mark has no URL");

  let accessId: string | null = null;
  try {
    // Create access first (pending)
    const [access] = await db.insert(accesses).values({ markId, status: "pending" }).returning();
    accessId = access.id;

    // Fetch resource
    const resp = await fetch(url);
    const mimeType = resp.headers.get("content-type") || undefined;
    const statusCode = resp.status;
    const headers = headersToJson(resp.headers);
    const arrayBuf = await resp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const contentLength = BigInt(buf.length);

    // Update access with response details and success
    await db
      .update(accesses)
      .set({ status: "success", statusCode, mimeType, headers, contentLength })
      .where(eq(accesses.id, accessId));

    // Persist capture
    const ext = (mimeType && mime.extension(mimeType)) || "bin";
    const fileName = `capture_0.${ext}`;
    const relDir = path.join("marks", markId, accessId);
    const absDir = path.join(config.artifactStore, relDir);
    await ensureDir(absDir);
    const absPath = path.join(absDir, fileName);
    await fs.promises.writeFile(absPath, buf);

    // Insert capture success
    const [cap] = await db
      .insert(captures)
      .values({
        accessId: accessId!,
        order: 0,
        role: "primary",
        status: "success",
        mimeType,
        storageKey: path.join(relDir, fileName),
        bytesSize: BigInt(buf.length),
      })
      .returning();

    // Update mark status + timestamps (do not downgrade success)
    if (mark.status !== "success") {
      await db.update(marks).set({ status: "success" }).where(eq(marks.id, markId));
    }
    await db
      .update(marks)
      .set({ lastAccessedAt: new Date(), lastCapturedAt: new Date() })
      .where(eq(marks.id, markId));

    return { accessId, captureId: cap.id };
  } catch (err: any) {
    // On failure, try to reflect on access and mark
    const message = String(err?.message || err);
    if (accessId) {
      await db.update(accesses).set({ status: "failed", error: message }).where(eq(accesses.id, accessId));
    }
    // Create a failed access if none exists? We created one above, but if failure occurred earlier, ignore
    // Mark should remain success if it has ever succeeded
    const [current] = await db.select().from(marks).where(eq(marks.id, markId));
    if (current && current.status !== "success") {
      await db.update(marks).set({ status: "failed", error: message }).where(eq(marks.id, markId));
    } else if (current) {
      await db.update(marks).set({ error: message }).where(eq(marks.id, markId));
    }
    throw err;
  }
}

const worker = new Worker<MarkIngestionJob>(
  "mark_ingestion",
  async (job) => processJob(job as any),
  {
    connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASS },
  },
);

worker.on("ready", () => console.log("[worker] mark_ingestion ready"));
worker.on("completed", (job) => console.log(`[worker] completed ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] failed ${job?.id}:`, err));

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
