# ADR-005: PostGIS

## Decision

HomeGround will introduce PostgreSQL with PostGIS when server-side spatial evidence requires geographic storage or querying.

PostGIS is not required merely because HomeGround contains a map.

## Why

Map rendering and spatial data analysis are different responsibilities.

HomeGround can use mapping capabilities without immediately requiring a spatial database.

PostGIS becomes useful when the backend needs to store and query geographic relationships such as proximity, containment, or intersection.

## Consequence

Do not introduce PostGIS until a current milestone requires server-side spatial storage or querying.

Until then, use the simplest data storage required by the current milestone.

When that requirement exists, PostGIS becomes the preferred spatial database capability rather than creating custom geographic logic.
## Amendment — PostGIS is intended, and Area is what will need it

The founder has stated the intent to use PostGIS. This amendment records that
as direction, not as permission to introduce it now: the trigger in the
decision above is unchanged, and nothing currently meets it.

What changed is that the trigger is now visible. Area — a French commune, keyed
on its INSEE code — is the subject of area-level research, and it carries an
administrative boundary. Boundaries are currently **fetched and drawn, never
stored**, which needs no spatial database at all. Drawing an outline is not a
spatial query.

The moment that stops being true is the first question asked *of* a boundary
rather than about its edge:

* which services fall inside this commune
* whether a recorded fire perimeter intersects it
* whether a property's coordinates lie within the commune it claims
* what lies within a given distance of it

Each is `ST_Contains`, `ST_Intersects` or `ST_DWithin`, and each is the kind of
geographic logic this ADR exists to stop being hand-written.

So the ordering is: the milestone that introduces the area brief introduces
PostGIS with it, because that milestone is the first that must query geometry.
Storing boundaries as JSONB in the meantime would be a false economy — it would
have to be migrated to `geometry` almost immediately, and a JSONB column invites
exactly the hand-rolled containment logic this decision forbids.

Two rules to carry into that milestone:

* **Store the full geometry.** Simplification is for drawing. A simplified
  boundary answers containment wrongly near the edge, which is precisely where
  a property in a hamlet on a commune border sits.
* **Cache what is fetched.** geo.api.gouv.fr rate-limits, repeatedly and in
  ordinary use. Commune facts and boundaries effectively never change, so the
  first milestone to persist them removes a live dependency as well as a bill.
