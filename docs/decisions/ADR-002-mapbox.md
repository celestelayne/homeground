# ADR-002: Mapbox

## Decision

HomeGround uses Mapbox for mapping, geocoding, and routing capabilities.

## Why

HomeGround needs a consistent way to display geographic information, turn addresses into locations, and calculate route-based travel information.

Using one provider for these related capabilities keeps the initial implementation simpler.

## Consequence

Mapbox is the default provider for mapping, geocoding, and routing.

Mapbox-specific behavior should not become part of core HomeGround domain models.

This decision does not require every Mapbox capability to be implemented in M0.
## Amendment — geocoding

ADR-010 moves geocoding to IGN.

Mapbox remains the decision for routing and travel-time calculation, which `docs/methodology.md` specifies.

ADR-011 records the map rendering library and tile source.

## Amendment — base map tiles

Base map tiles return to Mapbox. ADR-011's amendment records why, and what it costs.

Of the three capabilities this ADR originally claimed, Mapbox now holds two: tiles and routing. Geocoding stays with IGN.

The original reasoning — one provider keeps the initial implementation simpler — was never tested, because M0 implemented none of it. It is worth restating now that it is being relied on for real: the convenience is one account, one token, one bill. The exposure is that a pricing change, an outage, or a terms change reaches both the map the user looks at and the travel times the methodology depends on.

That exposure is bounded by structure rather than by a second vendor. Tiles are a URL template in `apps/web/src/properties/map-tiles.ts`; routing will be a server-side request behind the API. Neither puts a Mapbox shape into a domain model, which is the rule this ADR set from the start. Replacing either does not require replacing the other, and IGN remains a working tile source that needs no account at all.
