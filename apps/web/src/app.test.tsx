import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app";
import type { Property } from "./api/types";

/**
 * Leaflet needs real layout and tile loading, neither of which jsdom provides.
 * Confining it to one module (ADR-011) means one mock covers every test that
 * renders the app. The map's own behaviour is verified in the browser instead.
 */
vi.mock("./properties/property-map", () => ({
  PropertyMap: () => null,
  REGION_VIEW: { latitude: 43.7, longitude: 3.6, zoom: 8 },
}));

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: crypto.randomUUID(),
    name: "Mas above the village",
    address: "Montouliers",
    latitude: 43.351,
    longitude: 2.889,
    locationTier: "zone",
    askingPrice: 415000,
    listingUrl: null,
    status: "saved",
    notes: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * The root route is the landing hero, so the saved list sits behind it. Every
 * test that works with the list dismisses the hero first, the way a user would.
 */
async function renderWithList() {
  render(<App />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Close and return to the map" }));

  return user;
}

let stored: Property[] = [];
const patches: Array<{ id: string; body: unknown }> = [];
/** Every query the app actually sent to the geocoder, in order. */
let geocoded: string[] = [];
/** Every INSEE code the app actually asked the areas endpoint for. */
let areasFetched: string[] = [];

beforeEach(() => {
  stored = [];
  patches.length = 0;
  geocoded = [];
  areasFetched = [];

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/sources")) {
      return new Response(
        JSON.stringify({
          sources: [
            {
              id: "insee-census",
              name: "Recensement de la population",
              publisher: "INSEE",
              description: "Housing occupancy by commune.",
              url: "https://api.insee.fr/melodi",
              cadence: "Annual",
              coverage: "France",
              licence: "Licence Ouverte 2.0",
              limitations: ["Figures are weighted estimates, not counts."],
              metrics: ["dwellings.secondHomeShare"],
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url.startsWith("/api/areas/")) {
      const code = url.split("/").pop() as string;
      areasFetched.push(code);

      return new Response(
        JSON.stringify({
          code,
          name: "Fabrezan",
          postcodes: ["11200"],
          department: { code: "11", name: "Aude" },
          region: { code: "76", name: "Occitanie" },
          intercommunality: { code: "200035863", name: "CC Corbières et Minervois" },
          centre: { latitude: 43.1282, longitude: 2.7139 },
          boundary: null,
          evidence: [
            {
              metric: "population",
              value: 1306,
              unit: "residents",
              state: "known",
              sourceId: "geo-api-gouv",
              observedAt: null,
              method: "geo-api-commune",
              methodVersion: 1,
            },
            {
              metric: "dwellings.secondHomeShare",
              value: 23.52,
              unit: "%",
              state: "estimated",
              sourceId: "insee-census",
              observedAt: "2023-01-01T00:00:00.000Z",
              method: "second-home-share-of-all-dwellings",
              methodVersion: 1,
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url.startsWith("/api/geocode")) {
      const query = new URL(url, "http://test").searchParams.get("q") ?? "";
      geocoded.push(query);

      const candidate = (label: string, communeCode: string) => ({
        id: `candidate-${communeCode}`,
        label,
        latitude: 43.351,
        longitude: 2.889,
        precision: "commune",
        communeCode,
      });

      // A postcode names several communes; a commune name usually names one.
      const candidates = /^\d{5}$/.test(query)
        ? [candidate("Lézignan-Corbières", "11203"), candidate("Fabrezan", "11132")]
        : [candidate(query, "11132")];

      return new Response(JSON.stringify({ candidates }), { status: 200 });
    }

    if (init?.method === "PATCH") {
      const id = url.split("/").pop() as string;
      const body = JSON.parse(String(init.body));
      patches.push({ id, body });
      stored = stored.map((p) => (p.id === id ? { ...p, ...body } : p));
      return new Response(JSON.stringify(stored.find((p) => p.id === id)), { status: 200 });
    }

    return new Response(JSON.stringify({ properties: stored }), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the saved properties list", () => {
  it("groups properties by status, with a count for each", async () => {
    stored = [
      property({ name: "Shortlisted one", status: "shortlist" }),
      property({ name: "Shortlisted two", status: "shortlist" }),
      property({ name: "To visit one", status: "visit" }),
    ];

    await renderWithList();

    const shortlist = await screen.findByRole("heading", { name: /Shortlist/ });
    expect(within(shortlist).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /To visit/ })).toBeInTheDocument();
  });

  it("keeps rejected properties in the list rather than removing them", async () => {
    stored = [property({ name: "Ruin near Le Caylar", status: "rejected" })];

    await renderWithList();

    expect(screen.getByRole("button", { name: /Ruin near Le Caylar/ })).toBeInTheDocument();
  });

  it("can hide and show rejected properties", async () => {
    stored = [
      property({ name: "Kept", status: "saved" }),
      property({ name: "Ruin near Le Caylar", status: "rejected" }),
    ];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: "Hide rejected properties" }));
    expect(screen.queryByRole("button", { name: /Ruin near Le Caylar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kept/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show rejected properties" }));
    expect(screen.getByRole("button", { name: /Ruin near Le Caylar/ })).toBeInTheDocument();
  });

  it("shows no price for a property that has none", async () => {
    stored = [property({ name: "No price", askingPrice: null })];

    await renderWithList();

    const row = screen.getByRole("button", { name: /No price/ });
    expect(row.textContent).toBe("No price");
  });
});

describe("selecting a property", () => {
  it("opens the detail panel", async () => {
    stored = [property({ name: "Mas above the village" })];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above the village/ }));

    expect(
      screen.getByRole("heading", { name: "Mas above the village", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/43\.3510, 2\.8890/)).toBeInTheDocument();
  });

  it("says how precisely the property is located", async () => {
    stored = [property({ locationTier: "commune" })];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above/ }));

    // The estimate stays visible rather than being dressed up as precision.
    expect(screen.getByText("Located to the commune only")).toBeInTheDocument();
  });

  it("closes the panel again", async () => {
    stored = [property()];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above/ }));
    await user.click(screen.getByRole("button", { name: "Close property" }));

    expect(screen.queryByRole("button", { name: "Close property" })).not.toBeInTheDocument();
  });
});

describe("changing a property", () => {
  it("saves a new status", async () => {
    stored = [property({ status: "saved" })];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above/ }));
    await user.click(screen.getByRole("button", { name: /Shortlist/ }));

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]?.body).toEqual({ status: "shortlist" });
  });

  it("saves notes when the field loses focus", async () => {
    stored = [property()];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above/ }));
    const notes = screen.getByRole("textbox", { name: /Your notes/ });

    await user.type(notes, "Loved this village");
    // Typing must not drop focus: a field component declared inside a render
    // body remounts on every keystroke.
    expect(notes).toHaveFocus();
    expect(notes).toHaveValue("Loved this village");

    await user.tab();
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]?.body).toEqual({ notes: "Loved this village" });
  });

  it("does not save notes that did not change", async () => {
    stored = [property({ notes: "Unchanged" })];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above/ }));
    await user.click(screen.getByRole("textbox", { name: /Your notes/ }));
    await user.tab();

    expect(patches).toHaveLength(0);
  });
});

describe("before anything is saved", () => {
  it("introduces the product over the map", async () => {
    stored = [];

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Find somewhere worth living." }),
    ).toBeInTheDocument();
  });

  it("hides the saved properties column, which has nothing to list", async () => {
    stored = [];

    render(<App />);
    await screen.findByRole("heading", { name: "Find somewhere worth living." });

    expect(
      screen.queryByRole("complementary", { name: "Saved properties" }),
    ).not.toBeInTheDocument();
  });

  it("looks a commune up from the hero, and the sidebar describes it", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    const hero = within(await screen.findByRole("form", { name: "Look up a place" }));
    await user.type(hero.getByRole("textbox"), "Fabrezan");
    await user.click(hero.getByRole("button", { name: "Look up" }));

    // Geocoded to a commune, then that commune's facts fetched by INSEE code.
    expect(geocoded).toEqual(["Fabrezan"]);
    await waitFor(() => expect(areasFetched).toEqual(["11132"]));

    expect(await screen.findByRole("heading", { name: /Fabrezan/ })).toBeInTheDocument();
    expect(screen.getByText(/1,306 residents/)).toBeInTheDocument();
    // Every figure says where it came from.
    expect(screen.getAllByText(/INSEE census|Découpage administratif/).length).toBeGreaterThan(0);
  });

  it("says the results are area-level, not about a house", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    const hero = within(await screen.findByRole("form", { name: "Look up a place" }));
    await user.type(hero.getByRole("textbox"), "Fabrezan");
    await user.click(hero.getByRole("button", { name: "Look up" }));

    // The caveat is not optional decoration. Commune-derived results describe
    // the commune, per specs/property.md.
    expect(await screen.findByText(/not this specific house/)).toBeInTheDocument();
  });

  it("steps the hero aside once something has been looked up", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    const hero = within(await screen.findByRole("form", { name: "Look up a place" }));
    await user.type(hero.getByRole("textbox"), "Fabrezan");
    await user.click(hero.getByRole("button", { name: "Look up" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Find somewhere worth living." }),
      ).not.toBeInTheDocument(),
    );
  });

  it("will not choose between communes when a postcode names several", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    const hero = within(await screen.findByRole("form", { name: "Look up a place" }));
    await user.type(hero.getByRole("textbox"), "11200");
    await user.click(hero.getByRole("button", { name: "Look up" }));

    // 11200 covers five real communes. Picking the top one would silently
    // research somewhere the user did not ask about.
    expect(await screen.findByText(/matches 2 communes/)).toBeInTheDocument();
    expect(areasFetched).toEqual([]);

    await user.click(screen.getByRole("button", { name: /Fabrezan/ }));

    await waitFor(() => expect(areasFetched).toEqual(["11132"]));
  });

  it("will not look up a query too short to mean anything", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    const hero = within(await screen.findByRole("form", { name: "Look up a place" }));
    await user.type(hero.getByRole("textbox"), "Mo");

    expect(hero.getByRole("button", { name: "Look up" })).toBeDisabled();
  });

  it("opens the add panel without a lookup, for a place with no address", async () => {
    stored = [];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: "place the point yourself" }));

    expect(screen.getByRole("heading", { name: "Add property" })).toBeInTheDocument();
    expect(geocoded).toEqual([]);
  });

  it("goes home from the logo, closing what was open", async () => {
    stored = [property({ name: "Mas above the village" })];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: /Mas above the village/ }));
    expect(screen.getByRole("heading", { name: "Mas above the village" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "HomeGround" }));

    expect(
      screen.queryByRole("heading", { name: "Mas above the village" }),
    ).not.toBeInTheDocument();
  });

  it("goes home from the logo while adding, abandoning the draft", async () => {
    stored = [property()];

    const user = await renderWithList();

    await user.click(screen.getByRole("button", { name: "HomeGround" }));
    await user.click(screen.getByRole("button", { name: "place the point yourself" }));
    expect(screen.getByRole("heading", { name: "Add property" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "HomeGround" }));

    expect(screen.queryByRole("heading", { name: "Add property" })).not.toBeInTheDocument();
  });

  it("shows the landing hero on the root route, even with properties saved", async () => {
    // Looking a commune up is what a user arrives wanting to do, so it is what
    // they are shown — whether or not anything has been saved.
    stored = [property()];

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Find somewhere worth living." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Address, village or place name" })).toBeVisible();
    // The list is behind it, not gone.
    expect(screen.queryByRole("button", { name: /Mas above the village/ })).not.toBeInTheDocument();
  });

  it("reveals the saved list once the hero is dismissed", async () => {
    stored = [property()];

    const user = await renderWithList();

    expect(screen.getByRole("button", { name: /Mas above the village/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Find somewhere worth living." }),
    ).not.toBeInTheDocument();

    // And the logo brings it back.
    await user.click(screen.getByRole("button", { name: "HomeGround" }));

    expect(
      screen.getByRole("heading", { name: "Find somewhere worth living." }),
    ).toBeInTheDocument();
  });

  it("offers no way out when there is nothing behind it", async () => {
    stored = [];

    render(<App />);
    await screen.findByRole("heading", { name: "Find somewhere worth living." });

    expect(
      screen.queryByRole("button", { name: "Close and return to the map" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the saved list reachable behind it", async () => {
    stored = [property()];

    await renderWithList();

    expect(screen.getByRole("complementary", { name: "Saved properties" })).toBeInTheDocument();
  });
});

describe("sources and methodology", () => {
  it("says what HomeGround does and does not claim", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Sources & methodology" }));

    const panel = within(await screen.findByRole("region", { name: "Sources and methodology" }));
    expect(panel.getByText(/does not judge a property/)).toBeInTheDocument();
    expect(panel.getByText(/does not tell you whether anywhere is safe/)).toBeInTheDocument();
  });

  it("states a limitation for every source it lists", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Sources & methodology" }));

    const panel = within(await screen.findByRole("region", { name: "Sources and methodology" }));
    // The panel exists to say what a source cannot tell you.
    expect(
      await panel.findByText(/Figures are weighted estimates, not counts./),
    ).toBeInTheDocument();
    expect(panel.getByText(/Limitation\./)).toBeInTheDocument();
  });

  it("names what each source is the origin of, in the words the figures use", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Sources & methodology" }));

    const panel = within(await screen.findByRole("region", { name: "Sources and methodology" }));
    expect(await panel.findByText(/Second homes, share of all/)).toBeInTheDocument();
  });

  it("closes again", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Sources & methodology" }));
    await user.click(await screen.findByRole("button", { name: "Close sources and methodology" }));

    expect(
      screen.queryByRole("region", { name: "Sources and methodology" }),
    ).not.toBeInTheDocument();
  });
});
