/**
 * Météo-France monthly station records.
 *
 * One file per département, gzipped, every station since it opened. HomeGround
 * keeps the recent years and the handful of measures a person actually asks
 * about: winter light, rain days, mild mornings, summer heat, frost.
 *
 * Two rules here exist because breaking them produced wrong numbers before
 * anything reached a screen. Stations are identified by number, never by name.
 * And every unit is the one the published field descriptor states — sunshine
 * is recorded in minutes, and read as hours it is eight times the hours a
 * December contains.
 */

export class WeatherFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherFormatError";
  }
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
}

export interface MonthlyRecord {
  stationId: string;
  yearMonth: string;
  rainfall: number | null;
  rainDays: number | null;
  heavyRainDays: number | null;
  meanMax: number | null;
  meanMin: number | null;
  daysAbove30: number | null;
  daysAbove35: number | null;
  nightsAbove20: number | null;
  frostDays: number | null;
  /** Minutes, as published. */
  sunshineMinutes: number | null;
}

/** The source's column names, matched rather than assumed by position. */
const REQUIRED = ["NUM_POSTE", "NOM_USUEL", "LAT", "LON", "AAAAMM"] as const;

/**
 * Sunshine cannot exceed the daylight a month contains, and a month cannot
 * hold more than 31 days of anything. A file that changes units fails the
 * ingest here rather than printing an impossible number.
 */
const MAX_SUNSHINE_MINUTES = 31 * 16 * 60;
const MAX_DAYS_IN_MONTH = 31;

export interface Parsed {
  stations: Station[];
  records: MonthlyRecord[];
}

export function parseWeather(csv: string, from: string, to: string): Parsed {
  const lines = csv.split(/\r?\n/);
  const header = splitRow(lines[0] ?? "");
  const column = new Map(header.map((name, index) => [name, index]));

  for (const required of REQUIRED) {
    if (!column.has(required)) {
      throw new WeatherFormatError(`The weather file is missing the ${required} column`);
    }
  }

  const at = (row: string[], name: string) => (row[column.get(name) ?? -1] ?? "").trim();
  const stations = new Map<string, Station>();
  const records: MonthlyRecord[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim() === "") {
      continue;
    }

    const row = splitRow(line);
    const stationId = at(row, "NUM_POSTE");
    const yearMonth = at(row, "AAAAMM");
    const year = yearMonth.slice(0, 4);

    if (stationId === "" || yearMonth.length !== 6 || year < from || year > to) {
      continue;
    }

    const latitude = number(at(row, "LAT"));
    const longitude = number(at(row, "LON"));

    // A station without coordinates cannot be a distance from anywhere.
    if (latitude === null || longitude === null) {
      continue;
    }

    if (!stations.has(stationId)) {
      stations.set(stationId, {
        id: stationId,
        name: at(row, "NOM_USUEL"),
        latitude,
        longitude,
        altitude: integer(at(row, "ALTI"), 10000),
      });
    }

    records.push({
      stationId,
      yearMonth,
      rainfall: number(at(row, "RR")),
      rainDays: integer(at(row, "NBJRR1"), MAX_DAYS_IN_MONTH),
      heavyRainDays: integer(at(row, "NBJRR30"), MAX_DAYS_IN_MONTH),
      meanMax: number(at(row, "TX")),
      meanMin: number(at(row, "TN")),
      daysAbove30: integer(at(row, "NBJTX30"), MAX_DAYS_IN_MONTH),
      daysAbove35: integer(at(row, "NBJTX35"), MAX_DAYS_IN_MONTH),
      nightsAbove20: integer(at(row, "NBJTNS20"), MAX_DAYS_IN_MONTH),
      frostDays: integer(at(row, "NBJGELEE"), MAX_DAYS_IN_MONTH),
      sunshineMinutes: integer(at(row, "INST"), MAX_SUNSHINE_MINUTES),
    });
  }

  return { stations: [...stations.values()], records };
}

function number(text: string): number | null {
  if (text === "") {
    return null;
  }

  const value = Number(text);

  return Number.isFinite(value) ? value : null;
}

/**
 * A count, refused if it exceeds what the month can hold.
 *
 * The check is the unit guard: sunshine published in minutes and read as hours
 * sails past a type check and fails here.
 */
function integer(text: string, limit: number): number | null {
  const value = number(text);

  if (value === null || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value > limit) {
    throw new WeatherFormatError(
      `A value of ${value} exceeds the ${limit} a month can hold — the file's units have changed`,
    );
  }

  return Math.round(value);
}

function splitRow(line: string): string[] {
  return line.split(";").map((field) => field.replace(/^"|"$/g, ""));
}
