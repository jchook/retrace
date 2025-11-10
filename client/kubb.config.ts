import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginMsw } from "@kubb/plugin-msw";

export default defineConfig({
  input: {
    path: "../server/spec/openapi.json",
  },
  output: {
    path: "./src/gen",
  },
  plugins: [
    pluginOas(),
    pluginTs(),
    pluginReactQuery({
      client: {
        baseURL: "/v1",
        importPath: "src/api/client",
      },
    }),
    pluginMsw(),
  ],
});
