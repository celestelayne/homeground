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

**M0 — Foundation**

Status: in progress

Every criterion is met locally. The pipeline has not yet run on a pull request, which requires a remote and branch protection.

---

## M0 — Foundation

### Goal

Establish the repository, the web and API application boundaries, and a working build and check pipeline, so that later milestones have somewhere to be built.

### Acceptance Criteria

M0 is complete when:

* the repository is under version control
* the monorepo structure is established
* the web application boundary exists
* the API application boundary exists
* the mobile application has a defined place in the target structure
* workspace configuration is established for TypeScript, formatting, linting, and tests
* accessibility lint rules are enabled, so later UI milestones inherit them
* `docs/` explains product, architecture, methodology, decisions, and milestones
* the workspace installs and builds
* every check in the pipeline below runs automatically on pull requests

### Continuous Integration

M0 establishes one pipeline. Every check runs on every pull request.

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

All five checks must pass before merge.

M0 implements no domain behavior, so no tests exist yet. The test check must be configured to pass on an empty suite rather than fail on one.

Requiring the checks to pass before merge is a repository branch protection setting, not a file in this repository.

M0 does not include deployment.

### Environments

M0 establishes local and CI configuration only.

Deployed environments and hosting topology are deferred. See Open Decisions.

### Out of Scope

M0 does not include:

* persistent application data
* a database or database access layer
* PostGIS
* Mapbox integration
* the evidence model, or any derived evidence
* any methodology implementation
* authentication or user accounts
* deployment, deployed environments, and hosting
* shared packages under `packages/`
* data pipelines
* monorepo orchestration tooling
* the mobile application, which lives in its own repository

### Authorized Dependencies

M0 authorizes:

* pnpm, and pnpm workspaces
* TypeScript
* React and Vite, in the web application
* Node.js and Fastify, in the API application
* Biome, for formatting and linting, including accessibility rules
* Vitest, for the test check
* GitHub Actions

Anything not listed requires a milestone that needs it.

### Governing Specs

None. M0 implements no domain behavior.

---

## Planned Milestones

Named and sequenced. Not specified until current.

**M1 — Property map workspace.** React/TypeScript web app, Mapbox map, address search and geocoding, address confirmation, saved properties, statuses, selected-property state, notes, persistence, and map/list synchronization.

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

## Open Decisions

Unresolved decisions are recorded here rather than decided during implementation.

Each is either resolved into an ADR or deferred to the milestone that requires it.

**Blocking M0**

None.

**Recorded without an ADR**

None.

**Deferred, with owning milestone**

* **Database access layer** — M1, the first milestone that persists application data. See `docs/architecture.md`.
* **Hosting and deployed environments** — no owning milestone yet. Required by the first milestone that needs an environment beyond local development and CI.
* **Methodology version attachment** — M2, which introduces method versioning.
* **Wildfire classification method** — M8, and explicitly gated on resolution in `docs/methodology.md` first.
* **Mobile repository** — M9. The mobile application currently lives outside this repository. Whether it moves into the monorepo, and what that would require, is undecided.
* **Evidence staleness** — no owning milestone. M2 introduces a Stale state, but no milestone yet owns detecting staleness or recomputing evidence.

---

**The current milestone determines what gets built.**
