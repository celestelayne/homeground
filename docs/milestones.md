<!-- milestones.md explains what is being built now -->
# HomeGround Milestones

## Purpose

This document defines the current milestone and the sequence of milestones planned after it.

Scope questions in `AGENTS.md`, `docs/architecture.md`, and `docs/methodology.md` resolve to the current milestone.

This document is where that question is answered.

The milestone sequence derives from *HomeGround V1 — Implementation Plan*.

---

## Implementation Strategy

HomeGround is built in thin vertical slices.

Each milestone should:

* produce a user-visible capability
* exercise the required data path end to end
* add tests for the methodology rules it introduces

A milestone is not a layer. Building a data layer, an API layer, and a UI layer as separate milestones is not a vertical slice.

---

## Milestone Detail Boundary

Milestones are **named and sequenced** in advance. That is product direction.

Milestones are **specified** only when they become current. Specification means acceptance criteria, out-of-scope list, and authorized dependencies.

Writing acceptance criteria for a milestone that is not current is the speculative building this repository prohibits.

Only the current milestone below is specified.

---

## Current Milestone

None. M1 is complete.

Promoting M2 means specifying it: goal, acceptance criteria, out-of-scope
list and authorized dependencies. Until that is written, no milestone is
current and nothing is authorized to be built.

---

## Planned Milestones

Named and sequenced. Not specified until current.

**M2 — Evidence model.** Assessment and Evidence contracts, provenance fields, Known/Estimated/Unknown/Stale states, method versioning, and evidence retrieval APIs.

**M3 — Everyday services and routing.** One end-to-end metric first: nearest supermarket driving time. Normalize the source, identify candidates, route, persist evidence, and render it in the property panel.

**M4 — Healthcare.** Everyday healthcare, emergency department, and major hospital travel-time evidence, using explicit FINESS category mappings and the same evidence and routing architecture.

**M5 — Historical wildfire evidence.** Introduce PostGIS if not already required. Ingest authoritative fire geometries and calculate measurable historical evidence such as distance to the nearest recorded burned area.

**M6 — Personal criteria.** Evaluate measured evidence against user-defined thresholds. Preserve Unknown through evaluation and never treat missing data as zero or passing.

**M7 — Compare.** Present the same versioned metrics side by side for selected properties. Comparison is presentation and consistency checking, not a new scoring engine.

**M8 — Wildfire exposure methodology.** Only after the classification method and authoritative inputs are explicitly resolved in `docs/methodology.md`. Implementation must not invent Low/Moderate/Elevated formulas.

**M9 — Mobile quick check.** Reuse the HomeGround API and evidence contracts for the iOS and Android address-check flow: enter or speak, confirm, check, understand source and coverage.

**M10 — AI intent and orchestration.** Natural-language or voice intent over an allow-listed capability registry. AI selects trusted operations and explains returned evidence. It does not create evidence.

---

## Completed Milestones

### M1 — Property Map Workspace

#### Goal

A user can save a property from a confirmed address, and manage it on a map and in a list.

#### Acceptance Criteria

M1 is complete when:

* a property can be added by entering an address or place name
* geocoding positions the map, and a specific address point can be confirmed directly
* a property's location can be placed on the map when it has no usable address
* the user declares the location tier, and a property cannot be saved without one
* a property cannot be saved from unconfirmed geocoding output
* saved properties appear in both the sidebar list and the map
* selecting a property in either surface selects it in the other
* a property's status can be changed among saved, shortlist, visit and rejected
* notes can be edited
* saved properties, statuses and notes survive a reload
* an unavailable geocoder is distinguishable from an address with no matches
* the invariants in `specs/property.md` are covered by tests

#### Out of Scope

M1 does not include:

* derived evidence of any kind — wildfire, healthcare, services, routing
* user criteria and thresholds
* comparison
* AI interpretation
* listing scraping or automatic enrichment
* cadastral parcel lookup
* authentication and user accounts
* deleting a property
* editing a saved property's address or coordinates
* raising a location tier after saving, which the specification allows but no M1 behaviour requires
* deployment, deployed environments and hosting
* shared packages under `packages/`
* the mobile application

#### Authorized Dependencies

In addition to those carried from M0, M1 authorizes:

* Drizzle ORM and drizzle-kit, with PostgreSQL and the `pg` driver
* TypeBox, with the Fastify TypeBox type provider
* Leaflet, with tiles served by IGN
* IBM Plex Sans and IBM Plex Mono, self-hosted
* Vitest in each application, with jsdom and Testing Library in the web application

Anything not listed requires a milestone that needs it.

#### Governing Specs

`specs/property.md`

#### Outcome

Complete. A property can be added from an address or by placing a point on
the map, carries a declared location tier, appears in both the list and the
map with selection synchronised, and keeps its status and notes across
reloads. An unavailable geocoder is distinguishable from an address with no
matches.

Built in ten steps, each reviewed before the next began.

---

---

### M0 — Foundation

Complete.

Established the repository, the web and API application boundaries, and the build and check pipeline.

Delivered: version control, the pnpm workspace over `apps/`, the web and API application boundaries, a documented place in the target structure for the mobile application, workspace configuration for TypeScript, formatting, linting and tests, accessibility lint rules, and documentation covering product, architecture, methodology, decisions and milestones.

The pipeline established by M0 runs on every pull request and remains in force:

```text
branch
   ↓
pull request
   ↓
formatting
lint
TypeScript
tests
build
   ↓
merge
```

All five checks must pass before merge. Requiring that is a repository branch protection setting, not a file in this repository.

---

## Open Decisions

Unresolved decisions are recorded here rather than decided during implementation.

Each is either resolved into an ADR or deferred to the milestone that requires it.

**Recorded without an ADR**

* **Which Mapbox base map style** — Streets, Light or Outdoors. ADR-011's amendment settles the provider and leaves the style open. A temporary picker in the map exists to answer it by looking; it is removed once the answer is chosen.

**Deferred, with owning milestone**

* **React Query** — M2. M1 has one collection and one screen, so nothing currently requires it. M2 introduces per-property evidence with a Stale state, and a rule that one failed source must not invalidate the rest of an assessment. That is per-query staleness and error isolation.
* **Methodology version attachment** — M2, which introduces method versioning.
* **Wildfire classification method** — M8, and explicitly gated on resolution in `docs/methodology.md` first.
* **Mobile repository** — M9. The mobile application currently lives outside this repository. Whether it moves into the monorepo, and what that would require, is undecided.
* **Hosting and deployed environments** — no owning milestone yet. Required by the first milestone that needs an environment beyond local development and CI.
* **Evidence staleness** — no owning milestone. M2 introduces a Stale state, but no milestone yet owns detecting staleness or recomputing evidence.
* **Correcting a mis-saved property** — no owning milestone. M1 has no delete and cannot edit coordinates, following `specs/property.md`. A property saved against the wrong location is permanent.
* **Raising a location tier after saving** — no owning milestone. `specs/property.md` allows a user to raise a tier as they learn more; M1 declares it at save and never revisits it.
* **Recorded property sales** — no owning milestone. France publishes every recorded sale since 2010 under an open licence, geolocated to the parcel. It is a price source, but also an index keyed on what listings publish — commune, type, built surface, land surface — so a property that has changed hands can be matched to its parcel and reach `exact` tier without anyone guessing from photographs. Comparability is a methodology decision and must be resolved before implementation, as `docs/methodology.md` requires.
* **Settlement context** — no owning milestone. Classifying a property as core, fringe or isolated. INSEE's commune density grid is the likely authoritative input, but it classifies communes rather than properties, and how a property's position modifies its commune's class is an unresolved methodology decision.

---

**The current milestone determines what gets built.**
