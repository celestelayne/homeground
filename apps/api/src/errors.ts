import { Type } from "@sinclair/typebox";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** The one error shape every route returns. */
export const ErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
  }),
});

/**
 * Error codes are language-neutral identifiers the client translates, per the
 * internationalization boundary in docs/architecture.md.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      return reply.code(400).send({ error: { code: "validation_failed", message: error.message } });
    }

    const status = error.statusCode ?? 500;

    if (status >= 500) {
      request.log.error(error);

      return reply
        .code(status)
        .send({ error: { code: "internal_error", message: "Unexpected error" } });
    }

    return reply.code(status).send({ error: { code: "request_failed", message: error.message } });
  });

  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) =>
    reply.code(404).send({ error: { code: "not_found", message: "No such route" } }),
  );
}
