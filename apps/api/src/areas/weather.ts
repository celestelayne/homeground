import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { recentYears } from "../weather/ingest.js";

/**
 * What the weather here has been, over the last five complete years.
 *
 * A commune has no weather of its own. Every figure is borrowed from a station
 * somewhere else, and each figure may be borrowed from a *different* station:
 * Fabrezan's nearest rain gauge is 2.6 km away and measures nothing else, its
 * nearest thermometer is 5.1 km away, and the only station in the Aude that
 * measures sunshine is 35 km away in Carcassonne.
 *
 * So every figure carries the station it came from, how far that is, and how
 * many of the five years it actually reported. Five years is weather, not
 * climate — one hot summer moves it — and nothing here may call it a normal.
 */
export const WEATHER_SOURCE = "meteo-france";
export const WEATHER_METHOD = "nearest-station-recent-years";
export const WEATHER_METHOD_VERSION = 1;

/**
 * Beyond this, a station is describing somewhere else.
 *
 * Generous on purpose: sunshine is measured at one station per département, so
 * a tighter cap would answer "unknown" for almost every commune in France. The
 * distance is always shown, so a reader can discount a figure fetched from far
 * away rather than being protected from it.
 */
const MAX_KM = 60;
/** Below this, an average is a coincidence rather than a figure. */
const MIN_YEARS = 3;

interface EvidenceRow {
  areaCode: string;
  metric: string;
  value: number | null;
  unit: string | null;
  category: string | null;
  state: "known" | "unknown";
  sourceId: string;
  observedAt: Date | null;
  method: string;
  methodVersion: number;
  basis: string | null;
  basisSourceId: string | null;
  peers: number | null;
}

/**
 * The measures, as a person asks about them rather than as a station reports
 * them: winter light, rain days, mild mornings, summer heat, frost.
 *
 * `annual` sums a column over each complete year and averages those years.
 * `months` averages a column over the named months. A figure is only as good
 * as the years behind it, which is why both carry their count.
 */
const MEASURES = [
  {
    metric: "weather.sunshine",
    column: "sunshine_minutes",
    kind: "annual",
    unit: "hours",
    scale: 1 / 60,
  },
  {
    // The figure that answers "what is the winter like" better than an annual
    // total does: December holds about a third of July's light.
    metric: "weather.winterSun",
    column: "sunshine_minutes",
    kind: "months",
    months: ["12"],
    unit: "hours",
    scale: 1 / 60,
  },
  { metric: "weather.rainDays", column: "rain_days", kind: "annual", unit: "days" },
  { metric: "weather.rainfall", column: "rainfall", kind: "annual", unit: "mm" },
  { metric: "weather.daysAbove30", column: "days_above_30", kind: "annual", unit: "days" },
  { metric: "weather.daysAbove35", column: "days_above_35", kind: "annual", unit: "days" },
  { metric: "weather.nightsAbove20", column: "nights_above_20", kind: "annual", unit: "nights" },
  { metric: "weather.frostDays", column: "frost_days", kind: "annual", unit: "days" },
  {
    metric: "weather.winterMornings",
    column: "mean_min",
    kind: "months",
    months: ["12", "01", "02"],
    unit: "°C",
  },
  {
    metric: "weather.summerAfternoons",
    column: "mean_max",
    kind: "months",
    months: ["07", "08"],
    unit: "°C",
  },
] as const;

interface Found extends Record<string, unknown> {
  value: number;
  years: number;
  name: string;
  km: number;
  altitude: number | null;
}

export async function weatherEvidence(db: Db, code: string): Promise<EvidenceRow[]> {
  const { rows: centres } = await db.execute<{ lat: number; lon: number }>(
    sql`select centre_latitude as lat, centre_longitude as lon from areas where code = ${code}`,
  );
  const centre = centres[0];

  if (!centre) {
    return [];
  }

  const window = recentYears();
  const evidence: EvidenceRow[] = [];

  for (const measure of MEASURES) {
    const found = await nearest(db, centre, measure, window);
    const scale = "scale" in measure ? measure.scale : 1;

    evidence.push(
      found === null
        ? unknown(code, measure.metric)
        : {
            areaCode: code,
            metric: measure.metric,
            value: Math.round(Number(found.value) * scale * 10) / 10,
            unit: measure.unit,
            category: null,
            state: "known",
            sourceId: WEATHER_SOURCE,
            // The years observed, not the day HomeGround fetched them.
            observedAt: new Date(Date.UTC(Number(window.to), 11, 31)),
            method: WEATHER_METHOD,
            methodVersion: WEATHER_METHOD_VERSION,
            // Which station, how far, and on how many years. All three, or the
            // figure is a number with no provenance.
            // Distance is not similarity. Fontanès-de-Sault's nearest station
            // measuring sunshine is 30 km away and 1,600 m up, over a mountain
            // range, and a reader can only discount that if the altitude is
            // on the page beside the distance.
            basis:
              `${title(found.name)}, ${Math.round(Number(found.km) * 10) / 10} km away` +
              `${found.altitude === null ? "" : ` at ${Math.round(Number(found.altitude))} m`}` +
              ` · ${found.years} of 5 years`,
            basisSourceId: WEATHER_SOURCE,
            peers: null,
          },
    );
  }

  return evidence;
}

/**
 * The nearest station that actually measured this thing.
 *
 * Not the nearest station: the nearest one with the measurement. Ferrals is
 * closer to Fabrezan than Lézignan and has never recorded a temperature.
 */
async function nearest(
  db: Db,
  centre: { lat: number; lon: number },
  measure: (typeof MEASURES)[number],
  window: { from: string; to: string },
): Promise<Found | null> {
  const column = sql.raw(`m.${measure.column}`);
  const months =
    measure.kind === "months"
      ? sql`and right(m.year_month, 2) in ${(measure as { months: readonly string[] }).months}`
      : sql``;

  // A complete year for an annual sum is twelve months carrying the value; for
  // a monthly mean it is the named months. A partial year is dropped rather
  // than summed into a smaller number wearing a year's label.
  const required =
    measure.kind === "months" ? (measure as { months: readonly string[] }).months.length : 12;
  const perYear = measure.kind === "months" ? sql`avg(${column})` : sql`sum(${column})`;

  const { rows } = await db.execute<Found>(
    sql`with candidate as (
          select s.id, s.name, s.altitude,
                 6371 * acos(least(1,
                   sin(radians(${centre.lat})) * sin(radians(s.latitude))
                   + cos(radians(${centre.lat})) * cos(radians(s.latitude))
                     * cos(radians(s.longitude - ${centre.lon})))) as km
          from weather_stations s
        ),
        yearly as (
          select c.id, c.name, c.km, c.altitude,
                 left(m.year_month, 4) as year,
                 ${perYear} as value,
                 count(${column}) as months
          from candidate c
          join weather_monthly m on m.station_id = c.id
          where c.km <= ${MAX_KM}
            and left(m.year_month, 4) between ${window.from} and ${window.to}
            and ${column} is not null
            ${months}
          group by c.id, c.name, c.km, c.altitude, left(m.year_month, 4)
        )
        select name, km, altitude, avg(value)::float as value, count(*)::int as years
        from yearly
        where months = ${required}
        group by id, name, km, altitude
        having count(*) >= ${MIN_YEARS}
        order by km
        limit 1`,
  );

  return rows[0] ?? null;
}

function unknown(code: string, metric: string): EvidenceRow {
  return {
    areaCode: code,
    metric,
    value: null,
    unit: null,
    category: null,
    // No station near enough measured it. Not zero, and not the départemental
    // average — a figure from a hundred kilometres away is not this commune.
    state: "unknown",
    sourceId: WEATHER_SOURCE,
    observedAt: null,
    method: WEATHER_METHOD,
    methodVersion: WEATHER_METHOD_VERSION,
    basis: null,
    basisSourceId: null,
    peers: null,
  };
}

/** The files shout: "LEZIGNAN-CORBIERES". A reader is not being shouted at. */
function title(name: string): string {
  return name
    .toLocaleLowerCase("fr")
    .replace(
      /(^|[\s'-])([a-zàâçéèêëîïôûùüÿñæœ])/g,
      (_, before, letter: string) => before + letter.toLocaleUpperCase("fr"),
    );
}
