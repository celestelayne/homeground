/**
 * The wire shape of a Property, mirroring the API's contract.
 *
 * Deliberately duplicated rather than shared: docs/architecture.md prefers
 * explicit duplication until the boundary is clear, and the shapes genuinely
 * differ across layers. A test asserts both sides carry the same fields.
 */
export type PropertyStatus = "saved" | "shortlist" | "visit" | "rejected";

export type LocationTier = "exact" | "zone" | "commune";

export interface Property {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  locationTier: LocationTier;
  askingPrice: number | null;
  listingUrl: string | null;
  status: PropertyStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProperty {
  name?: string;
  status?: PropertyStatus;
  notes?: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}
