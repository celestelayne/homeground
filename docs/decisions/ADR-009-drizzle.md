# ADR-009: Drizzle

## Decision

HomeGround uses Drizzle ORM with PostgreSQL as the database access layer.

## Why

M1 is the first milestone that persists application data, which `docs/architecture.md` names as the point at which this decision must be made.

The choice had to support PostgreSQL cleanly and must not make future PostGIS usage unnecessarily difficult.

Drizzle is SQL-first. Its schema is TypeScript, its queries stay close to SQL, and it provides a raw SQL escape hatch. PostGIS geometry columns and spatial queries in M5 therefore do not require working around the library.

Migrations are generated as SQL files, reviewed and committed, so the schema history is readable and replayable rather than derived at runtime.

## Consequence

Drizzle is the database access layer. `drizzle-kit` generates migrations. Migrations are committed and applied, never pushed.

Drizzle row types should not leak past the API boundary. The stored row and the wire representation differ, and the conversion belongs in the API.

This decision does not introduce PostGIS. ADR-005 still governs when that arrives.
