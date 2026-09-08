import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readZip } from "../zip/read-zip.js";
import { DensityFormatError, parseDensityGrid } from "./parse.js";

const grid = readFileSync(path.resolve(import.meta.dirname, "__fixtures__/grille-densite.xlsx"));

describe("parseDensityGrid", () => {
  it("reads a commune's class from the published grid", () => {
    const classes = parseDensityGrid(grid);

    expect(classes.find((c) => c.code === "11132")).toEqual({
      code: "11132",
      level: 5,
      label: "Bourgs ruraux",
    });
  });

  it("finds the column names beneath the grid's four rows of headings", () => {
    // Read by name rather than by position: a column inserted upstream would
    // otherwise silently shift every commune into the wrong class.
    expect(parseDensityGrid(grid)).toHaveLength(5);
  });

  it("keeps INSEE's own words for a class", () => {
    // Not translated and not softened. A reader who wants to know what the
    // class means should find the same words at INSEE.
    const classes = parseDensityGrid(grid);

    expect(classes.find((c) => c.code === "11147")?.label).toBe("Rural à habitat très dispersé");
    expect(classes.find((c) => c.code === "34172")?.label).toBe("Grands centres urbains");
  });

  it("separates communes a population band would put together", () => {
    // The reason ADR-012 chose the grid: Narbonne and Tsingoni are worlds
    // apart by population and share a class by situation, and Fabrezan and
    // Fontanès-de-Sault are both small and do not.
    const classes = parseDensityGrid(grid);
    const level = (code: string) => classes.find((c) => c.code === code)?.level;

    expect(level("11132")).not.toBe(level("11147"));
    expect(level("11262")).toBe(level("97617"));
  });

  it("refuses a level outside the seven the grid defines", () => {
    // A grid gaining an eighth level is a grid whose meaning changed, and
    // continuing would compare communes against a class nobody defined.
    expect(() => parseDensityGrid(withLevel("8"))).toThrow(DensityFormatError);
  });

  it("refuses a workbook whose columns have changed", () => {
    expect(() => parseDensityGrid(withoutLabelColumn())).toThrow(DensityFormatError);
  });
});

/** The fixture, rewritten with one commune's level changed. */
function withLevel(level: string): Buffer {
  return rewrite((xml) => xml.replace("<t>5</t>", `<t>${level}</t>`));
}

function withoutLabelColumn(): Buffer {
  return rewrite((xml) => xml.replace("<t>LIBDENS</t>", "<t>SOMETHING_ELSE</t>"));
}

function rewrite(change: (xml: string) => string): Buffer {
  // Rebuilt as a stored (uncompressed) archive, which the reader also accepts,
  // so the test needs no zip writer.
  const files = new Map<string, Buffer>();

  for (const [name, content] of readZip(grid)) {
    files.set(name, Buffer.from(change(content.toString("utf8")), "utf8"));
  }

  return writeStoredZip(files);
}

function writeStoredZip(files: Map<string, Buffer>): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of files) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(content);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);

    const entry = Buffer.alloc(46 + nameBytes.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(content.length, 20);
    entry.writeUInt32LE(content.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    nameBytes.copy(entry, 46);

    locals.push(local, content);
    central.push(entry);
    offset += local.length + content.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}

function crc32(buffer: Buffer): number {
  let crc = ~0;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return ~crc >>> 0;
}
