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

None. M3 is complete — its specification and outcome are under *Completed
Milestones* below.

Promoting M4 means specifying it: goal, acceptance criteria, out-of-scope list
and authorized dependencies. Until that is written, no milestone is current and
nothing is authorized to be built.

---

## Planned Milestones

Named and sequenced. Not specified until current.

The sequence has been reordered twice. Once when M1 was complete, as the
commune replaced the property as the subject of research. Again after M3, when
`docs/research/stated-needs.md` — a ranked list of what people actually say
they need to know about a place — was put beside what HomeGround was building,
and the two did not match. Both are
recorded under *Why this order*, because a reader may remember either.

**M4 — Designated exposure.** What a commune is officially recorded as exposed
to, from Géorisques: flood, ground movement, seismic, radon, dam rupture, and
forest fire. Commune-keyed and keyless, so it needs no geometry and no routing.
This is a designation HomeGround reports, not a classification it derives, so
it does not touch the rule reserved for M12. It is also the first milestone at
which a buyer learns that Fabrezan is designated for forest fire, differential
settlement and three kinds of flooding — facts a French buyer's notaire
surfaces and a foreign buyer does not know to ask for.

`specs/evidence.md` already defines what a designation is, what it must carry,
and that it is published with how common it is. That contract was written
during M3 and survives it.

**M5 — Climate.** What the weather is, and what it is becoming: Météo-France
normals, and the DRIAS projections for the decades a buyer would live through.
Second only to admin among the things people ask, and the cheapest of them to
answer — keyless, commune-keyed, no PostGIS, no routing.

A commune has no weather station of its own. The station a figure comes from,
and how far away it is, are part of the evidence rather than a detail.

**M6 — Commune statistics: safety and employment.** Recorded offences per
commune per year from the interior ministry's statistical service, and
employment from INSEE. Both are the shape M2 already handles — commune-keyed
figures with a reference year — so this is mostly ingestion.

Small communes have their offence counts suppressed to protect identification,
which is Unknown arriving from a source that deliberately withholds. Employment
is published by *zone d'emploi* more often than by commune, and a figure that
describes a labour market rather than a village must say so.

**M7 — Cost of buying, and cost of holding.** France publishes every recorded
sale since 2010, keyed on the commune, and the tax authority publishes the
*taxe foncière* rate each commune levies. The first is what a house costs; the
second is what living in it costs every year afterwards, and nobody shows it.

Gated on the comparability decision in `docs/methodology.md` being resolved
first. Fabrezan's 2023 house sales span €508 to €9,310 per square metre, so an
unsegmented median would be a confident-looking number that means nothing.

**M8 — Transport and links.** Whether there is a bus at all, how far the
nearest station is, and how far the nearest airport that flies where a person's
family lives. Timetable feeds are published nationally and openly. Presence and
distance need no routing, which is why this precedes M9 rather than waiting
for it.

**M9 — Reachable services.** Travel-time evidence for services sparse enough
that the answer is a property of the commune rather than of a house: emergency
department and major hospital, using explicit FINESS category mappings.
Introduces routing.

Health cover belongs here rather than earlier. The regional authorities'
designation of an area as under-supplied was built during M3 and removed: it is
a real fact, and "thirty-eight minutes to an emergency department" is the one
a person was actually asking for. The designation can return beside it.

**M10 — Historical wildfire evidence.** Introduces PostGIS. Ingest
authoritative fire geometries and calculate measurable historical evidence —
distance to the nearest recorded burned area, hectares burned within the
commune, most recent recorded year. Measurement only; classification is M12.

**M11 — Personal criteria.** Evaluate measured evidence against user-defined
thresholds. Preserve Unknown through evaluation and never treat missing data as
zero or passing.

**M12 — Wildfire exposure methodology.** Only after the classification method
and authoritative inputs are explicitly resolved in `docs/methodology.md`.
Implementation must not invent Low/Moderate/Elevated formulas.

**M13 — Compare.** Present the same versioned metrics side by side for selected
communes. Comparison is presentation and consistency checking, not a new
scoring engine. ADR-012 already decides which communes are comparable.

**M14 — Listing partnerships and property location.** Import properties with
disclosed locations from listing providers. This is what ends the reliance on a
user placing a point by hand, and the first milestone at which property-level
travel time for everyday services is honest rather than a commune centroid
wearing a house's name.

**M15 — Mobile quick check.** Reuse the HomeGround API and evidence contracts
for the iOS and Android address-check flow: enter or speak, confirm, check,
understand source and coverage.

**M16 — AI intent and orchestration.** Natural-language or voice intent over an
allow-listed capability registry. AI selects trusted operations and explains
returned evidence. It does not create evidence.

---

## Asked For, And Not Owned

Things people say they need to know that no milestone above delivers. Recorded
so that the gap is visible rather than forgotten. The full ranking, and what
each factor's status is, lives in `docs/research/stated-needs.md`.

**Community vitality, and integration with neighbours.** Sixth and ninth on the
list, six people each, and HomeGround has no honest source for either. The only candidates
are proxies: the count of registered associations in a commune, and the census
share of residents born outside France. Both are facts, and neither is what the
person asking meant. Shipping a proxy under the name of the thing it proxies is
the failure ADR-004 exists to prevent, so nothing is owned here until a source
answers the question that was asked.

**Administration and bureaucracy.** The single most-raised factor, and not
commune research at all: visas, residence permits, healthcare registration, tax
residency, licence exchange. The answers are national and identical in every
commune. That is written guidance, not evidence attached to a place, and it
does not belong in this sequence.

**Professional services.** The largest unanswered gap in the research: seven of
its twelve mentions went unanswered by anybody —
finding a notaire, an accountant or a doctor who works in English. No open
dataset exists. It is a directory somebody maintains, which is a different kind
of work from anything above and should be recognised as one before it is
promised.

**Four cheap sources nobody owns.** Internet and mobile coverage, schools,
drought restriction orders and protected areas are each published per commune,
keyless, and each sits low on the list — three people apiece or fewer. Low
demand is not the same as low value: a factor nobody raises may be one nobody
knows to raise, and each of these is a day's work rather than a milestone's.
They are candidates to fold into whichever milestone is nearest rather than to
schedule on their own.

---

## Why This Order

The original sequence assumed the property was the subject and opened with
routing. Three things changed that.

**A listing usually withholds the address.** It gives a commune, and that is
enough to answer the question a buyer asks first — would I even want to look
here? Property-level location arrives with listing partnerships, at M14.

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

One consequence was deliberate: PostGIS arrived early, ahead of routing,
because a boundary intersection is cheaper than a route. See the amendment to
`ADR-005`. The second reorder moved it later again, for the reason below.

### The second reorder, after M3

M3 shipped a comparison of what a commune has against communes like it, and it
was taken off the screen within the week. So was the health designation built
to replace it. Neither was wrong; both answered questions people were not
asking.

What changed the order was `docs/research/stated-needs.md`: a ranked list of
what people say they need to know before they start looking at property,
counted by how many separate people raised each thing. Set beside the roadmap,
it said three things.

**The order was upside down.** Administration, professional services and cost
of living lead the list. Facility counts — what M3 built — appear nowhere on
it. Climate, safety, transport and the cost of holding a house all outrank the
things that were scheduled first.

**Cheap to source and useful are not opposites.** Climate, recorded offences,
tax rates and timetables are all commune-keyed, all keyless, and all near the
top of what people ask. They now come first, and routing and PostGIS wait until
something needs them.

**Two of the most-raised things are not milestones at all.** Administration is
national and identical everywhere; professional services is a directory nobody
publishes. Both are recorded under *Asked for, and not owned* rather than
dressed up as commune evidence.

The rule this leaves behind: a milestone earns its place by the question it
answers, not by the data that happens to be available. Available data is how
HomeGround built two panels nobody wanted.

---

## Completed Milestones


### M3 — Comparison against similar communes

#### Goal

A figure about a commune is shown beside the same figure for communes like it,
so a reader can tell an ordinary village from an unusually served one.

A count is not a finding. Fabrezan has one pharmacy; whether that is worth
knowing depends entirely on what communes of its size and situation usually
have. M2 can state the count and is forbidden from judging it. M3 supplies the
only thing that makes the count mean anything — the distribution it sits in —
and still does not judge it.

The comparison is a position, never a verdict. "More than four fifths of
communes in its class have none" is a fact. "Well served" is an opinion, and
HomeGround does not hold opinions about places.

#### Established by looking, before this was written

Four things were checked against the live sources, because they decide what
this milestone can promise:

* **BPE is on the melodi API already wired for the census**, keyed by commune
  and needing no key. `DS_BPE?GEO=COM-11132` returns 58 observations for
  Fabrezan across around twenty facility types.
* **A national pull is possible**, but returns mixed geographic levels in one
  response — arrondissements, communes, départements, regions. An ingest that
  does not filter to communes would compare a village to a region.
* **The commune-level dataset carries one edition.** Fabrezan's observations
  are all `TIME_PERIOD` 2025.
* **`DS_BPE_EVOLUTION` returns nothing at commune level** — an empty
  observation list for both Fabrezan and Narbonne. Change over time therefore
  needs a second edition from elsewhere, and the criterion below is written to
  be droppable if step 0 cannot find one.

#### Acceptance Criteria

M3 is complete when:

* a commune's figure is shown beside the distribution of that figure across a
  named group of comparable communes, and the group is named on screen —
  "communes in the same density class", not "similar communes"
* the basis for comparability is a published classification, never one
  HomeGround invented, and it appears in the Sources and methodology panel with
  its publisher, its year and at least one stated limitation
* a comparison states position without judgment. No "good", "poor",
  "well served", no ranking of communes against each other, no composite score
* comparison figures are evidence like any other: value, unit, state, source,
  the date the source observed it, and a method version that changes when the
  derivation changes
* a commune the comparison source does not cover renders Unknown — not
  average, not zero, not omitted from the panel
* a peer group too small to say anything about renders Unknown, and the
  minimum size is stated on screen rather than buried in code
* counts for every commune are held in HomeGround's own store, ingested by an
  explicit command, so no national distribution is computed at request time
* M2's rule still holds under the new load: the same commune requested twice
  does not hit an upstream service twice
* ~~a metric whose earlier edition HomeGround holds shows both observations
  with their dates~~ — **dropped, and recorded below.** Three things were
  checked. INSEE's API carries only the current edition, and asking it for
  2024, 2023 or 2022 returns 400. The type codes were renumbered between
  editions: a bakery was B203 and is now B207, and B203 is absent from the
  2025 nomenclature entirely, so comparing editions by code would compare
  different definitions. And no official mapping between the old codes and the
  new was published alongside the file. A third party mirrors an earlier
  edition, which would mean citing a copy rather than the publisher
* the comparison invariants added to `specs/evidence.md` are covered by tests:
  Unknown survives comparison, an uncovered commune is not average, an empty
  peer group is not zero

#### Out of Scope

M3 does not include:

* scoring, ranking or recommending. No composite index, no single number for a
  commune, no "communes like the ones you liked"
* judging a figure. The distribution is shown; the reader draws the conclusion
* placing BPE equipment on the map. BPE counts are attributed to a commune, not
  located, and FINESS remains the only source of located facilities
* wildfire, recorded prices, routing, personal criteria, property-level
  evidence of any kind
* a written description of a commune's character — still unowned, still empty
  and labelled
* PostGIS, which M5 introduces
* automatic or scheduled ingestion, authentication, deployment and hosting

#### Authorized Dependencies

In addition to those carried from M0, M1 and M2:

* **INSEE BPE**, through the melodi API already used for the census — the
  commune-level counts, ingested rather than proxied
* **A published classification for comparability.** INSEE's grille communale
  de densité, in seven levels, is the intended one. It is published in
  fragments regionally on data.gouv and as a national table by INSEE, and step
  0 establishes whether the national table can be obtained keyed by INSEE code.
  If it cannot, the fallback is INSEE's own published population tranches — a
  banding HomeGround takes from a publication rather than choosing. Whichever
  is used is recorded in an ADR, because the choice decides what "similar"
  means for the life of the product
* **An archived BPE edition**, if one is obtainable at commune level, for the
  change-over-time criterion

Explicitly **not** authorized:

* **A charting library.** Distributions in this milestone are small and drawn
  as SVG. A library arrives when a chart HomeGround needs cannot be drawn
  without one
* **A statistics library.** A percentile over held counts is a query, not a
  dependency
* **PostGIS** — M5 introduces it
* **A scheduler** — ingestion stays a command run by hand

#### Outcome

Complete, in five steps. A commune's everyday counts are shown beside the
distribution of the same count across the communes INSEE places in its class:
Fabrezan has five GPs where the median bourg rural has one, and one school,
which 96% of its class also have. The second figure is the one that matters —
it stops a count reading as a finding.

802,594 commune counts and 34,935 classified communes are held locally, so no
distribution is computed from a third party at request time, and none is
computed at request time at all.

Three absences stayed three facts, each found by checking real communes rather
than reasoning about them. Porte des Pierres Dorées is in BPE and not in the
2024 grid, so it keeps its counts and has no position. A commune in neither
source is Unknown rather than zero, because BPE publishes no zeroes and a
missing row is only readable as none for a commune known to exist. A class
below thirty communes says nothing, and says so.

Two things the data taught that no amount of planning would have: `Number("")`
is 0, so an empty cell arrived as a commune with none of something until a
test caught it; and all 69 grid communes with no BPE rows turn out to have been
abolished since 2024, so the peer classes carry a few places that no longer
exist — stated as a limitation rather than quietly filtered.

The time-series criterion was dropped on evidence, not on effort. See above.

#### Governing Specs

`specs/evidence.md`, amended as the first step of this milestone to cover a
figure derived from other communes' figures: what its source is, what its
method version covers, and the rule that a comparison HomeGround cannot make
is Unknown rather than absent.

`docs/methodology.md` governs the wording. A position in a distribution is a
measurement; a description of that position as good or bad is a judgment this
application does not make.

---

---

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

* **How an area brief presents many figures** — M3, now current, and answered
  there. The brief shows the latest observation of each metric rather than
  every census edition it holds; M3 adds a distribution beside each figure and
  settles the shape once rather than twice.
* **Wildfire classification method** — M10, and explicitly gated on resolution in `docs/methodology.md` first.
* **Mobile repository** — M12. The mobile application currently lives outside this repository. Whether it moves into the monorepo, and what that would require, is undecided.
* **Hosting and deployed environments** — no owning milestone yet. Required by the first milestone that needs an environment beyond local development and CI.
* **What a commune had ten years ago** — no owning milestone. M3 dropped this
  after establishing that INSEE serves only the current BPE edition and
  renumbered its facility codes between editions, with no published mapping
  between them. A time series needs either an archived edition from the
  publisher or that mapping; neither exists today. HomeGround holds an
  `edition` column against every count so a second edition can sit beside the
  first the day one is obtainable.
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
* **Settlement context** — M3, now current. INSEE's commune density grid
  classifies communes, which is now the subject, so the mismatch that blocked
  this is gone for area-level use. M3 uses the classification as its definition
  of a comparable commune and records the choice in an ADR. How a property's
  position modifies its commune's class remains unresolved and returns with
  M11.

---

**The current milestone determines what gets built.**
