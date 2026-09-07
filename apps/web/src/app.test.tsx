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

let stored: Property[] = [];
const patches: Array<{ id: string; body: unknown }> = [];
/** Every query the app actually sent to the geocoder, in order. */
let geocoded: string[] = [];

beforeEach(() => {
  stored = [];
  patches.length = 0;
  geocoded = [];

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/geocode")) {
      const query = new URL(url, "http://test").searchParams.get("q") ?? "";
      geocoded.push(query);

      return new Response(
        JSON.stringify({
          candidates: [
            {
              id: "candidate-1",
              label: query,
              latitude: 43.351,
              longitude: 2.889,
              precision: "commune",
            },
          ],
        }),
        { status: 200 },
      );
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

    render(<App />);

    const shortlist = await screen.findByRole("heading", { name: /Shortlist/ });
    expect(within(shortlist).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /To visit/ })).toBeInTheDocument();
  });

  it("keeps rejected properties in the list rather than removing them", async () => {
    stored = [property({ name: "Ruin near Le Caylar", status: "rejected" })];

    render(<App />);

    expect(await screen.findByRole("button", { name: /Ruin near Le Caylar/ })).toBeInTheDocument();
  });

  it("can hide and show rejected properties", async () => {
    stored = [
      property({ name: "Kept", status: "saved" }),
      property({ name: "Ruin near Le Caylar", status: "rejected" }),
    ];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Hide rejected properties" }));
    expect(screen.queryByRole("button", { name: /Ruin near Le Caylar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kept/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show rejected properties" }));
    expect(screen.getByRole("button", { name: /Ruin near Le Caylar/ })).toBeInTheDocument();
  });

  it("shows no price for a property that has none", async () => {
    stored = [property({ name: "No price", askingPrice: null })];

    render(<App />);

    const row = await screen.findByRole("button", { name: /No price/ });
    expect(row.textContent).toBe("No price");
  });
});

describe("selecting a property", () => {
  it("opens the detail panel", async () => {
    stored = [property({ name: "Mas above the village" })];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above the village/ }));

    expect(
      screen.getByRole("heading", { name: "Mas above the village", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/43\.3510, 2\.8890/)).toBeInTheDocument();
  });

  it("says how precisely the property is located", async () => {
    stored = [property({ locationTier: "commune" })];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above/ }));

    // The estimate stays visible rather than being dressed up as precision.
    expect(screen.getByText("Located to the commune only")).toBeInTheDocument();
  });

  it("closes the panel again", async () => {
    stored = [property()];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above/ }));
    await user.click(screen.getByRole("button", { name: "Close property" }));

    expect(screen.queryByRole("button", { name: "Close property" })).not.toBeInTheDocument();
  });
});

describe("changing a property", () => {
  it("saves a new status", async () => {
    stored = [property({ status: "saved" })];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above/ }));
    await user.click(screen.getByRole("button", { name: /Shortlist/ }));

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]?.body).toEqual({ status: "shortlist" });
  });

  it("saves notes when the field loses focus", async () => {
    stored = [property()];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above/ }));
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

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above/ }));
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

  it("carries a looked-up place into the add panel, and runs the lookup there", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole("textbox", { name: "Address, village or place name" }),
      "Montouliers",
    );
    await user.click(screen.getByRole("button", { name: "Look up" }));

    expect(screen.getByRole("heading", { name: "Add property" })).toBeInTheDocument();
    // The query arrives already searched: asking twice for the same lookup is
    // the thing the overlay's field exists to avoid.
    expect(await screen.findByRole("button", { name: /Montouliers/ })).toBeInTheDocument();
    expect(geocoded).toEqual(["Montouliers"]);
  });

  it("will not look up a query too short to mean anything", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole("textbox", { name: "Address, village or place name" }),
      "Mo",
    );

    expect(screen.getByRole("button", { name: "Look up" })).toBeDisabled();
  });

  it("opens the add panel without a lookup, for a place with no address", async () => {
    stored = [];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "place the point yourself" }));

    expect(screen.getByRole("heading", { name: "Add property" })).toBeInTheDocument();
    expect(geocoded).toEqual([]);
  });

  it("goes home from the logo, closing what was open", async () => {
    stored = [property({ name: "Mas above the village" })];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Mas above the village/ }));
    expect(screen.getByRole("heading", { name: "Mas above the village" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "HomeGround" }));

    expect(
      screen.queryByRole("heading", { name: "Mas above the village" }),
    ).not.toBeInTheDocument();
  });

  it("goes home from the logo while adding, abandoning the draft", async () => {
    stored = [property()];

    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "+ Add property" }));
    expect(screen.getByRole("heading", { name: "Add property" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "HomeGround" }));

    expect(screen.queryByRole("heading", { name: "Add property" })).not.toBeInTheDocument();
  });

  it("steps aside once a property exists", async () => {
    stored = [property()];

    render(<App />);
    await screen.findByRole("button", { name: /Mas above the village/ });

    expect(
      screen.queryByRole("heading", { name: "Find somewhere worth living." }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Saved properties" })).toBeInTheDocument();
  });
});
