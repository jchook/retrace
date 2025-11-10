import fs from "fs";
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

const isDocker = fs.existsSync("/.dockerenv");

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "App",
  },
  dev: {
    // Be explicit for clarity in Docker/dev
    hmr: true,
    // If a module doesn't accept HMR, fall back to full reload
    liveReload: true,
  },
  performance: {
    bundleAnalyze: process.env.BUNDLE_ANALYZE
      ? {
          analyzerMode: "server",
          openAnalyzer: true,
        }
      : undefined,
  },
  server: {
    host: "0.0.0.0",
    port: 9000,
    proxy: {
      "/v1": {
        target: isDocker ? "http://api:3000" : "http://localhost:3000",
        changeOrigin: true,
        pathRewrite: { "^/v1": "" },
      },
    },
  },
  tools: {
    // Ensure TanStack Router plugin runs early and only once.
    rspack: (config, { prependPlugins }) => {
      prependPlugins(
        TanStackRouterRspack({
          target: "react",
          // Keep HMR simple in dev; enable splitting for prod builds
          autoCodeSplitting: process.env.NODE_ENV === "production",
          // Reduce noise if needed; set to true to hide generator logs
          // disableLogging: true,
        })
      );
    },
  },
});
