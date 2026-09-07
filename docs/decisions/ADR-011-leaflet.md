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

## Amendment — the base map moves to Mapbox

Leaflet is unchanged. The base map tile source changes from IGN to Mapbox.

### What this corrects above

The paragraph on Mapbox GL JS said it "would additionally have required an access token and its own tiles, since its terms tie the two together." That is true of Mapbox GL JS and remains the reason it is not the renderer. It should not be read as ruling out Mapbox tiles underneath Leaflet, which is a different and explicitly supported path: Mapbox's Static Tiles API documents Leaflet as a raster tile client. Rejecting the renderer did not reject the tiles.

### Why

IGN's Plan IGN is the most detailed and most authoritative base map of France available, and it is free. It is also drawn for a French institutional audience rather than for reading a property's surroundings, and no CSS filter fixes that — filtering adjusts colour, not what the cartography chose to draw and label. Slow first tile loads made it worse to work with.

The alternatives were compared by looking, using a temporary picker rather than by argument. CARTO's Positron and Voyager turned out to require a key, contrary to what was assumed. Esri's Light Gray Canvas is keyless but nearly empty at the zooms this application uses. OpenTopoMap is keyless and far too loud. MapTiler renders well and is the closest competitor.

Mapbox wins on a reason unrelated to cartography: ADR-002 already commits routing to it. Choosing MapTiler for tiles would mean two accounts, two keys and two vendors to hold a relationship with, for a base map that is not clearly better. Consolidating is worth more than the marginal difference between two good raster styles.

### Consequence

**HomeGround now requires a credential.** The property this ADR and ADR-010 both preserved is gone. Concretely:

- `VITE_MAPBOX_TOKEN` is compiled into the browser bundle and is readable by anyone who opens the page. This is inherent to client-side tile keys, not a defect. It is protected by an HTTP origin restriction set in the Mapbox account, and that restriction is the protection — not secrecy.
- The browser token and the server-side routing token should be separate tokens with different restrictions once anything is deployed. Today they hold the same value.
- Anyone running the repository without a token still gets a working map. IGN remains in the base map list and the application falls back to it, so a missing key shortens the picker rather than rendering blank.

**Billing is per tile request, not per map load.** Consumed through Leaflet rather than Mapbox GL JS, each tile is billed individually under the Maps API. Two consequences follow:

- Tiles are requested at 512px with Leaflet's `zoomOffset: -1`. Mapbox's default is 512, and 256px tiles need four times as many requests to cover the same area. That configuration is a cost decision as much as a rendering one.
- Cost scales with panning and zooming rather than with visits. A milestone that adds map interaction adds tile requests.

**The renderer choice is also a billing choice, and it has a trigger.** Mapbox GL JS is billed per map load — 50,000 free per month, and one load covers unlimited tiles for twelve hours. Leaflet cannot use it: GL JS shares the worker architecture that failed above, which is why this ADR exists. So the cost comparison is not renderer against renderer, it is one billing model against another:

| | Free tier | Beyond |
|---|---|---|
| GL JS, per map load | 50,000/month | $5.00 per 1,000 |
| Static Tiles, per tile request | 200,000/month | $0.50 per 1,000 |

A research session in a full-size window runs roughly 250–350 tile requests, against one map load. The free tiers differ by 4×, but usage per session differs by two orders of magnitude, so GL JS's allowance is worth something like 60–80× more real use and is about 30× cheaper per session once paid.

At one local user this is irrelevant — exhausting 200,000 requests takes around 600 full sessions a month. The trigger to revisit is roughly **1,000 active users at five sessions a month**, about 1.5M tile requests, or **$650/month against nothing on a map-load plan**. That is a public-launch concern and should be checked before one, not after.

Switching renderer is not the only answer, and probably not the first one. Self-hosting tiles — PMTiles or equivalent — removes metered requests entirely and keeps Leaflet, trading a per-request bill for flat storage. Whichever is chosen, the map stays confined to one module, so it stays a decision that can be made later rather than now.

**Aerial photography stays with IGN.** It needs no key, and nothing about the base map decision reaches it.

**The tile pane filter stays, unused for Mapbox.** It is declared per base map. Mapbox's styles are already calm enough to need none; IGN still carries one.

This amendment settles the provider. It does not settle which Mapbox style — Streets, Light or Outdoors — is the default. The picker in `apps/web/src/properties/base-map-picker.tsx` is temporary scaffolding for that decision and is removed once it is made.

M1 is closed and no milestone is current, so this work is not authorized by a milestone. It is recorded here as a decision taken between milestones, not built as a feature.
