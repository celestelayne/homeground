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
vi.mock("./map/area-map", () => ({
  AreaMap: () => null,
  REGION_VIEW: { latitude: 43.7, longitude: 3.6, zoom: 8 },
}));

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
          facilities: [
            {
              id: "110790433",
              kind: "pharmacy",
              name: "Pharmacie du Marché",
              address: "2 BD Jean Jaurès",
              latitude: 43.1301,
              longitude: 2.716,
              precision: "exact",
              sourceId: "finess",
            },
            {
              id: "110790999",
              kind: "pharmacy",
              name: "Pharmacie located only to the commune",
              address: null,
              latitude: 43.1282,
              longitude: 2.7139,
              precision: "commune",
              sourceId: "finess",
            },
          ],
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
              metric: "population.density",
              value: null,
              unit: null,
              state: "unknown",
              sourceId: "geo-api-gouv",
              observedAt: null,
              method: "geo-api-commune",
              methodVersion: 1,
            },
            {
              metric: "dwellings.secondHomeShare",
              value: 25.36,
              unit: "%",
              state: "estimated",
              sourceId: "insee-census",
              observedAt: "2012-01-01T00:00:00.000Z",
              method: "second-home-share-of-all-dwellings",
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
        commune: label,
        context: "11, Aude, Occitanie",
        postcode: "11200",
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

/**
 * Types into the hero's search and picks the commune, the way a reader does.
 * Nothing is looked up until one is chosen — typing is only a question.
 */
async function lookUp(name = "Fabrezan") {
  render(<App />);
  const user = userEvent.setup();
  await user.type(await screen.findByRole("searchbox", { name: "Search communes" }), name);

  const results = within(await screen.findByRole("status", { name: "Search results" }));
  await user.click(await results.findByRole("button", { name: new RegExp(name) }));

  return user;
}

/** The research figures sit in a section that starts closed. */
async function openResearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Research around/ }));
}

describe("the landing hero", () => {
  it("introduces the product over the map", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Understand the community, not just the property.",
      }),
    ).toBeInTheDocument();
  });

  it("has no overview panel, because nothing has been looked up", async () => {
    render(<App />);
    await screen.findByRole("heading", {
      name: "Understand the community, not just the property.",
    });

    expect(screen.queryByRole("region", { name: "Commune overview" })).not.toBeInTheDocument();
  });

  it("steps aside once something has been looked up", async () => {
    await lookUp();

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Understand the community, not just the property." }),
      ).not.toBeInTheDocument(),
    );
  });

  it("comes back from the logo", async () => {
    const user = await lookUp();
    await screen.findByRole("heading", { name: /Fabrezan/ });

    await user.click(screen.getByRole("button", { name: "HomeGround" }));

    expect(
      screen.getByRole("heading", { name: "Understand the community, not just the property." }),
    ).toBeInTheDocument();
  });
});

describe("the commune overview", () => {
  it("names the commune and where it sits", async () => {
    await lookUp();

    expect(await screen.findByRole("heading", { name: /Fabrezan/ })).toBeInTheDocument();
    expect(screen.getByText(/Aude · Occitanie/)).toBeInTheDocument();
  });

  it("writes no description of the commune, because no source publishes one", async () => {
    await lookUp();

    expect(await screen.findByText(/HomeGround does not write its own/)).toBeInTheDocument();
  });

  it("scopes the figures to the whole commune", async () => {
    const user = await lookUp();
    await openResearch(user);

    expect(
      screen.getByText(/describe the whole commune, not any single address/),
    ).toBeInTheDocument();
  });

  it("keeps the research figures closed until asked for", async () => {
    // Supporting context, not the reason somebody opened the screen.
    const user = await lookUp();
    expect(screen.queryByText(/1,306 residents/)).not.toBeInTheDocument();

    await openResearch(user);
    expect(await screen.findByText(/1,306 residents/)).toBeInTheDocument();
  });

  it("shows the latest census edition, not every one it holds", async () => {
    const user = await lookUp();
    await openResearch(user);

    // Three editions are held, because M3 compares against the trend. A brief
    // answers the question once.
    expect(await screen.findByText(/23\.5%/)).toBeInTheDocument();
    expect(screen.queryByText(/25\.4%/)).not.toBeInTheDocument();
  });

  it("says Unknown where a source had nothing, rather than nothing at all", async () => {
    const user = await lookUp();
    await openResearch(user);

    const research = within(await screen.findByRole("region", { name: /Research around/ }));
    expect(research.getByText("Density")).toBeInTheDocument();
    expect(research.getByText("Unknown")).toBeInTheDocument();
  });

  it("hides the commune outline without abandoning the research", async () => {
    const user = await lookUp();

    await user.click(await screen.findByRole("button", { name: /Hide the commune outline/ }));

    expect(screen.getByRole("heading", { name: /Fabrezan/ })).toBeInTheDocument();
    const back = screen.getByRole("button", { name: /Show the commune outline/ });
    expect(back).toHaveAttribute("aria-pressed", "false");

    await user.click(back);
    expect(screen.getByRole("button", { name: /Hide the commune outline/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("area amenities", () => {
  it("numbers the list, and leaves out what the source could not place", async () => {
    await lookUp();

    // Two pharmacies in the fixture; one is located only to its commune, so
    // its coordinate is the commune centre and it gets no number and no pin.
    expect(await screen.findByText("1 shown")).toBeInTheDocument();
    expect(screen.getByText("Pharmacie du Marché")).toBeInTheDocument();
    expect(screen.queryByText("Pharmacie located only to the commune")).not.toBeInTheDocument();
  });

  it("shows a street address and a distance, not a travel time", async () => {
    // Minutes need a routing provider and somewhere to travel from.
    await lookUp();

    expect(await screen.findByText(/2 BD Jean Jaurès/)).toBeInTheDocument();
    expect(screen.getByText(/from the centre/)).toBeInTheDocument();
  });

  it("renumbers when a category is switched off", async () => {
    const user = await lookUp();
    await screen.findByText("1 shown");

    await user.click(screen.getByRole("button", { name: /Pharmacies/ }));

    expect(await screen.findByText("0 shown")).toBeInTheDocument();
    expect(screen.queryByText("Pharmacie du Marché")).not.toBeInTheDocument();
  });

  it("counts every facility beside its category, drawable or not", async () => {
    // Two pharmacies in the fixture; only one can be placed. The category
    // count is what the register holds, which is the figure that left the
    // research table.
    await lookUp();

    const toggle = await screen.findByRole("button", { name: /Pharmacies/ });
    expect(within(toggle).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1 shown")).toBeInTheDocument();
  });

  it("says why a commune can show nothing while its category counts something", async () => {
    const user = await lookUp();
    await user.click(screen.getByRole("button", { name: /Pharmacies/ }));

    expect(
      await screen.findByText(/located only to its commune is counted beside its category/),
    ).toBeInTheDocument();
  });
});

describe("looking a commune up", () => {
  it("offers what the query could mean, and chooses nothing on its own", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByRole("searchbox", { name: "Search communes" }), "11200");

    // 11200 covers five real communes. Picking the top one would silently
    // research somewhere the user did not ask about.
    const results = within(await screen.findByRole("status", { name: "Search results" }));
    expect(await results.findByText(/2 communes/)).toBeInTheDocument();
    expect(areasFetched).toEqual([]);

    await user.click(results.getByRole("button", { name: /Fabrezan/ }));

    await waitFor(() => expect(areasFetched).toEqual(["11132"]));
  });

  it("shows where each match is, so two of a name can be told apart", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByRole("searchbox", { name: "Search communes" }), "11200");

    const results = within(await screen.findByRole("status", { name: "Search results" }));
    // Both matches carry it, which is the point: it is what tells them apart.
    expect((await results.findAllByText(/11200 · Aude · Occitanie/)).length).toBe(2);
  });

  it("keeps the results with the search, not in the overview", async () => {
    // These states used to render in the panel, which meant a half-typed query
    // took over the place a commune's figures belong.
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByRole("searchbox", { name: "Search communes" }), "11200");

    await screen.findByRole("status", { name: "Search results" });
    expect(screen.queryByRole("region", { name: "Commune overview" })).not.toBeInTheDocument();
  });

  it("keeps the hero up while the query is being answered", async () => {
    // Standing down at the first keystroke left the reading half blank for as
    // long as the network took.
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByRole("searchbox", { name: "Search communes" }), "11200");
    await screen.findByRole("status", { name: "Search results" });

    expect(
      screen.getByRole("heading", { name: "Understand the community, not just the property." }),
    ).toBeInTheDocument();
  });

  it("asks nothing of the geocoder until the query could mean something", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(await screen.findByRole("searchbox", { name: "Search communes" }), "Mo");

    await waitFor(() => expect(geocoded).toEqual([]));
  });

  it("opens the header search from a circle, covering the bar", async () => {
    render(<App />);
    const user = userEvent.setup();

    // Collapsed, it is one button and no field.
    const circle = screen.getByRole("button", { name: "Search communes" });
    expect(circle).toHaveAttribute("aria-expanded", "false");

    await user.click(circle);

    expect(screen.getAllByRole("searchbox", { name: "Search communes" }).length).toBe(2);
  });

  it("closes the header search again", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Search communes" }));
    await user.click(screen.getByRole("button", { name: "Close search" }));

    expect(screen.getAllByRole("searchbox", { name: "Search communes" }).length).toBe(1);
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
