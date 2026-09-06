import type { PropertyStatus } from "../api/types.js";

/**
 * Map markers carry status by shape, as the sidebar marks do, but at map
 * geometry: larger, with a white keyline so they read over any terrain.
 *
 * Built as plain DOM because MapLibre takes an element. It is a button so it is
 * focusable and reachable by keyboard, which a symbol layer drawn into the
 * canvas would not be.
 *
 * The shape lives in a child element. MapLibre writes `transform` onto the
 * element it is given, and CSS `rotate` and `scale` compose with that same
 * transform, so styling the button directly means fighting the map for it:
 * the rotated marker inflates its own box and hover flickers as MapLibre
 * rewrites the transform each frame.
 */
export function createMarkerElement(name: string, status: PropertyStatus): HTMLButtonElement {
  const button = document.createElement("button");

  button.type = "button";
  button.setAttribute("aria-label", name);
  button.className = "hg-marker";
  button.dataset.status = status;

  const shape = document.createElement("span");
  shape.className = "hg-marker-shape";
  shape.setAttribute("aria-hidden", "true");
  button.append(shape);

  return button;
}
