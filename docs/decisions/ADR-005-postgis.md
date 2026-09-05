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