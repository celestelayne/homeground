import { desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { properties } from "../db/schema.js";
import type { CreatePropertyBody, Property, UpdatePropertyBody } from "./schema.js";

type PropertyRow = typeof properties.$inferSelect;

/**
 * The stored row and the wire representation differ: PostgreSQL numeric
 * arrives as a string, and timestamps as Date objects. Converting in one
 * place keeps that difference out of every handler.
 */
function toWire(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    locationTier: row.locationTier,
    askingPrice: row.askingPrice === null ? null : Number(row.askingPrice),
    listingUrl: row.listingUrl,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProperties(db: Db): Promise<Property[]> {
  const rows = await db.select().from(properties).orderBy(desc(properties.createdAt));

  return rows.map(toWire);
}

export async function createProperty(db: Db, body: CreatePropertyBody): Promise<Property> {
  const [row] = await db
    .insert(properties)
    .values({
      name: body.name,
      address: body.address ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      locationTier: body.locationTier,
      // numeric columns are written as strings.
      askingPrice: body.askingPrice == null ? null : String(body.askingPrice),
      listingUrl: body.listingUrl ?? null,
      notes: body.notes ?? null,
      // Omitted entirely when absent, so the column default applies.
      ...(body.status === undefined ? {} : { status: body.status }),
    })
    .returning();

  if (!row) {
    throw new Error("Insert returned no row");
  }

  return toWire(row);
}

export async function updateProperty(
  db: Db,
  id: string,
  patch: UpdatePropertyBody,
): Promise<Property | null> {
  // An absent key leaves the value unchanged; an explicit null clears it.
  const changes: Partial<Pick<PropertyRow, "name" | "status" | "notes">> = {};

  if (patch.name !== undefined) {
    changes.name = patch.name;
  }

  if (patch.status !== undefined) {
    changes.status = patch.status;
  }

  if (patch.notes !== undefined) {
    changes.notes = patch.notes;
  }

  const [row] = await db
    .update(properties)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(properties.id, id))
    .returning();

  return row ? toWire(row) : null;
}
