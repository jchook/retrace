import fs from "fs";
import path from "path";
import { createHash } from "node:crypto";
import { pipeline, Transform } from "node:stream";
import { promisify } from "node:util";
import type { MultipartFile } from "@fastify/multipart";

const pipelineAsync = promisify(pipeline);

export interface StoredDocumentMeta {
  storagePath: string;
  originalName: string;
  mimetype: string | null;
  size: number;
}

export async function saveDocumentFile(part: MultipartFile, itemId: number, root: string): Promise<StoredDocumentMeta> {
  const originalName = part.filename ?? "unnamed";
  const hash = createHash("sha256");
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const tmpPath = path.join(root, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const tmpFile = fs.createWriteStream(tmpPath);

  let totalBytes = 0;

  await pipelineAsync(
    part.file,
    new Transform({
      transform(chunk, _enc, cb) {
        hash.update(chunk);
        totalBytes += chunk.length;
        cb(null, chunk);
      },
    }),
    tmpFile,
  );

  const digest = hash.digest("hex").slice(0, 12);
  const prefix = `${digest}_`;
  const maxBaseLength = 255 - prefix.length - ext.length;
  const safeBase = base.slice(0, maxBaseLength);
  const safeFilename = `${prefix}${safeBase}${ext}`;
  const itemDir = path.join(root, itemId.toString());
  await fs.promises.mkdir(itemDir, { recursive: true });
  const finalPath = path.join(itemDir, safeFilename);
  await fs.promises.rename(tmpPath, finalPath);

  return {
    storagePath: finalPath,
    originalName,
    mimetype: part.mimetype || null,
    size: totalBytes,
  };
}
