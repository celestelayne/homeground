import { describe, expect, it } from "vitest";
import type { GeocodeCandidate } from "../api/types.js";
import { type AddPropertyDraft, canSave, emptyDraft, reduce } from "./add-property-machine.js";

const candidate: GeocodeCandidate = {
  id: "34172_2250_00012",
  label: "12 Rue Foch 34000 Montpellier",
  latitude: 43.610962,
  longitude: 3.874026,
  precision: "exact",
  communeCode: "34172",
};

const named = (draft: AddPropertyDraft) => reduce(draft, { type: "name-changed", value: "Le Mas" });

describe("saving is gated on a confirmed location", () => {
  it("refuses an empty draft", () => {
    expect(canSave(emptyDraft)).toBe(false);
  });

  it("refuses a name and a typed address with nothing confirmed", () => {
    let draft = named(emptyDraft);
    draft = reduce(draft, { type: "query-changed", value: "Montouliers" });

    // Typing an address is not the same as knowing where the property is.
    expect(canSave(draft)).toBe(false);
  });

  it("refuses a confirmed location with no name", () => {
    const draft = reduce(emptyDraft, { type: "candidate-confirmed", candidate });

    expect(draft.location.kind).toBe("confirmed");
    expect(canSave(draft)).toBe(false);
  });

  it("allows a name plus a confirmed candidate", () => {
    const draft = named(reduce(emptyDraft, { type: "candidate-confirmed", candidate }));

    expect(canSave(draft)).toBe(true);
  });
});

describe("editing the address abandons a confirmed location", () => {
  it("drops out of confirmed when the address is retyped", () => {
    let draft = named(reduce(emptyDraft, { type: "candidate-confirmed", candidate }));
    expect(canSave(draft)).toBe(true);

    draft = reduce(draft, { type: "query-changed", value: "Lyon" });

    // Otherwise you confirm one village, retype another, and save the second
    // name against the first village's coordinates.
    expect(draft.location.kind).not.toBe("confirmed");
    expect(canSave(draft)).toBe(false);
  });

  it("clears the declared tier along with the location", () => {
    let draft = named(reduce(emptyDraft, { type: "candidate-confirmed", candidate }));
    draft = reduce(draft, { type: "query-changed", value: "Lyon" });

    expect(draft.tier).toBeNull();
  });
});

describe("the location tier", () => {
  it("takes the geocoder's precision as a starting point", () => {
    const draft = reduce(emptyDraft, { type: "candidate-confirmed", candidate });

    expect(draft.tier).toBe("exact");
  });

  it("is left undeclared for a point placed on the map", () => {
    const draft = named(
      reduce(emptyDraft, { type: "placed-on-map", latitude: 43.35, longitude: 2.88 }),
    );

    // A placed point may be a rooftop or a guess at a hillside, and only the
    // person who placed it knows which.
    expect(draft.location.kind).toBe("confirmed");
    expect(draft.tier).toBeNull();
    expect(canSave(draft)).toBe(false);
  });

  it("allows saving once the user declares one", () => {
    let draft = named(
      reduce(emptyDraft, { type: "placed-on-map", latitude: 43.35, longitude: 2.88 }),
    );
    draft = reduce(draft, { type: "tier-declared", tier: "zone" });

    expect(canSave(draft)).toBe(true);
  });
});

describe("distinguishing a geocoder that found nothing from one that failed", () => {
  it("reports no matches when the geocoder answered with none", () => {
    const draft = reduce(emptyDraft, {
      type: "candidates-returned",
      query: "nowhere",
      candidates: [],
    });

    expect(draft.location.kind).toBe("no-matches");
  });

  it("reports the lookup as unavailable when it could not answer", () => {
    const draft = reduce(emptyDraft, { type: "lookup-failed", query: "Montouliers" });

    expect(draft.location.kind).toBe("lookup-unavailable");
  });
});

describe("a suggested name", () => {
  it("fills an empty name", () => {
    const draft = reduce(emptyDraft, {
      type: "listing-url-changed",
      value: "https://example.com/34310-montouliers",
      suggestedName: "Maison, Montouliers",
    });

    expect(draft.name).toBe("Maison, Montouliers");
  });

  it("never overwrites a name the user typed", () => {
    let draft = reduce(emptyDraft, { type: "name-changed", value: "Le Mas" });
    draft = reduce(draft, {
      type: "listing-url-changed",
      value: "https://example.com/34310-montouliers",
      suggestedName: "Maison, Montouliers",
    });

    expect(draft.name).toBe("Le Mas");
  });
});
