import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { locationTier, properties, propertyStatus } from "./schema.js";

/** The fields specs/property.md defines. Nothing else belongs on Property. */
const SPECIFIED_FIELDS = [
  "address",
  "askingPrice",
  "createdAt",
  "id",
  "latitude",
  "listingUrl",
  "locationTier",
  "longitude",
  "name",
  "notes",
  "status",
  "updatedAt",
];

describe("properties table", () => {
  it("carries exactly the fields the specification defines", () => {
    // Guards ADR-003: derived evidence must never become a Property column.
    expect(Object.keys(getTableColumns(properties)).sort()).toEqual(SPECIFIED_FIELDS);
  });

  it("offers exactly the four specified statuses", () => {
    expect(propertyStatus.enumValues).toEqual(["saved", "shortlist", "visit", "rejected"]);
  });

  it("defaults new properties to saved", () => {
    expect(getTableColumns(properties).status.default).toBe("saved");
  });

  it("offers exactly the three specified location tiers", () => {
    expect(locationTier.enumValues).toEqual(["exact", "zone", "commune"]);
  });

  it("gives location tier no default, so one must always be declared", () => {
    // specs/property.md: there is no default tier.
    expect(getTableColumns(properties).locationTier.default).toBeUndefined();
    expect(getTableColumns(properties).locationTier.notNull).toBe(true);
  });

  it("requires coordinates", () => {
    const columns = getTableColumns(properties);

    expect(columns.latitude.notNull).toBe(true);
    expect(columns.longitude.notNull).toBe(true);
  });

  it("leaves optional values nullable", () => {
    const columns = getTableColumns(properties);

    expect(columns.askingPrice.notNull).toBe(false);
    expect(columns.listingUrl.notNull).toBe(false);
    expect(columns.notes.notNull).toBe(false);
  });
});
