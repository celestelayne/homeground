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

/**
 * The FINESS categories HomeGround has a mapping for.
 *
 * A hospital here means a general hospital somebody would be taken to: a
 * centre hospitalier, a regional or university one, or a local one. Mapping
 * only 355 left Montpellier claiming no hospitals at all, because its CHU is
 * registered as 101.
 *
 * Deliberately excluded, and why:
 *   292  psychiatric hospitals — a different question from "where would I be
 *        taken", and answering the second with the first would mislead
 *   127  hospitalisation at home — a service, not a place to go
 *   271  accommodation for patients' families
 *   426  an administrative body between hospitals
 *   698  a catch-all the register uses for everything else
 *   214  Centre Hébergement & Réinsertion Sociale — a homeless shelter whose
 *        acronym reads like a regional hospital. Matching on codes rather
 *        than reading the labels would have counted 883 of them.
 */
const KINDS: Record<string, "pharmacy" | "hospital"> = {
  "620": "pharmacy",
  "101": "hospital",
  "106": "hospital",
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
  /** Street line as the register writes it: "17 R MADELEINE BRES". */
  address: string | null;
  latitude: number;
  longitude: number;
  precision: "exact" | "zone" | "commune";
}

/** Field positions in the 32-column establishment record. */
const NAME = 4;
const STREET_NUMBER = 7;
const STREET_TYPE = 8;
const STREET_NAME = 9;
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
    address: toAddress(fields),
    latitude: point.latitude,
    longitude: point.longitude,
    precision: PRECISION_BY_LEVEL[position[4]?.split(",")[0] ?? ""] ?? "commune",
  };
}

/**
 * The street line, as the register writes it — abbreviated the way French
 * postal data is: R for rue, BD for boulevard, CHE for chemin.
 *
 * Left abbreviated rather than expanded. Expanding it means a lookup table
 * this codebase would have to maintain and keep correct, and the abbreviations
 * are what appears on the building.
 */
function toAddress(fields: string[]): string | null {
  const line = [fields[STREET_NUMBER], fields[STREET_TYPE], fields[STREET_NAME]]
    .map((part) => part?.trim())
    .filter((part) => part)
    .join(" ");

  return line.length > 0 ? line : null;
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
