# Evidence

**Status: Implementation-ready for M2. Amended for M3, which adds comparison.**

## Purpose

Evidence is what HomeGround has measured or retrieved about a place.

It is never what HomeGround thinks about that place.

This specification defines the Evidence model, the Source registry it depends
on, and the minimum behavior required for M2.

---

## The Subject

Evidence attaches to an **Area**: a French commune, identified by its INSEE
code.

A commune name is not an identity. Names repeat across France. A postcode is
not an identity either — 11200 covers five communes. The INSEE code is.

Evidence does not attach to a Property in M2.

`specs/property.md` already says that evidence derived at `commune` tier
describes the commune rather than the property. A listing that withholds its
address gives a commune, so the commune is what can honestly be described.
ADR-003 additionally forbids derived evidence from becoming a Property column.

An Area is a subject, not a judgment. It holds identity and the facts published
about it. It holds no score, no rating, and no prose.

---

## Evidence Model

A piece of Evidence contains:

```text
Evidence
├── areaCode          the commune it describes
├── metric            what is measured
├── value             the measurement
├── unit              what the value is counted in
├── state             known | estimated | unknown | unavailable | stale
├── sourceId          into the Source registry
├── observedAt        when the source observed it
├── retrievedAt       when HomeGround fetched it
├── method            how the value was produced from the source
└── methodVersion     which version of that method
```

`observedAt` and `retrievedAt` are different facts and both are required. A
2021 census figure fetched today is a 2021 figure. Reporting the fetch date
would make stale data look current.

`value` is meaningful only alongside `unit`. A commune area of 28.87 is
nothing; 28.87 km² is a fact.

---

## States

A piece of Evidence has exactly one state.

- `known` — the source provided this value for this subject
- `estimated` — derived by a method that introduces uncertainty, such as a
  share computed from separately rounded figures
- `unknown` — the source does not provide this value for this subject
- `unavailable` — HomeGround could not ask. The source did not answer
- `stale` — known, but the source has published something newer

**`unknown` and `unavailable` are different facts and must never be collapsed.**

"This commune has no pharmacy" and "we could not find out whether this commune
has a pharmacy" lead a buyer to opposite conclusions. `docs/methodology.md`
forbids the substitution, and HomeGround already enforces it twice: an
unreachable geocoder returns `502 geocoder_unavailable` rather than an empty
candidate list, and an unreachable commune service returns
`502 area_lookup_unavailable` rather than "no such commune".

This is one state more than `docs/milestones.md` names. The extra state is
`unavailable`, and it is the distinction above.

**No state is ever represented by a value.**

A missing population is not `0`. A missing share is not `""`. A commune with no
data is not a commune of no people with no shops. Absence is carried in `state`
and nowhere else.

M2 does not detect `stale`. The state exists in the contract so that detecting
it later is not a schema change.

### Precision reported by the source

Where a source states how precisely it located something, that statement is
carried and never discarded.

FINESS publishes a geocoding level with every establishment: level 1 means the
coordinate was resolved to the address, level 4 means it was resolved only to
the commune. Around four per cent of pharmacies and six per cent of hospitals
are level 4, and the single pharmacy FINESS lists in Fabrezan is one of them.

A level 4 coordinate is the commune's centre wearing an establishment's name.
Plotting it as a pin says "the pharmacy is here" and points at a field. Such a
value is `estimated`, never `known`, and the interface must not present it as a
position.

This is the same distinction `specs/property.md` draws with `locationTier`, and
it is drawn for the same reason: a coordinate that looks precise and is not is
worse than no coordinate.

---

## Sources

Every piece of Evidence cites a registered Source.

A Source contains:

```text
Source
├── id
├── name
├── publisher
├── description
├── url
├── cadence           how often the source republishes
├── coverage          where it applies, and where it does not
├── limitations       at least one, required
└── licence
```

**A Source cannot be registered without at least one stated limitation.**

Every source misleads somebody, and the limitation that matters is the one
aimed at the question being asked. For locating a pharmacy, FINESS's relevant
weakness is that it registers establishments — a lone practitioner may not
appear as one — not that it says nothing about Sunday opening. For counting
services, INSEE's equipment census counts a commune, not a street.

Requiring the limitation makes the weakness a condition of using the source
rather than something a user discovers. Writing a limitation that does not bear
on the question wastes the field.

The registry is the single origin of the Sources and methodology panel. The
panel is rendered from it and is never written as page copy, so it cannot drift
from what is actually wired up.

Two rules hold the registry and the evidence together:

- every Source cited by Evidence exists in the registry
- every Source in the registry is cited by at least one kind of Evidence

The second rule is the one that matters for honesty. A registry entry with
nothing behind it claims a capability HomeGround does not have.

---

## Method and Version

Every derived value carries the method that produced it and that method's
version.

A value read straight from a source is derived by an identity method, recorded
like any other.

Changing how a value is computed requires a new version. Evidence produced by
an earlier version is not silently recomputed and not silently relabelled. Two
figures computed differently must be distinguishable, or a comparison across
time compares nothing.

---

## Boundaries

Evidence must not contain judgment.

Do not add fields such as:

- `rating`
- `safe`
- `good`
- `score`
- `risk`

Reporting that a commune is officially designated as exposed to forest fire is
evidence: an authority recorded it and HomeGround repeats it, with the source.
Deciding that a commune is *high risk* is a judgment, and belongs to no
milestone until `docs/methodology.md` resolves what the words mean.

Evidence was not compared in M2.

A count was reported, never called high or low. "Two pharmacies" is evidence.
"Unusually well served" requires a distribution to compare against, which is
M3. Shipping the comparison early, informally, is how a number becomes a claim
nobody can defend. What M3 may and may not do with a distribution is defined
below.

HomeGround does not write prose about a place.

---

## Comparison

A **comparison** is evidence whose value is the position of another figure
within a named group of communes.

It is evidence, not a layer above evidence: it carries a value, a unit, a
state, a source, an observation date and a method version, exactly like a
count. Everything in this document applies to it.

### What makes a group

A comparison must name the group it compares against, and the group must come
from a published classification. HomeGround does not decide which communes
resemble each other; a statistical authority does, and HomeGround cites it.

A comparison therefore cites two sources: the source of the underlying figures,
and the source of the classification. Both must be registered, and both appear
in the Sources and methodology panel.

The group's size travels with the comparison. "Among the 6,428 communes in its
class" lets a reader weigh the claim; "compared to similar communes" does not.

### What a comparison may say

A position, and nothing else:

- where the commune falls among its peers, as a share of them
- what the middle of the group holds

A comparison may not say that a commune is well served, poorly served, good,
bad, better, worse, above average in a tone that implies approval, or
recommended. Those are judgments, and `docs/methodology.md` governs them. The
distribution is shown; the reader draws the conclusion.

The threshold below which a group is too small to compare against is part of
the method, is stated on screen, and changes only with a method version. It is
a convention rather than a law, and saying so is the point.

### When a comparison cannot be made

Each of these is `unknown`, and each is distinguishable from the others by the
metric it is recorded against, never by silence:

- the commune is not covered by the source of the underlying figures
- the classification does not place the commune in any class
- the class holds too few communes to compare against

A comparison that could not be computed because a source could not be read is
`unavailable`, as everywhere else.

An uncovered commune is never shown as average. Average is a value; absence is
not.

---

## Designations

A **designation** is evidence whose value is a category an authority recorded,
not a quantity anyone measured.

"This commune is a *zone d'action complémentaire* for general practitioners, by
decree of 30 October 2025" is a designation. It has no unit, cannot be averaged
and cannot be plotted on a scale, and it is one of the most useful things
HomeGround can say — an authority looked, decided, and published.

A designation carries the same provenance as any other evidence: a source, the
date the authority decided, a method and a version. It differs in one field. It
holds a `category` where a measurement holds a `value` and a `unit`, and never
both.

Three rules follow, and each exists because the alternative misleads:

**The authority's own words, kept.** A category is shown as the source writes
it, with any expansion named as an expansion. Softening *très sous-dotée* into
"limited provision" is HomeGround editorialising a legal designation.

**The distribution belongs beside it.** 87% of French communes are designated
under-served for general practitioners. A designation shown alone reads as a
warning about one place when it describes most of the country, so a designation
is published with how common it is — which is a fact about the designation, not
a judgment about the commune.

**A designation is not a risk.** Reporting what an authority recorded is
evidence. Deciding what it means for a person is a judgment, and
`docs/methodology.md` governs it.

Absence works as everywhere else. A commune the authority did not classify is
`unknown`, and a source that could not be read is `unavailable`. Neither is a
category, and neither is the mildest category available.

---

## M2 Required Behavior

M2 must support:

1. holding evidence for a commune in HomeGround's own store
2. retrieving all evidence for a commune by INSEE code
3. carrying value, unit, state, source, observation date and method version
4. distinguishing `unknown` from `unavailable` in the API and on screen
5. showing, for every figure on screen, what produced it
6. rendering the Sources and methodology panel from the registry
7. leaving evidence from a healthy source intact when another source fails

---

## M3 Required Behavior

M3 must additionally support:

1. holding, for every commune, the figures a comparison is computed from
2. computing a comparison from held figures rather than at request time
3. naming, on screen, the group compared against and how many communes it holds
4. citing both the source of the figures and the source of the classification
5. distinguishing an uncovered commune, an unclassified commune and a group too
   small — none of which is zero, and none of which is average

---

## Invariants

- evidence attaches to an Area, identified by INSEE code
- every piece of evidence has exactly one state
- `unknown` and `unavailable` are never collapsed into each other
- absence is never represented by a value
- a designation carries a category and no unit; a measurement carries a value
  and a unit; nothing carries both
- a designation is shown in the authority's own words, with how common it is
- every piece of evidence cites a registered source
- every registered source states at least one limitation
- every registered source is cited by at least one kind of evidence
- every piece of evidence carries the method version that produced it
- `observedAt` describes the source, not the fetch
- evidence contains no judgment and no score
- a comparison names its group, the group's size, and both sources it rests on
- a comparison states a position, never an approval
- a commune outside the comparison is `unknown`, never average and never zero
- one source failing does not remove another source's evidence
- evidence does not become a Property column

---

## Out of Scope

Not defined here:

- thresholds, criteria, or evaluation
- detecting staleness or recomputing evidence
- evidence attached to a Property
- geometry, spatial queries, and PostGIS
- a written description of a commune's character
- sources not yet wired up
