import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { ErrorSchema } from "../errors.js";
import { type FetchLike, fetchGeocode, GeocoderUnavailableError, toCandidates } from "./ign.js";
import { GeocodeQuerySchema, GeocodeResultSchema } from "./schema.js";

export interface GeocodingRoutesOptions {
  fetchImpl?: FetchLike;
}

export const geocodingRoutes: FastifyPluginAsyncTypebox<GeocodingRoutesOptions> = async (
  app,
  { fetchImpl },
) => {
  app.get(
    "/geocode",
    {
      schema: {
        querystring: GeocodeQuerySchema,
        response: { 200: GeocodeResultSchema, 400: ErrorSchema, 502: ErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        const payload = await fetchGeocode(request.query.q, fetchImpl);

        // An empty list means "none identified". It is not an error.
        return { candidates: toCandidates(payload) };
      } catch (error) {
        if (error instanceof GeocoderUnavailableError) {
          request.log.warn({ err: error }, "address lookup unavailable");

          return reply.code(502).send({
            error: {
              code: "geocoder_unavailable",
              message: "Address lookup is unavailable",
            },
          });
        }

        throw error;
      }
    },
  );
};
