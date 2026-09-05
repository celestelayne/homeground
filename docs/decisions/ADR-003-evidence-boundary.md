# ADR-003: Evidence Boundary

## Decision

HomeGround-derived evidence is separate from Property.

Derived evidence must not be stored as arbitrary permanent fields on the Property model.

## Why

A Property represents something the user is considering.

Evidence represents what HomeGround has determined about that property's location.

Evidence may change as source data, methodology, or coverage changes. Property identity should remain independent from those changes.

## Consequence

Model the relationship conceptually as:

Property → Evidence

Do not add derived conclusions such as `fireSafe`, `hospitalGood`, or `remote` directly to Property.

The detailed rules governing evidence belong in `docs/methodology.md`.