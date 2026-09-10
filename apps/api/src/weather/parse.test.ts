import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseWeather, WeatherFormatError } from "./parse.js";

const csv = readFileSync(path.resolve(import.meta.dirname, "__fixtures__/mensq-aude.csv"), "utf8");
const parsed = parseWeather(csv, "2021", "2025");

describe("parseWeather", () => {
  it("identifies stations by number, not by name", () => {
    // "LEZIGNAN" matches two stations — 11203001, which closed in 1999, and
    // 11203004, which opened in 1990. Matching by name double-counts the
    // decade they overlap, which inflated this milestone's first rainfall
    // figure by half before a plausibility check caught it.
    const lezignan = parsed.stations.filter((s) => s.name.startsWith("LEZIGNAN"));

    expect(lezignan.map((s) => s.id)).toEqual(["11203004"]);
  });

  it("keeps one record per station per month", () => {
    const keys = parsed.records.map((r) => `${r.stationId}:${r.yearMonth}`);

    expect(keys.length).toBe(new Set(keys).size);
  });

  it("reads the years asked for and no others", () => {
    const years = new Set(parsed.records.map((r) => r.yearMonth.slice(0, 4)));

    expect([...years].sort()).toEqual(["2021", "2022", "2023", "2024", "2025"]);
  });

  it("carries what a person asks about", () => {
    const august = parsed.records.find(
      (r) => r.stationId === "11203004" && r.yearMonth === "202308",
    );

    expect(august?.meanMax).toBeGreaterThan(25);
    expect(august?.daysAbove30).toBeGreaterThan(0);
    expect(august?.nightsAbove20).toBeGreaterThan(0);
  });

  it("keeps sunshine in the minutes the source publishes", () => {
    // 6,015 for a December is minutes — a hundred hours. Read as hours it
    // would be eight times the hours December contains.
    const december = parsed.records.find(
      (r) => r.stationId === "11069001" && r.yearMonth === "202112",
    );

    expect(december?.sunshineMinutes).toBeGreaterThan(3000);
    expect(december?.sunshineMinutes).toBeLessThan(15000);
  });

  it("carries a station's altitude, because a station below a village is elsewhere", () => {
    expect(parsed.stations.find((s) => s.id === "11203004")?.altitude).toBe(60);
  });

  it("refuses a file whose units have changed", () => {
    // The guard that would have caught sunshine-as-hours. A month cannot hold
    // forty days of rain, and a file that says so is a file to stop on.
    const header = "NUM_POSTE;NOM_USUEL;LAT;LON;ALTI;AAAAMM;NBJRR1";
    const impossible = `${header}\n11203004;X;43.1;2.7;60;202401;40`;

    expect(() => parseWeather(impossible, "2021", "2025")).toThrow(WeatherFormatError);
  });

  it("refuses a file whose columns have changed", () => {
    expect(() => parseWeather("NUM_POSTE;AAAAMM\n11203004;202401", "2021", "2025")).toThrow(
      WeatherFormatError,
    );
  });

  it("drops a station with no coordinates rather than placing it nowhere", () => {
    const header = "NUM_POSTE;NOM_USUEL;LAT;LON;ALTI;AAAAMM;TX";
    const noPosition = `${header}\n11203004;X;;;60;202401;12`;

    expect(parseWeather(noPosition, "2021", "2025").stations).toEqual([]);
  });
});
