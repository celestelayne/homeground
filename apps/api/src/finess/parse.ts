import proj4 from "proj4";

/**
 * FINESS publishes coordinates in Lambert-93, the French national projection,
 * not in latitude and longitude. Nothing reaches a map without converting
 * them. proj4 rather than arithmetic here: converting between projections by
 * hand is the geographic logic ADR-005 exists to keep out of this codebase.
 */
const LAMBERT_93 =
  "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 " +
  "+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

/** The FINESS categories HomeGround has a mapping for. */
const KINDS: Record<string, "pharmacy" | "hospital"> = {
  "620": "pharmacy",
  "355": "hospital",
};

/**
 * What each geocoding level can support.
 *
 * The source states the level; HomeGround never infers it. Level 4 means the
 * establishment was placed at its commune, so its coordinate is the commune's
 * centre wearing a pharmacy's name. An unrecognised level falls to the least
 * precise, so a change at the source can never silently overstate a position.
 */
const PRECISION_BY_LEVEL: Record<string, "exact" | "zone" | "commune"> = {
  "1": "exact",
  "2": "zone",
  "3": "zone",
  "4": "commune",
};

export interface Facility {
  id: string;
  areaCode: string;
  kind: "pharmacy" | "hospital";
  name: string;
  latitude: number;
  longitude: number;
  precision: "exact" | "zone" | "commune";
}

/** Field positions in the 32-column establishment record. */
const NAME = 4;
const COMMUNE = 12;
const DEPARTMENT = 13;
const CATEGORY = 18;

/**
 * Reads the geolocated FINESS extract.
 *
 * The file interleaves two record types keyed on the FINESS number: a
 * `structureet` row carrying the establishment, and a `geolocalisation` row
 * carrying its coordinates and how they were obtained. Neither is useful
 * alone, and the file has no header.
 */
export function parseFiness(contents: string): Facility[] {
  const establishments = new Map<string, string[]>();
  const positions = new Map<string, string[]>();

  for (const line of contents.split("\n")) {
    const fields = line.split(";");
    const id = fields[1];

    if (!id) {
      continue;
    }

    if (fields[0] === "structureet" && KINDS[fields[CATEGORY] ?? ""]) {
      establishments.set(id, fields);
    } else if (fields[0] === "geolocalisation") {
      positions.set(id, fields);
    }
  }

  const facilities: Facility[] = [];

  for (const [id, fields] of establishments) {
    const facility = toFacility(id, fields, positions.get(id));

    if (facility) {
      facilities.push(facility);
    }
  }

  return facilities;
}

function toFacility(id: string, fields: string[], position?: string[]): Facility | null {
  const kind = KINDS[fields[CATEGORY] ?? ""];
  const name = fields[NAME]?.trim();
  const department = fields[DEPARTMENT]?.trim();
  const commune = fields[COMMUNE]?.trim();

  if (!kind || !name || !department || !commune) {
    return null;
  }

  // FINESS splits the INSEE code across two fields and never joins it.
  const areaCode = `${department}${commune.padStart(3, "0")}`;

  if (!position) {
    return null;
  }

  const point = toWgs84(position[2], position[3]);

  if (!point) {
    return null;
  }

  return {
    id,
    areaCode,
    kind,
    name,
    latitude: point.latitude,
    longitude: point.longitude,
    precision: PRECISION_BY_LEVEL[position[4]?.split(",")[0] ?? ""] ?? "commune",
  };
}

function toWgs84(x?: string, y?: string): { latitude: number; longitude: number } | null {
  const easting = Number(x);
  const northing = Number(y);

  if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
    return null;
  }

  // A coordinate at the projection's origin is a placeholder, not a place.
  if (easting === 0 || northing === 0) {
    return null;
  }

  const [longitude, latitude] = proj4(LAMBERT_93, WGS84, [easting, northing]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}
