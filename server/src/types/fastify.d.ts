import "fastify";
import type { Mailer } from "../lib/mailer";

declare module "fastify" {
  interface FastifyInstance {
    mailer: Mailer;
  }
}
