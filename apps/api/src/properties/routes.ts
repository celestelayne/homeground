import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { Db } from "../db/client.js";
import { createProperty, listProperties, updateProperty } from "./repository.js";
import {
  CreatePropertyBodySchema,
  ErrorSchema,
  PropertyListSchema,
  PropertyParamsSchema,
  PropertySchema,
  UpdatePropertyBodySchema,
} from "./schema.js";

export interface PropertyRoutesOptions {
  db: Db;
}

export const propertyRoutes: FastifyPluginAsyncTypebox<PropertyRoutesOptions> = async (
  app,
  { db },
) => {
  app.get("/properties", { schema: { response: { 200: PropertyListSchema } } }, async () => ({
    properties: await listProperties(db),
  }));

  app.post(
    "/properties",
    {
      schema: {
        body: CreatePropertyBodySchema,
        response: { 201: PropertySchema, 400: ErrorSchema },
      },
    },
    async (request, reply) => {
      const property = await createProperty(db, request.body);

      return reply.code(201).send(property);
    },
  );

  app.patch(
    "/properties/:id",
    {
      schema: {
        params: PropertyParamsSchema,
        body: UpdatePropertyBodySchema,
        response: { 200: PropertySchema, 400: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (request, reply) => {
      const property = await updateProperty(db, request.params.id, request.body);

      if (!property) {
        return reply
          .code(404)
          .send({ error: { code: "not_found", message: "No property with that id" } });
      }

      return property;
    },
  );
};
