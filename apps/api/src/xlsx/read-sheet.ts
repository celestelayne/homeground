import { readZip } from "../zip/read-zip.js";

/**
 * Enough of xlsx to read a published table.
 *
 * INSEE publishes the density grid as a workbook and in no other
 * machine-readable form — no national CSV exists, and data.gouv carries only
 * regional fragments. ADR-012 records why HomeGround reads the workbook rather
 * than asking someone to convert it by hand: a conversion step nobody records
 * is a step that silently changes.
 *
 * An xlsx is a zip of XML. A sheet holds numbers inline and text as an index
 * into a shared string table, which is the only real complication here.
 *
 * This reads values, not formatting, formulas, dates or merged cells. It is
 * for reading a published table of codes and labels, and nothing more.
 */

export class XlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxError";
  }
}

/** Every row of one named sheet, as text. */
export function readSheet(workbook: Buffer, sheetName: string): string[][] {
  const files = readZip(workbook);
  const target = sheetPath(files, sheetName);
  const sheet = decode(files, target);
  const shared = sharedStrings(files);
  const rows: string[][] = [];

  for (const [, body] of sheet.matchAll(/<row[^>]*>(.*?)<\/row>/gs)) {
    rows.push(cells(body ?? "", shared));
  }

  return rows;
}

function sheetPath(files: Map<string, Buffer>, sheetName: string): string {
  const workbook = decode(files, "xl/workbook.xml");
  const relationships = decode(files, "xl/_rels/workbook.xml.rels");
  const declared = [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  const found = declared.find(([, name]) => name === sheetName);

  if (!found) {
    throw new XlsxError(
      `The workbook has no sheet named ${sheetName}. It has: ${declared
        .map(([, name]) => name)
        .join(", ")}`,
    );
  }

  // Sheets are not numbered in the order they are declared — the grid's first
  // sheet is sheet3.xml — so the relationship id is the only way through.
  const relationship = new RegExp(`Id="${found[2]}"[^>]*Target="([^"]+)"`).exec(relationships);

  if (!relationship) {
    throw new XlsxError(`Sheet ${sheetName} declares a relationship the workbook does not hold`);
  }

  return `xl/${(relationship[1] as string).replace(/^\/?xl\//, "")}`;
}

/**
 * The shared string table. Absent from a workbook with no text at all, which
 * is legal and is not an error.
 */
function sharedStrings(files: Map<string, Buffer>): string[] {
  if (!files.has("xl/sharedStrings.xml")) {
    return [];
  }

  const xml = decode(files, "xl/sharedStrings.xml");

  // A string can be split across runs — <si><r><t>Rural </t></r><r><t>à
  // habitat</t></r></si> — so every fragment inside one entry is joined.
  return [...xml.matchAll(/<si>(.*?)<\/si>/gs)].map(([, entry]) =>
    [...(entry ?? "").matchAll(/<t[^>]*>(.*?)<\/t>/gs)]
      .map(([, text]) => decodeEntities(text ?? ""))
      .join(""),
  );
}

function cells(row: string, shared: string[]): string[] {
  const values: string[] = [];

  for (const [, attributes, body] of row.matchAll(/<c\b([^>]*)>(.*?)<\/c>/gs)) {
    const type = /t="(\w+)"/.exec(attributes ?? "")?.[1];
    const inline = /<is>.*?<t[^>]*>(.*?)<\/t>.*?<\/is>/s.exec(body ?? "")?.[1];
    const raw = /<v>(.*?)<\/v>/s.exec(body ?? "")?.[1];

    if (inline !== undefined) {
      values.push(decodeEntities(inline));
    } else if (type === "s" && raw !== undefined) {
      const text = shared[Number(raw)];

      if (text === undefined) {
        throw new XlsxError(`A cell points at shared string ${raw}, which does not exist`);
      }

      values.push(text);
    } else {
      values.push(decodeEntities(raw ?? ""));
    }
  }

  return values;
}

function decode(files: Map<string, Buffer>, name: string): string {
  const file = files.get(name);

  if (!file) {
    throw new XlsxError(`Not a workbook: ${name} is missing`);
  }

  return file.toString("utf8");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}
