import type { PropertyStatus } from "../api/types.js";

/**
 * Map markers carry status by shape, exactly as the sidebar marks do, but at
 * map geometry: larger, with a white keyline so they read over any terrain.
 *
 * Built as plain DOM because MapLibre takes an element. It is a button so it
 * is focusable and reachable by keyboard, which a symbol layer drawn into the
 * canvas would not be.
 */
export function createMarkerElement(name: string, status: PropertyStatus): HTMLButtonElement {
  const button = document.createElement("button");

  button.type = "button";
  button.setAttribute("aria-label", name);
  button.className = "hg-marker";
  button.dataset.status = status;

  return button;
}
