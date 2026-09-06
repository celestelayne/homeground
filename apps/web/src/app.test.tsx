import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app";
import type { Property } from "./api/types";

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

beforeEach(() => {
  stored = [];
  patches.length = 0;

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
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
