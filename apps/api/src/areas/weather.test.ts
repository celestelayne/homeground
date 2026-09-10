import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areas, weatherMonthly, weatherStations } from "../db/schema.js";
import { getTestDb } from "../test/database.js";
import { recentYears } from "../weather/ingest.js";
import { weatherEvidence } from "./weather.js";

const { db } = getTestDb();
const CODE = "99999";
/** The commune sits here; the stations are placed around it. */
const CENTRE = { lat: 43.0, lon: 2.7 };
const { from, to } = recentYears();
const YEARS = Array.from({ length: 5 }, (_, index) => String(Number(from) + index));

/** Degrees of longitude, roughly, at this latitude. */
const km = (distance: number) => distance / (111 * Math.cos((CENTRE.lat * Math.PI) / 180));

interface Reading {
  rainfall?: number;
  rainDays?: number;
  meanMax?: number;
  meanMin?: number;
  sunshineMinutes?: number;
}

async function station(id: string, distanceKm: number, reading: Reading, years: string[] = YEARS) {
  await db.insert(weatherStations).values({
    id,
    name: `STATION ${id}`,
    latitude: CENTRE.lat,
    longitude: CENTRE.lon + km(distanceKm),
    altitude: 50,
  });

  const records = years.flatMap((year) =>
    Array.from({ length: 12 }, (_, month) => ({
      stationId: id,
      yearMonth: `${year}${String(month + 1).padStart(2, "0")}`,
      ...reading,
    })),
  );

  await db.insert(weatherMonthly).values(records);
}

const find = (rows: Awaited<ReturnType<typeof weatherEvidence>>, metric: string) =>
  rows.find((row) => row.metric === metric);

beforeEach(async () => {
  await db.delete(weatherMonthly);
  await db.delete(weatherStations);
  await db.delete(areas);
  await db.insert(areas).values({
    code: CODE,
    name: "Nowhere",
    postcodes: ["99999"],
    departmentCode: "99",
    departmentName: "Nowhere",
    regionCode: "99",
    regionName: "Nowhere",
    centreLatitude: CENTRE.lat,
    centreLongitude: CENTRE.lon,
  });
});

afterEach(async () => {
  await db.delete(weatherMonthly);
  await db.delete(weatherStations);
  await db.delete(areas);
});

describe("choosing a station", () => {
  it("takes the nearest station that measures the thing, not the nearest station", async () => {
    // The case this milestone exists for. Fabrezan's nearest station is 2.6 km
    // away and has never recorded a temperature; its nearest thermometer is
    // twice as far.
    await station("rain-only", 2, { rainfall: 40, rainDays: 5 });
    await station("full", 6, { rainfall: 40, rainDays: 5, meanMax: 20, meanMin: 10 });

    const rows = await weatherEvidence(db, CODE);

    expect(find(rows, "weather.rainDays")?.basis).toContain("Station Rain-Only");
    expect(find(rows, "weather.summerAfternoons")?.basis).toContain("Station Full");
  });

  it("names the station, its distance, its altitude and the years", async () => {
    await station("full", 6, { meanMax: 20 });

    // A figure without those three is a number with no provenance.
    expect(find(await weatherEvidence(db, CODE), "weather.summerAfternoons")?.basis).toBe(
      "Station Full, 6 km away at 50 m · 5 of 5 years",
    );
  });

  it("refuses a station too far away to be describing this commune", async () => {
    await station("distant", 90, { meanMax: 20 });

    const afternoons = find(await weatherEvidence(db, CODE), "weather.summerAfternoons");

    // Not the nearest station at any distance, and not a départemental average.
    expect(afternoons?.state).toBe("unknown");
    expect(afternoons?.value).toBeNull();
  });

  it("refuses an average built on too few years", async () => {
    await station("brief", 5, { meanMax: 20 }, YEARS.slice(0, 2));

    expect(find(await weatherEvidence(db, CODE), "weather.summerAfternoons")?.state).toBe(
      "unknown",
    );
  });

  it("says nothing rather than something when no station measured it", async () => {
    await station("rain-only", 2, { rainfall: 40 });

    const rows = await weatherEvidence(db, CODE);

    expect(find(rows, "weather.rainfall")?.state).toBe("known");
    expect(find(rows, "weather.frostDays")?.state).toBe("unknown");
  });
});

describe("reading the figures", () => {
  it("converts sunshine from the minutes the source publishes", async () => {
    // 6,000 minutes is a hundred hours. Read as hours it would be eight times
    // the hours a December contains.
    await station("sunny", 4, { sunshineMinutes: 6000 });

    const december = find(await weatherEvidence(db, CODE), "weather.winterSun");

    expect(december?.value).toBe(100);
    expect(december?.unit).toBe("hours");
  });

  it("sums an annual figure over the year rather than averaging its months", async () => {
    await station("sunny", 4, { rainDays: 5 });

    // Five rain days every month is sixty a year, not five.
    expect(find(await weatherEvidence(db, CODE), "weather.rainDays")?.value).toBe(60);
  });

  it("dates the evidence to the years observed, not the day it was fetched", async () => {
    await station("full", 5, { meanMax: 20 });

    const fact = find(await weatherEvidence(db, CODE), "weather.summerAfternoons");

    expect(fact?.observedAt?.getUTCFullYear()).toBe(Number(to));
  });
});
