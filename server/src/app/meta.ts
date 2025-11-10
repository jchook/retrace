import { versionString } from "./version";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

export async function getVersionString(): Promise<string> {
  try {
    if (process.env.NODE_ENV !== "development") {
      const scriptPath = path.resolve(__dirname, "../../bin/version");
      const { stdout } = await execFileAsync(scriptPath);
      return stdout.trim();
    }
  } catch (err) {}
  return versionString;
}
