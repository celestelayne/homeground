import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readZip, ZipError } from "./read-zip.js";

const sample = readFileSync(path.resolve(import.meta.dirname, "__fixtures__/sample.zip"));

describe("readZip", () => {
  it("reads a deflated entry", () => {
    const files = readZip(sample);
    const csv = files.get("data.csv")?.toString("utf8");

    expect(csv?.startsWith("code;value\n")).toBe(true);
    expect(csv?.trimEnd().split("\n")).toHaveLength(201);
  });

  it("reads a stored entry, which is not deflated at all", () => {
    expect(readZip(sample).get("nested/note.txt")?.toString("utf8")).toBe("hi");
  });

  it("names entries by their full path", () => {
    expect([...readZip(sample).keys()].sort()).toEqual(["data.csv", "nested/note.txt"]);
  });

  it("refuses something that is not an archive", () => {
    // An ingest handed an HTML error page must stop, not read zero communes.
    expect(() => readZip(Buffer.from("<html>503 Service Unavailable</html>"))).toThrow(ZipError);
  });

  it("refuses an archive whose central directory has been truncated", () => {
    expect(() => readZip(sample.subarray(0, sample.length - 40))).toThrow(ZipError);
  });

  it("refuses an entry whose inflated size is not the size claimed", () => {
    // Corruption that inflates to something shorter would otherwise arrive as
    // a plausible file with the last communes missing.
    const corrupted = Buffer.from(sample);
    const eocd = corrupted.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const central = corrupted.readUInt32LE(eocd + 16);
    corrupted.writeUInt32LE(999999, central + 24);

    expect(() => readZip(corrupted)).toThrow(ZipError);
  });
});
