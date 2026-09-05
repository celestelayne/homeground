<!-- methodology.md explains the rules -->
# HomeGround Methodology

## Purpose

This document defines the methodological rules that HomeGround implementations must preserve.

It does not define specific evidence types, data sources, calculations, classifications, or thresholds.

Detailed methodology should be introduced into implementation specifications only when the relevant capability is being built.

The broader research reference is:

**HomeGround V1 — Data & Decision Methodology**

---

## Core Principle

HomeGround helps users understand a property and its surrounding location.

It provides evidence and context to support a user's decision.

It does not make the decision for them.

HomeGround must not present a property as safe or unsafe, good or bad, or as something the user should or should not buy.

---

## Evidence Model

HomeGround follows this conceptual pipeline:

raw source
→ normalized entity
→ derived evidence
→ user judgment

These layers must remain separate.

### Raw source

Information obtained from an external or authoritative source.

### Normalized entity

Source information transformed into a consistent representation HomeGround can use.

### Derived evidence

A reproducible result produced from normalized data using a defined methodology.

### User judgment

An interpretation or decision made by the user based on evidence, context, and personal preferences.

---

## Evidence Is Separate From Property

A Property represents something the user is considering.

Evidence represents what HomeGround has determined about that property's location.

Conceptually:

Property
→ Evidence

Do not encode derived conclusions as permanent Property attributes such as:

fireSafe = true
hospitalGood = true
remote = false

Evidence may change as source data, coverage, or methodology changes.

Property identity must remain independent from derived evidence.

---

## Evidence Is Separate From User Judgment

HomeGround distinguishes between:

**Measurement** — something observed or calculated.

**Preference** — something the user considers important or acceptable.

**Judgment** — an interpretation made using evidence and preferences.

A user's preference must not alter the underlying evidence.

---

## User Context Is Separate From Evidence

Users may accumulate their own context around a property.

This may include notes, photos, links, saved locations, and personal observations.

User context and HomeGround-derived evidence may both contribute to understanding a property, but they have different provenance and must remain distinguishable.

For example:

"Driving time = 48 minutes"

may be derived evidence.

"Loved this village when we visited"

is user context.

---

## Evidence Must Be Reproducible

Derived evidence must be based on defined inputs, sources, and methodology.

The same inputs, source data, and methodology version should produce the same result.

Use deterministic calculation or authoritative source data when required to establish evidence.

AI or language models must not invent, estimate, or substitute evidence.

AI may help explain structured evidence, but explanation and evidence generation are separate responsibilities.

---

## Evidence Must Preserve Provenance

Derived evidence must retain enough information to explain where it came from and how it was produced.

Where applicable, evidence should be capable of identifying:

- metric
- value
- unit
- status
- source
- source date or version
- calculated date
- methodology version
- relevant coverage or confidence information

The exact implementation may evolve.

The invariant is:

**A HomeGround result must be traceable back to the data and method that produced it.**

---

## Unknown Is a First-Class State

Missing, unavailable, unsupported, or inconclusive evidence must remain Unknown.

Unknown must never silently become:

- zero
- false
- low
- safe
- passing
- no risk
- no nearby feature

"Unable to determine" is fundamentally different from "None identified."

Unknown is preferable to false precision.

---

## Methodology Must Be Versioned

Derived evidence depends on methodology.

When methodology changes materially, HomeGround must be able to determine which methodology produced an existing result.

The implementation of versioning is not defined here.

The requirement is that methodology changes must not silently change the meaning of previously generated evidence.

---

## Do Not Invent Methodology

If a metric, classification, threshold, source, or calculation has not been defined:

**Do not invent it.**

Do not:

- choose an arbitrary threshold
- infer methodology from UI designs
- copy an unrelated convention
- ask an AI model to determine the answer
- implement a temporary formula and present it as authoritative

Identify the unresolved methodology decision instead.

Implementation should stop at the methodological boundary rather than manufacture certainty.

---

## Internationalization Boundary

Domain and evidence models must remain language-neutral.

Store structured values or identifiers rather than presentation-language strings.

The presentation layer is responsible for translating structured information into the user's language.

Methodology must remain independent of UI language.

---

## Implementation Invariants

The following rules are non-negotiable:

1. Evidence is separate from Property.
2. Evidence is separate from user preference and judgment.
3. User-created context is separate from HomeGround-derived evidence.
4. Unknown must never silently become zero, false, low, safe, or passing.
5. Derived evidence must be reproducible.
6. Derived evidence must preserve provenance.
7. Methodology must be versioned.
8. AI must not manufacture evidence.
9. Unresolved methodology must not be invented during implementation.
10. HomeGround must not make safety or purchase verdicts.
11. Domain and evidence values must remain language-neutral.

---

## Scope Guardrail

This document defines methodological constraints.

It does not authorize implementation of evidence capabilities.

Specific evidence types, data sources, classifications, calculations, thresholds, integrations, and pipelines should be introduced only when required by the current milestone.

**Do not implement a methodology simply because it appears in broader HomeGround research documentation.**

The current milestone determines what gets built.