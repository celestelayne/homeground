# ADR-010: IGN Geocoding

## Decision

HomeGround geocodes addresses through IGN's Géoplateforme, which serves the Base Adresse Nationale.

## Why

M1 confirms a property's location from an address, and `specs/property.md` stores the resulting coordinates permanently.

Mapbox separates temporary geocoding from permanent geocoding. Temporary results may not be stored, and permanent geocoding has no free tier. The free allowance therefore does not cover what HomeGround actually does with a result.

IGN serves the authoritative French address database. It requires no API key, places no restriction on storing results, and is more accurate for French addresses than a global commercial geocoder.

HomeGround's scope is France. Using the French national address service is consistent with a methodology built on authoritative French public data.

## Consequence

Geocoding requires no API key, no billing account, and no secret in the environment or in CI.

Coverage is France only. Extending HomeGround beyond France requires revisiting this decision.

The service moved once already, from `api-adresse.data.gouv.fr` to `data.geopf.fr`, in January 2026. Provider-specific response handling stays behind a single seam: a pure mapping function separated from the network call, so a future move changes one file.

This decision covers geocoding only. ADR-002 governs what remains with Mapbox.
