# Property

**Status: Implementation-ready for M1**

## Purpose

A Property represents a real property the user is considering.

It is the anchor for HomeGround research, evidence, and user-created context.

This specification defines the Property model and the minimum behavior required for M1.

---

## Property Model

A Property contains:

- identity
- address
- geographic coordinates
- asking price
- listing URL
- status
- notes
- timestamps

Conceptually:

```text
Property
├── id
├── address
├── latitude
├── longitude
├── askingPrice
├── listingUrl
├── status
├── notes
├── createdAt
└── updatedAt
```

## Status

A Property has exactly one status:

- `saved`
- `shortlist`
- `visit`
- `rejected`

New Properties default to `saved`.

Changing status does not create a new Property.

Rejected Properties are not deleted.

## Location

A saved Property must have a confirmed geographic location.

The M1 flow is:

address input
→ geocode
→ show resolved location
→ user confirms location
→ save Property

Do not save a Property from unconfirmed geocoding output.

## Boundaries

Property must not contain derived HomeGround evidence.

Do not add fields such as:

- `fireSafe`
- `hospitalGood`
- `remote`
- `riskLevel`

Those belong to evidence capabilities defined separately.

Notes are user-created context, not HomeGround-derived evidence.

## M1 Required Behavior

M1 must support:

1. entering an address
2. geocoding it
3. confirming the resolved location
4. saving the Property
5. displaying saved Properties
6. changing Property status
7. editing notes

## Invariants

- every saved Property has confirmed coordinates
- Property identity is stable
- Property has exactly one valid status
- new Properties default to `saved`
- changing status does not change identity
- Property does not contain derived evidence
- missing optional values remain missing

## Out of Scope

M1 does not define:

- wildfire evidence
- healthcare evidence
- routing evidence
- comparison
- user criteria
- AI interpretation
- listing scraping
- automatic enrichment