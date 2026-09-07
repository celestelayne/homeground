# ADR-011: Leaflet

## Decision

HomeGround renders maps with Leaflet, over tiles served by IGN.

## Why

ADR-002 left the rendering library and the tile source undecided until a milestone rendered a map. M1 is that milestone.

IGN already serves HomeGround's geocoding, and serves both a base map and aerial photography without an API key. So the application needs no credentials of any kind, which the geocoding decision established and this preserves.

MapLibre was tried first and abandoned. It parses styles and tiles in a web worker, and under this project's bundler that worker did not spawn: the map drew a canvas and its markers, requested no tiles, and reported nothing. The failure survived a production build, so it was not a development-server artefact. Leaflet renders raster tiles directly, with no worker and no WebGL, and worked without adjustment.

Mapbox GL JS was not a candidate for the same reason as MapLibre — it shares that architecture — and would additionally have required an access token and its own tiles, since its terms tie the two together.

## Consequence

Leaflet renders the map. IGN serves both the base map and the aerial photography used when placing a property.

Leaflet needs real layout and tile loading, so it does not run in jsdom. Component tests mock the single module that imports it. Confining Leaflet to one file is required for that, and by ADR-002's rule that provider-specific behaviour stays out of domain models. It also keeps the library replaceable: swapping MapLibre for Leaflet touched two files.

The calm basemap is a CSS filter over Leaflet's tile pane. Markers sit in a separate pane and keep their full contrast. The filter lifts while aerial photography is shown, which is there to be read rather than to be calm.

Leaflet renders overlay geometry as DOM rather than in WebGL. Milestones that draw many polygons, such as burned areas or isochrones, should confirm it performs adequately before depending on it.

This decision does not change ADR-002. Routing and travel-time calculation remain with Mapbox, which `docs/methodology.md` specifies. That is a server-side request and is unrelated to what draws tiles in a browser.
