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
## Amendment

ADR-010 moves geocoding to IGN.

Mapbox remains the decision for routing and travel-time calculation, which `docs/methodology.md` specifies.

ADR-011 records the map rendering library and tile source.
