import Fastify, { type FastifyInstance } from "fastify";

export interface AppOptions {
  logger?: boolean;
}

export function buildApp({ logger = false }: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
