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

None. M2 is complete.

Promoting M3 means specifying it: goal, acceptance criteria, out-of-scope
list and authorized dependencies. Until that is written, no milestone is
current and nothing is authorized to be built.

---

## Planned Milestones

Named and sequenced. Not specified until current.

The sequence was reordered once M1 was complete, when the commune rather than
the property became the subject of research. The reasoning is recorded under
*Why this order* below, because the previous order is still the one a reader
may remember.

**M2 — Evidence model, proven on commune facts.** Assessment and Evidence
contracts, provenance fields, Known/Estimated/Unknown/Stale states, method
versioning, and evidence retrieval APIs — together with the first evidence that
exercises them: where the hospitals and pharmacies are, from FINESS, and census
population, age structure, second-home and vacancy shares.

The two are deliberately different shapes. Census figures are attributed to a
commune; FINESS establishments are located things carrying their own
coordinates. A contract that holds both will hold what comes after. Counts
across all communes are M3's business, not M2's.

**M3 — Comparison against similar communes.** A count is not a finding. Two
pharmacies means nothing until it is two where most communes of that size have
none, and the national distribution needed to say so is already inside the same
sources. Includes change over time: what a commune had ten years ago and no
longer has, using INSEE's Base Permanente des Équipements for counts
across all communes.

**M4 — Designated exposure.** What a commune is officially recorded as exposed
to, from Géorisques: flood, ground movement, seismic, radon, dam rupture, and
forest fire. Commune-keyed and keyless, so it needs no geometry and no routing.
This is a designation HomeGround reports, not a classification it derives, so
it does not touch the rule reserved for M10. It is also the first milestone at
which a buyer learns that Fabrezan is designated for forest fire, differential
settlement and three kinds of flooding — facts a French buyer's notaire
surfaces and a foreign buyer does not know to ask for.

**M5 — Historical wildfire evidence.** Introduces PostGIS. Ingest authoritative
fire geometries and calculate measurable historical evidence — distance to the
nearest recorded burned area, hectares burned within the commune, most recent
recorded year. Measurement only; classification is M10.

**M6 — Recorded sale prices.** France publishes every recorded sale since 2010
under an open licence, keyed on the commune. Gated on the comparability
decision in `docs/methodology.md` being resolved first. Fabrezan's 2023 house
sales span €508 to €9,310 per square metre, so an unsegmented median would be a
confident-looking number that means nothing.

**M7 — Reachable services.** Travel-time evidence for services that are sparse
and far enough that the answer is a property of the commune rather than of a
house: emergency department and major hospital, using explicit FINESS category
mappings. Introduces routing. Everyday services stay presence rather than
minutes until a property has an exact location, because a difference of a few
minutes to a supermarket is a fact about a house, not a village.

**M8 — Personal criteria.** Evaluate measured evidence against user-defined
thresholds. Preserve Unknown through evaluation and never treat missing data as
zero or passing.

**M9 — Compare.** Present the same versioned metrics side by side for selected
communes. Comparison is presentation and consistency checking, not a new
scoring engine.

**M10 — Wildfire exposure methodology.** Only after the classification method and
authoritative inputs are explicitly resolved in `docs/methodology.md`.
Implementation must not invent Low/Moderate/Elevated formulas.

**M11 — Listing partnerships and property location.** Import properties with
disclosed locations from listing providers. This is what ends the reliance on a
user placing a point by hand, and the first milestone at which property-level
travel time for everyday services is honest rather than a commune centroid
wearing a house's name.

**M12 — Mobile quick check.** Reuse the HomeGround API and evidence contracts
for the iOS and Android address-check flow: enter or speak, confirm, check,
understand source and coverage.

**M13 — AI intent and orchestration.** Natural-language or voice intent over an
allow-listed capability registry. AI selects trusted operations and explains
returned evidence. It does not create evidence.

---

## Why This Order

The original sequence assumed the property was the subject and opened with
routing. Three things changed that.

**A listing usually withholds the address.** It gives a commune, and that is
enough to answer the question a buyer asks first — would I even want to look
here? Property-level location arrives with listing partnerships, at M11.

**At commune tier, most travel times are not honest.** There is no house to
route from, and `specs/property.md` already says evidence derived at commune
tier describes the commune. Routing therefore survives only for services sparse
enough that the answer barely varies across a commune. Everything else becomes
presence, which needs no routing at all.

**The cheapest evidence is also the most available.** BPE, the census and
recorded sales are all keyed on the INSEE code, all keyless, and all carry a
time series. They need no routing provider, no candidate matching and no
per-property computation. Wildfire history is a boundary intersection rather
than a route, which is why it now precedes routing rather than following it.

One consequence is deliberate: PostGIS arrives at M5 rather than being deferred
further, and pays for the boundary storage and caching that the area lookup
already needs. See the amendment to `ADR-005`.

---

## Completed Milestones

### Interim — A photograph of the commune

Not a milestone. A single change made between M2 and M3, recorded here because
it added a source and no milestone was current.

Wikidata links a commune to a picture on Wikimedia Commons through the INSEE
code HomeGround already holds — P374 to P18 — and the picture is shown at the
head of the area panel, where the design handoff had put an upload dropzone.
The buyer supplies nothing; there is no upload.

Three things it settles:

* **A photograph is not evidence.** It carries no state, no method and no
  observation date, because it measures nothing. It is what one contributor
  chose to point a camera at, on a day of their choosing, and the panel says
  so. It lives on the commune row rather than in the evidence table.
* **The absences are still kept apart.** `unknown` is Wikidata answering and
  holding no picture; `unavailable` is Wikidata not answering. A check
  constraint holds a URL to the first state only, and the panel words the two
  differently — a 502 must never print "nobody has photographed this commune".
* **The first source that constrains display.** These files are licensed on
  attribution and share-alike terms, so the photographer and the licence are
  stored beside the URL and rendered with the image. Every previous source
  constrained only what HomeGround may say.

The lookup goes through Wikidata's ordinary MediaWiki API, not its SPARQL
endpoint: the query service was shedding load at one request per minute the
day this was built, and a commune is fetched once and held, so a request
refused there is a photograph the reader never sees. Every one of the fifty
communes held locally resolved to a picture.

Unresolved and recorded below: a commune stored while Wikimedia was
unreachable keeps `unavailable` for good, because nothing re-asks.

### M2 — Evidence model, proven on commune facts

#### Goal

A commune carries sourced, versioned evidence with an explicit state, and the
interface shows both the figure and what produced it.

The contract and the first evidence ship together. An evidence model with no
evidence is a layer, and this document forbids layer milestones.

#### Acceptance Criteria

M2 is complete when:

* evidence for a commune is served from HomeGround's own store rather than
  fetched from a third party on each request
* every piece of evidence carries its value, its unit, its source, the date the
  source observed it, and the version of the method that produced it
* a figure a source does not provide is Unknown, and Unknown is distinguishable
  in the API and on screen from zero and from a field that was never requested
* one source failing leaves the evidence from the other source intact and
  marks only its own as unavailable
* every figure on screen can be traced to its source without leaving the page
* a Sources and methodology panel lists every source in use, each with its
  update cadence, its coverage, and at least one stated limitation
* the panel is generated from the same registry the evidence references, so a
  source cannot appear in one and not the other — a source with no evidence
  behind it, or evidence citing a source the panel omits, fails a test
* a source cannot be registered without a stated limitation
* the panel says plainly that HomeGround assembles public evidence, does not
  judge a property, and does not say whether anywhere is safe
* a commune with no data renders as Unknown throughout, never as a commune of
  zero people with no shops
* evidence is retrievable by INSEE code alone
* the same commune requested twice does not hit the upstream service twice
* the invariants in `specs/evidence.md` are covered by tests

#### Out of Scope

M2 does not include:

* comparison against other communes, or any statement that a figure is high or
  low — that is M3, and until it exists a count is reported, never judged
* wildfire, recorded prices, routing, and personal criteria
* evidence attached to a Property rather than an Area
* detecting staleness, or recomputing evidence when a source updates
* a written description of a commune's character
* listing sources HomeGround does not yet use. The panel describes what is
  actually wired up, so EFFIS, Géorisques, FINESS and départemental fire
  records appear when the milestones that use them land, not before
* PostGIS, and storing boundaries as geometry
* automatic or scheduled ingestion
* authentication, deployment and hosting

#### Authorized Dependencies

In addition to those carried from M0 and M1:

* FINESS, the national directory of health establishments, in its geolocated
  form — hospitals and pharmacies with coordinates
* INSEE census population, age structure and dwelling-occupancy data
* both ingested rather than proxied
* `proj4`, to convert FINESS coordinates from Lambert-93 (EPSG:2154) to
  WGS84. Established by the step 1 spike: FINESS publishes projected
  coordinates, and there is no way to place an establishment on the map
  without converting them. PostGIS would also do it, but PostGIS is M5 and
  reaching for it here would pull a database extension forward to avoid a
  small library.

Explicitly **not** authorized:

* **React Query.** The requirement it was deferred against — one failed source
  must not invalidate the rest of an assessment — turns out to be answerable in
  the evidence contract, where each piece carries its own state, rather than in
  the client's fetching library. Revisit when a genuine per-query staleness
  requirement appears.
* **PostGIS** — M5 introduces it.
* **A scheduler** — ingestion is a command run by hand until a milestone needs
  it to be automatic.

#### Governing Specs

`specs/evidence.md`, written as the first step of this milestone.
`specs/property.md` is unchanged and Property gains no evidence here.

#### Outcome

Complete. A commune carries sourced, versioned evidence held in HomeGround's
own store: the second commune request takes eighteen milliseconds against
twelve hundred for the first, which is what stopped INSEE and
geo.api.gouv.fr rate-limiting ordinary use.

Two sources of deliberately different shapes proved the contract. Census
figures are attributed to a commune; FINESS establishments are located things
carrying coordinates, and 21,116 of them are held with the precision the
source claims for each. About one in twenty-five resolves only to its
commune, and is drawn as an area rather than a point because a dot would
claim an address the source never gave.

The Sources and methodology panel is generated from the registry the evidence
cites, so it cannot describe a source that is not wired up, and no source can
be registered without stating a limitation.

Unknown survived the whole path. A commune the sources know nothing about —
Tsingoni, in Mayotte — renders Unknown throughout rather than as a commune of
no people with no shops, and its pharmacy count says Unknown rather than zero
because the FINESS extract stops at metropolitan France. Both were found by
looking at a real commune rather than reasoning about a hypothetical one.

Built in five steps, each reviewed before the next began.

---

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

* **Where a commune's character description comes from** — no owning milestone.
  An area brief wants a sentence of orientation, and no service HomeGround uses
  publishes one. ADR-004 forbids writing it, so the slot stays empty and
  labelled until a source is chosen. The intercommunality name is the nearest
  sourced substitute. M3 may make the question moot: a commune measured against
  similar communes, and against its own past, describes itself.
* **Which Mapbox base map style** — Streets, Light or Outdoors. ADR-011's amendment settles the provider and leaves the style open. A temporary picker in the map exists to answer it by looking; it is removed once the answer is chosen.

**Deferred, with owning milestone**

* **How an area brief presents many figures** — M3. Partly answered: the brief
  shows the latest observation of each metric rather than every census edition
  it holds. M3 adds comparison and a second axis of figures, so the shape is
  settled there rather than twice.
* **Wildfire classification method** — M10, and explicitly gated on resolution in `docs/methodology.md` first.
* **Mobile repository** — M12. The mobile application currently lives outside this repository. Whether it moves into the monorepo, and what that would require, is undecided.
* **Hosting and deployed environments** — no owning milestone yet. Required by the first milestone that needs an environment beyond local development and CI.
* **Re-asking a source that could not be reached** — no owning milestone. A
  commune is fetched once and held, so a lookup made while a source was down
  keeps its `unavailable` answer permanently. Visible today in the commune
  photograph, which states the failure honestly and never retries beyond the
  one immediate retry inside the request.
* **Evidence staleness** — no owning milestone. M2 carries a Stale state in the
  contract and nothing sets it. Detecting that a source has published something
  newer, and recomputing against it, is unowned.
* **Correcting a mis-saved property** — no owning milestone. M1 has no delete and cannot edit coordinates, following `specs/property.md`. A property saved against the wrong location is permanent.
* **Raising a location tier after saving** — no owning milestone. `specs/property.md` allows a user to raise a tier as they learn more; M1 declares it at save and never revisits it.
* **Recorded property sales** — M6. France publishes every recorded sale since 2010 under an open licence, geolocated to the parcel. It is a price source, but also an index keyed on what listings publish — commune, type, built surface, land surface — so a property that has changed hands can be matched to its parcel and reach `exact` tier without anyone guessing from photographs. Comparability is a methodology decision and must be resolved before implementation, as `docs/methodology.md` requires.
* **Settlement context** — M3. INSEE's commune density grid classifies
  communes, which is now the subject, so the mismatch that blocked this is gone
  for area-level use. How a property's position modifies its commune's class
  remains unresolved and returns with M11.

---

**The current milestone determines what gets built.**
