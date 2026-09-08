import { describe, expect, it } from "vitest";
import commons from "./__fixtures__/commons-imageinfo.json" with { type: "json" };
import claims from "./__fixtures__/wikidata-claims.json" with { type: "json" };
import search from "./__fixtures__/wikidata-search.json" with { type: "json" };
import { toImage, toImageFile, toItemId } from "./commune-image.js";

describe("toItemId", () => {
  it("finds the item carrying the commune's INSEE code", () => {
    expect(toItemId(search)).toBe("Q628489");
  });

  it("returns null when nothing in Wikidata carries the code", () => {
    expect(toItemId({ query: { search: [] } })).toBeNull();
  });

  it("refuses a title that is not an item id", () => {
    // A page title HomeGround would then ask for claims on. Better to have
    // no picture than to fetch the claims of whatever this is.
    expect(toItemId({ query: { search: [{ title: "Wikidata:Project chat" }] } })).toBeNull();
  });
});

describe("toImageFile", () => {
  it("reads the Commons filename out of a recorded P18 claim", () => {
    expect(toImageFile(claims)).toBe("FabrezanVillage.png");
  });

  it("returns null when the item carries no picture", () => {
    // One commune in seven. An ordinary answer, not a failure.
    expect(toImageFile({ claims: {} })).toBeNull();
  });

  it("returns null when the query could not be answered at all", () => {
    expect(toImageFile(null)).toBeNull();
    expect(toImageFile({ error: "timeout" })).toBeNull();
  });
});

describe("toImage", () => {
  it("carries the credit the licence obliges", () => {
    const image = toImage("FabrezanVillage.png", commons);

    expect(image.artist).toBe("Alricfabrezan");
    expect(image.licence).toBe("CC BY-SA 3.0");
    expect(image.descriptionUrl).toBe(
      "https://commons.wikimedia.org/wiki/File:FabrezanVillage.png",
    );
  });

  it("strips the markup Commons wraps the artist in", () => {
    // extmetadata returns a link, not a name. Rendering it raw would print
    // HTML at the reader; dropping it would drop the attribution.
    expect(toImage("x.png", commons).artist).not.toContain("<");
  });

  it("serves the file at a width, not the original", () => {
    const { url } = toImage("FabrezanVillage.png", commons);

    expect(url).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/FabrezanVillage.png?width=1200",
    );
  });

  it("escapes a filename with spaces and punctuation", () => {
    // Commons titles are prose: "Château de Lagrasse (Aude).jpg".
    expect(toImage("Château de Lagrasse (Aude).jpg", null).url).toContain(
      "Ch%C3%A2teau%20de%20Lagrasse%20(Aude).jpg",
    );
  });

  it("keeps the photograph but says the credit is missing when Commons could not answer", () => {
    const image = toImage("FabrezanVillage.png", null);

    // Null artist means "not read", and the interface says so. An empty string
    // would read as a photograph with nobody to credit.
    expect(image.url).toContain("FabrezanVillage.png");
    expect(image.artist).toBeNull();
    expect(image.licence).toBeNull();
  });
});
