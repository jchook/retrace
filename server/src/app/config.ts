import { z } from "zod";
import { loadConfigFromEnv } from "./env";

// Unit conversion constants
const MB = 1024 * 1024;

// Configuration schema + defaults
export const ConfigSchema = z.object({
  name: z.string().default("App"),
  documentStore: z.string().default("/mnt/documents"),
  artifactStore: z.string().default("/mnt/artifacts"),
  uploadFileSizeLimit: z.coerce
    .number()
    .min(1 * MB, {
      message: `uploadFileSizeLimit must be at least ${MB} bytes`,
    })
    .max(1024 * MB, {
      message: `uploadFileSizeLimit cannot exceed ${1024 * MB} bytes`,
    })
    .default(50 * MB),
  version: z.string().default(""),
});

export const config = loadConfigFromEnv(ConfigSchema, "APP_");
export type AppConfig = z.infer<typeof ConfigSchema>;
