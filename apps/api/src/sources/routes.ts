import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { SOURCES } from "./registry.js";
import { SourcesResultSchema } from "./schema.js";

/**
 * Everything HomeGround draws on, and what each one cannot tell you.
 *
 * Served from the same registry the evidence cites, so the panel and the
 * figures cannot describe different sets of sources.
 */
export const sourceRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get("/sources", { schema: { response: { 200: SourcesResultSchema } } }, async () => ({
    sources: SOURCES,
  }));
};
