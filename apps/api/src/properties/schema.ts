import { type Static, Type } from "@sinclair/typebox";

/** The four statuses in specs/property.md. */
export const PropertyStatusSchema = Type.Union([
  Type.Literal("saved"),
  Type.Literal("shortlist"),
  Type.Literal("visit"),
  Type.Literal("rejected"),
]);

const Latitude = Type.Number({ minimum: -90, maximum: 90 });
const Longitude = Type.Number({ minimum: -180, maximum: 180 });

/**
 * Response nullables are declared as a JSON Schema type array rather than a
 * union, because fast-json-stringify serializes anyOf[string, null] as an
 * empty string — which would turn a cleared value into a present-but-empty one.
 *
 * Request nullables use a union instead, since only Ajv reads those and the
 * union is what carries the static type through to handlers.
 */
const NullableStringValue = Type.Unsafe<string | null>({ type: ["string", "null"] });
const NullableNumberValue = Type.Unsafe<number | null>({ type: ["number", "null"] });
const NullableStringInput = Type.Union([Type.String(), Type.Null()]);
const NullableNumberInput = Type.Union([Type.Number(), Type.Null()]);

/**
 * The wire representation of a Property: exactly the specified fields.
 *
 * Declaring this as a response schema means fast-json-stringify strips
 * anything absent from it, so a column added by mistake cannot reach a
 * client. That is ADR-003 enforced by serialization.
 */
export const PropertySchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  address: Type.String(),
  latitude: Latitude,
  longitude: Longitude,
  askingPrice: NullableNumberValue,
  listingUrl: NullableStringValue,
  status: PropertyStatusSchema,
  notes: NullableStringValue,
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

/**
 * Coordinates are required. There is no path from an address string to a
 * saved row, which is how "do not save from unconfirmed geocoding output"
 * is enforced structurally rather than by a check inside a handler.
 */
export const CreatePropertyBodySchema = Type.Object(
  {
    address: Type.String({ minLength: 1 }),
    latitude: Latitude,
    longitude: Longitude,
    askingPrice: Type.Optional(NullableNumberInput),
    listingUrl: Type.Optional(NullableStringInput),
    notes: Type.Optional(NullableStringInput),
    status: Type.Optional(PropertyStatusSchema),
  },
  { additionalProperties: false },
);

/**
 * Only status and notes are writable. Rejecting every other key is how
 * identity and coordinate immutability are enforced: a body carrying id,
 * latitude or createdAt is a 400 rather than a silent no-op.
 *
 * An absent key leaves the value unchanged; an explicit null clears it.
 */
export const UpdatePropertyBodySchema = Type.Object(
  {
    status: Type.Optional(PropertyStatusSchema),
    notes: Type.Optional(NullableStringInput),
  },
  { additionalProperties: false, minProperties: 1 },
);

export const PropertyParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const PropertyListSchema = Type.Object({
  properties: Type.Array(PropertySchema),
});

export type Property = Static<typeof PropertySchema>;
export type PropertyStatus = Static<typeof PropertyStatusSchema>;
export type CreatePropertyBody = Static<typeof CreatePropertyBodySchema>;
export type UpdatePropertyBody = Static<typeof UpdatePropertyBodySchema>;
