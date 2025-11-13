import { App } from "../app";
import { config, ConfigSchema } from "../app/config";
import { getVersionString } from "../app/meta";

export async function v1Meta(app: App) {

  // Meta + OpenAPI endpoints remain public for docs generation
  app.route({
    method: "GET",
    url: "/meta/docs/json",
    schema: {
      description: "Get this API's OpenAPI specification in JSON format",
      tags: ["Meta"],
    },
    handler: async () => {
      return app.swagger();
    },
  });

  ["/meta/info", "/"].forEach((route) => {
    app.route({
      method: "GET",
      url: route,
      schema: {
        description: "Get this API's version and other meta information",
        tags: ["Meta"],
        response: {
          200: ConfigSchema,
        },
      },
      handler: async () => {
        if (!config.version) {
          config.version = await getVersionString();
        }
        return config;
      },
    });
  });
}
