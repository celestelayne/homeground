export interface Env {
  databaseUrl: string;
  port: number;
}

/**
 * Deliberately hand-written. Two variables do not justify a schema library.
 */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const databaseUrl = source.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return { databaseUrl, port: Number(source.PORT ?? 3000) };
}
