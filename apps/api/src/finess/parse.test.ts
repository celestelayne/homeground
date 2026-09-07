import { describe, expect, it } from "vitest";
import { parseFiness } from "./parse.js";

/**
 * Two interleaved record types keyed on the FINESS number, as the real file
 * publishes them: a 32-field establishment and a 6-field position.
 */
function establishment(id: string, category: string, name: string, dept = "11", com = "132") {
  const fields = new Array(32).fill("");
  fields[0] = "structureet";
  fields[1] = id;
  fields[4] = name;
  fields[12] = com;
  fields[13] = dept;
  fields[18] = category;
  return fields.join(";");
}

function position(id: string, x: string, y: string, level: string, method = "BAN") {
  return [
    "geolocalisation",
    id,
    x,
    y,
    `${level},ATLASANTE,96,${method},EPSG:2154`,
    "2026-05-04",
  ].join(";");
}

/** Fabrezan, from the real extract. */
const FABREZAN_X = "675577.2";
const FABREZAN_Y = "6226505.9";

describe("parseFiness", () => {
  it("joins an establishment to its position", () => {
    const [facility] = parseFiness(
      [
        establishment("110790433", "620", "SELARL ABCHIR"),
        position("110790433", FABREZAN_X, FABREZAN_Y, "1"),
      ].join("\n"),
    );

    expect(facility?.name).toBe("SELARL ABCHIR");
    expect(facility?.kind).toBe("pharmacy");
  });

  it("converts Lambert-93 to latitude and longitude", () => {
    // The source publishes projected coordinates. Unconverted, this pharmacy
    // would land in the Gulf of Guinea.
    const [facility] = parseFiness(
      [establishment("1", "620", "P"), position("1", FABREZAN_X, FABREZAN_Y, "1")].join("\n"),
    );

    expect(facility?.latitude).toBeCloseTo(43.1374, 3);
    expect(facility?.longitude).toBeCloseTo(2.7, 3);
  });

  it("joins the INSEE code the source splits in two", () => {
    // FINESS keeps département and commune apart and never joins them.
    const [facility] = parseFiness(
      [
        establishment("1", "620", "P", "11", "132"),
        position("1", FABREZAN_X, FABREZAN_Y, "1"),
      ].join("\n"),
    );

    expect(facility?.areaCode).toBe("11132");
  });

  it("pads a commune number the source left short", () => {
    const [facility] = parseFiness(
      [
        establishment("1", "620", "P", "01", "45"),
        position("1", "870262.2", "6571540.8", "1"),
      ].join("\n"),
    );

    expect(facility?.areaCode).toBe("01045");
  });

  it("carries the source's own statement of how precisely it located each one", () => {
    const rows = [
      establishment("a", "620", "Address"),
      position("a", FABREZAN_X, FABREZAN_Y, "1"),
      establishment("b", "620", "Street"),
      position("b", FABREZAN_X, FABREZAN_Y, "2"),
      establishment("c", "620", "Commune only"),
      position("c", FABREZAN_X, FABREZAN_Y, "4", "ADMIN-EXPRESS-2023"),
    ];
    const byName = Object.fromEntries(
      parseFiness(rows.join("\n")).map((f) => [f.name, f.precision]),
    );

    expect(byName).toEqual({ Address: "exact", Street: "zone", "Commune only": "commune" });
  });

  it("falls to the least precise for a level it does not recognise", () => {
    // Never overstate where something is because the source changed.
    const [facility] = parseFiness(
      [
        establishment("1", "620", "P"),
        position("1", FABREZAN_X, FABREZAN_Y, "9", "SOMETHING-NEW"),
      ].join("\n"),
    );

    expect(facility?.precision).toBe("commune");
  });

  it("keeps only the categories HomeGround has a mapping for", () => {
    const rows = [
      establishment("a", "620", "Pharmacy"),
      position("a", FABREZAN_X, FABREZAN_Y, "1"),
      establishment("b", "355", "Hospital"),
      position("b", FABREZAN_X, FABREZAN_Y, "1"),
      establishment("c", "500", "Care home"),
      position("c", FABREZAN_X, FABREZAN_Y, "1"),
    ];

    expect(
      parseFiness(rows.join("\n"))
        .map((f) => f.kind)
        .sort(),
    ).toEqual(["hospital", "pharmacy"]);
  });

  it("drops an establishment with no position rather than placing it nowhere", () => {
    expect(parseFiness(establishment("1", "620", "Unplaced"))).toEqual([]);
  });

  it("drops a position at the projection origin, which is a placeholder", () => {
    expect(
      parseFiness([establishment("1", "620", "P"), position("1", "0", "0", "1")].join("\n")),
    ).toEqual([]);
  });
});
