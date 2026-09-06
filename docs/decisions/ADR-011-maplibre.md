# ADR-011: MapLibre

## Decision

HomeGround renders maps with MapLibre GL JS, over tiles served by IGN.

## Why

ADR-002 left the rendering library and the tile source undecided until a milestone rendered a map. M1 is that milestone.

The two are not independent choices. Mapbox GL JS has been proprietary since version 2, requires an access token to render at all, and Mapbox's terms tie their tiles to their own SDK. Choosing it means taking the renderer, the tiles and the billing together.

IGN already serves HomeGround's geocoding, and serves both a base map and aerial imagery without an API key. MapLibre consumes those directly.

M1 therefore ships with no API key and no billing relationship of any kind.

## Consequence

MapLibre GL JS renders the map. IGN serves the tiles.

MapLibre requires WebGL and does not run in jsdom, so component tests mock the single module that imports it. Confining MapLibre to one file is required for that, as well as by ADR-002's rule that provider-specific behaviour stays out of domain models.

IGN's base map is French cartographic styling rather than the muted tone the design asks for. It is toned down in the map itself, using raster paint properties, rather than with a CSS filter over the canvas.

This decision does not change ADR-002. Routing and travel-time calculation remain with Mapbox, which `docs/methodology.md` specifies. That is a server-side request and is unrelated to what renders tiles in a browser.
