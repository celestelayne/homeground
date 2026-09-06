import { buildApp } from "./app.js";
import { createDb } from "./db/client.js";
import { readEnv } from "./env.js";

const env = readEnv();
const { db } = createDb(env.databaseUrl);
const app = buildApp({ db, logger: true });

app.listen({ port: env.port, host: "127.0.0.1" }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
