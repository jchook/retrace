import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.spec.ts"],
    pool: "threads",
    globals: false,
    environment: "node",
    reporters: "default",
    setupFiles: ["./src/tests/setup/workerSetup.ts"],
    globalSetup: "./src/tests/setup/globalSetup.ts",
    env: {
      NODE_ENV: "test",
    },
    hookTimeout: 30_000,
  },
});
