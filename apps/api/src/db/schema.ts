import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The four statuses in specs/property.md. The set is closed by specification,
 * so it is a database type rather than a constraint that a later migration
 * could quietly drop.
 */
export const propertyStatus = pgEnum("property_status", [
  "saved",
  "shortlist",
  "visit",
  "rejected",
]);

/**
 * How precisely the stored coordinates identify the property. Declared by the
 * user, never inferred. There is deliberately no default: a Property cannot be
 * saved without an explicit tier. See specs/property.md.
 */
export const locationTier = pgEnum("location_tier", ["exact", "zone", "commune"]);

/**
 * Exactly the fields specs/property.md defines. Derived evidence never becomes
 * a column here — see ADR-003.
 */
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // What the user calls this property. Required: it is the one value they
    // always have, and it is what tells two properties in one commune apart.
    name: text("name").notNull(),
    // Optional: many rural properties have no postal address at all.
    address: text("address"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    locationTier: locationTier("location_tier").notNull(),
    askingPrice: numeric("asking_price", { precision: 12, scale: 2 }),
    listingUrl: text("listing_url"),
    status: propertyStatus("status").notNull().default("saved"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // The confirmed-coordinates invariant, restated in storage so it holds for
  // any write path, not only the HTTP handler.
  (table) => [
    check("properties_latitude_range", sql`${table.latitude} between -90 and 90`),
    check("properties_longitude_range", sql`${table.longitude} between -180 and 180`),
  ],
);
