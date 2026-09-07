import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { areaRoutes } from "./areas/routes.js";
import type { Db } from "./db/client.js";
import { registerErrorHandler } from "./errors.js";
import type { FetchLike } from "./geocoding/ign.js";
import { geocodingRoutes } from "./geocoding/routes.js";
import { propertyRoutes } from "./properties/routes.js";

export interface AppOptions {
  db: Db;
  logger?: boolean;
  /** Injected in tests so the geocoder's failure modes can be exercised. */
  fetchImpl?: FetchLike;
}

/**
 * Returns a configured but un-listened instance, so tests can drive it with
 * app.inject() without binding a port.
 */
export function buildApp({ db, logger = false, fetchImpl }: AppOptions) {
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
  app.register(geocodingRoutes, { prefix: "/api", fetchImpl });
  app.register(areaRoutes, { prefix: "/api", fetchImpl });

  return app;
}
