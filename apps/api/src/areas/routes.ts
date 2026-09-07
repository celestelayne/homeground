import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { Db } from "../db/client.js";
import { ErrorSchema } from "../errors.js";
import type { FetchLike } from "../geocoding/ign.js";
import { AreaLookupUnavailableError, AreaNotFoundError } from "./geo-api.js";
import { AreaParamsSchema, AreaSchema } from "./schema.js";
import { getArea } from "./store.js";

export interface AreaRoutesOptions {
  db: Db;
  fetchImpl?: FetchLike;
}

export const areaRoutes: FastifyPluginAsyncTypebox<AreaRoutesOptions> = async (
  app,
  { db, fetchImpl },
) => {
  app.get(
    "/areas/:code",
    {
      schema: {
        params: AreaParamsSchema,
        response: { 200: AreaSchema, 404: ErrorSchema, 502: ErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        // Fetched the first time, held afterwards.
        return await getArea(db, request.params.code, fetchImpl);
      } catch (error) {
        // "No such commune" and "could not ask" are different facts. Collapsing
        // them would tell a user their commune does not exist because a service
        // was down. See docs/methodology.md.
        if (error instanceof AreaNotFoundError) {
          return reply.code(404).send({
            error: { code: "area_not_found", message: "No commune with that code" },
          });
        }

        if (error instanceof AreaLookupUnavailableError) {
          request.log.warn({ err: error }, "commune lookup unavailable");

          return reply.code(502).send({
            error: { code: "area_lookup_unavailable", message: "Commune lookup is unavailable" },
          });
        }

        throw error;
      }
    },
  );
};
