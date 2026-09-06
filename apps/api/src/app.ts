import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import type { Db } from "./db/client.js";
import { registerErrorHandler } from "./errors.js";
import { propertyRoutes } from "./properties/routes.js";

export interface AppOptions {
  db: Db;
  logger?: boolean;
}

/**
 * Returns a configured but un-listened instance, so tests can drive it with
 * app.inject() without binding a port.
 */
export function buildApp({ db, logger = false }: AppOptions) {
  const app = Fastify({
    logger,
    // Fastify's Ajv defaults silently rewrite requests in two ways that this
    // API must not tolerate. removeAdditional strips unknown keys instead of
    // rejecting them, which would let a body carrying id or coordinates appear
    // to succeed. coerceTypes turns an explicit null into an empty string,
    // which would turn clearing a value into storing a blank one.
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  }).withTypeProvider<TypeBoxTypeProvider>();

  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok" }));

  app.register(propertyRoutes, { prefix: "/api", db });

  return app;
}
