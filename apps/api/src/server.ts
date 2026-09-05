import Fastify from "fastify";

const server = Fastify({ logger: true });

server.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 3000);

server.listen({ port, host: "127.0.0.1" }).catch((error: unknown) => {
  server.log.error(error);
  process.exit(1);
});
