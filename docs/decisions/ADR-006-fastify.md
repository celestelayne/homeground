# ADR-006: Fastify

## Decision

HomeGround uses Fastify as the API framework.

## Why

The API is the shared boundary for the web and mobile clients.

Fastify is schema-first. Request and response schemas are declared at the boundary rather than validated ad hoc inside handlers.

HomeGround evidence carries a defined provenance contract. A schema-first boundary enforces that contract in one place and can generate an API description from which clients derive types, rather than each client maintaining its own copy.

Runtime portability was not decisive. PostgreSQL, and PostGIS later, favor a persistent process with a managed connection pool.

## Consequence

Fastify is the API framework.

The API runs as a persistent Node.js process. The architecture does not assume a serverless runtime.

Fastify-specific behavior should not become part of core HomeGround domain models.

This decision does not require any Fastify capability to be implemented in M0 beyond an application boundary that builds.
