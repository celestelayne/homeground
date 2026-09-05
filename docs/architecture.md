<!-- architecture.md explains how the system is structured -->

# HomeGround Architecture

## Purpose

This document defines the high-level architectural boundaries for HomeGround.

It explains how the main parts of the system are separated.

It does not define all future services, infrastructure, data sources, or product capabilities.

> **This is the target architecture, not infrastructure that must all exist in M0.**

---

## Core Architecture

HomeGround has separate client applications backed by a shared API.

```text
Web ───────┐
           │
           ├────► HomeGround API ─────► Data Layer
           │
Mobile ────┘
```

The core architectural decision is:

> **Web and mobile are separate clients of a shared HomeGround backend.**

Shared domain behavior should live behind the API rather than being independently reimplemented in each client.

---

## Web

The web application is one client of the HomeGround API.

It owns web-specific presentation, interaction, and client-side behavior.

It should not own server-side domain rules that must also apply to mobile.

---

## Mobile

The mobile application is a separate client of the same HomeGround API.

It may support different workflows and interactions from the web application.

It should consume shared HomeGround capabilities through the API rather than duplicating backend domain logic.

The mobile application currently lives outside this repository, as its own project:

<https://rork.com/p/c6rvmz8z41it5pqx4ak28>

Whether it moves into the monorepo is undecided. Until there is a plan, `apps/mobile/` is a position in the target structure rather than a directory that exists.

---

## HomeGround API

The API is the shared backend boundary for HomeGround.

It is responsible for exposing the server-side capabilities required by HomeGround clients.

As the product evolves, shared domain behavior should remain behind this boundary.

The API should not depend on assumptions that only make sense for one client.

---

## Data Layer

Persistent data and external data integrations sit behind the HomeGround API.

The exact implementation of the data layer is intentionally not defined in M0.

Databases, spatial capabilities, external integrations, pipelines, and other infrastructure should be introduced only when required by a current milestone.

---

## Repository Structure

HomeGround uses a monorepo.

The intended top-level structure is:

```text
homeground/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
│
├── packages/
│
├── docs/
│
├── specs/
│
└── AGENTS.md
```

`apps/` contains runnable applications.

`packages/` contains shared code only when there is a demonstrated need to share it.

`docs/` explains product, architecture, methodology, and decisions.

`specs/` defines implementation requirements for capabilities that are actually being built.

---

## Runtime and Tooling

### Web
React + TypeScript  
Vite

### Mobile framework
React Native + Expo  
TypeScript

### API runtime
Node.js + TypeScript  

### API framework
Fastify

### Package manager
pnpm

### Monorepo tooling
pnpm workspaces

Do not introduce Turborepo, Nx, or other monorepo orchestration tooling unless the repository develops a concrete need for it.

### Database
PostgreSQL  
PostGIS will be introduced when a milestone requires server-side spatial storage or querying.

### Database access layer
Drizzle ORM

See ADR-009.

### Mapping / Geocoding / Routing
Mapbox

### Formatting and linting
Biome

### Testing
Vitest

### CI
GitHub Actions

### Hosting
Not yet decided.

Hosting should be selected when a milestone requires an environment beyond local development and CI.

The architecture must not depend on a specific hosting provider until that decision is made.

---

## Shared Code

Shared code should be introduced deliberately.

Do not create a shared package simply because two applications might eventually need the same thing.

Move code into a shared package when there is a real shared responsibility or repeated implementation.

Prefer explicit duplication over premature abstraction when the correct shared boundary is not yet clear.

---

## Domain Boundary

Property identity, HomeGround-derived evidence, and user-created context are separate concepts.

The architecture should preserve those boundaries as the product evolves.

Detailed methodological rules belong in `docs/methodology.md`.

Detailed implementation contracts belong in `specs/`.

---

## Internationalization Boundary

Domain and API models should remain language-neutral.

Presentation strings belong in the client layer.

The initial product may ship in English only, but architecture should not require domain data to be rewritten in order to support another language later.

---

## Architecture Guardrail

The architecture describes intended system boundaries.

It does not authorize implementation of every anticipated component.

Infrastructure and services must be introduced only when required by the current milestone.

Do not pre-build:

* future services
* speculative abstractions
* unused shared packages
* data pipelines
* background workers
* queues
* caches
* AI infrastructure
* spatial infrastructure
* integrations that are not currently required

Before introducing a new service, dependency, datastore, abstraction, or infrastructure component, answer:

> **What requirement in the current milestone requires this?**

If there is no current requirement, do not build it.

**Target architecture defines boundaries. Milestones determine what gets built.**

---

## Milestone Boundary

The architecture does not require the full target system to exist at any given time.

Milestone status, acceptance criteria, and scope belong in `docs/milestones.md`.

Everything beyond the current milestone belongs to a later one unless explicitly required.
