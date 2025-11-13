import "zod-openapi/extend";
import Fastify, { FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import {
  type FastifyZodOpenApiTypeProvider,
  fastifyZodOpenApiPlugin,
  serializerCompiler,
  validatorCompiler,
  fastifyZodOpenApiTransform,
  fastifyZodOpenApiTransformObject,
} from "fastify-zod-openapi";
import fastifyMultipart from "@fastify/multipart";
import { config } from "./config";
import { v1 } from "../routes";

const fastify = Fastify({
  logger: true,
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

export const app = fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>();

// Register multipart support for file uploads
app.register(fastifyMultipart, {
  limits: {
    fileSize: config.uploadFileSizeLimit,
  },
});

await fastify.register(fastifyZodOpenApiPlugin);
await fastify.register(import("@fastify/swagger"), {
  // Zod support
  transform: fastifyZodOpenApiTransform,
  transformObject: fastifyZodOpenApiTransformObject,

  // Base OpenAPI document
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "App API",
      description: "Minimal demo API",
      version: "1.0.0-alpha",
    },
    servers: [
      {
        url: "/v1",
        description: "Universal",
      },
    ],
    tags: [
      { name: "Meta", description: "Meta information" },
      { name: "Auth", description: "OTP sessions and API tokens" },
      { name: "Users", description: "User concept (no auth)" },
      { name: "Items", description: "Example CRUD entity" },
      { name: "Documents", description: "Binary upload/download" },
      { name: "Marks", description: "Saved user marks" },
      { name: "Accesses", description: "Retrievals of a mark" },
      { name: "Captures", description: "Files captured from an access" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "token",
        },
      },
    },
    externalDocs: {
      url: "https://swagger.io",
      description: "Find more info here",
    },
  },
});

await fastify.register(import("@scalar/fastify-api-reference"), {
  routePrefix: "/meta/docs",
});

await app.register(import("@fastify/swagger-ui"), {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject, _request, _reply) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

await app.register(v1, { prefix: "/v1" });

export type App = typeof app;

