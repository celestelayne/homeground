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
- name
- address
- geographic coordinates
- location tier
- asking price
- listing URL
- status
- notes
- timestamps

Conceptually:

```text
Property
├── id
├── name
├── address
├── latitude
├── longitude
├── locationTier
├── askingPrice
├── listingUrl
├── status
├── notes
├── createdAt
└── updatedAt
```

Required values:

- name
- latitude
- longitude
- locationTier
- status

All other values are optional and remain missing when not provided.

`address` is optional. Many properties have no postal address, and a user
locating one by placing a point on the map may have nothing to put there.

`name` is what the user calls the property. It is required because it is the
one value the user always has, and because it is what identifies a property in
a list. Two properties in the same commune are told apart by their names.

`askingPrice` is an amount in EUR. HomeGround does not store a currency alongside it until a milestone requires more than one.

## Status

A Property has exactly one status:

- `saved`
- `shortlist`
- `visit`
- `rejected`

New Properties default to `saved`.

Changing status does not create a new Property.

Rejected Properties are not deleted.

## Location Tier

Locating a property from a listing is an estimate.

Listings withhold precise locations, and many properties have no postal address. HomeGround records how good the estimate is rather than presenting every coordinate as equally precise.

A Property has exactly one location tier:

- `exact` — the coordinates identify the property itself
- `zone` — the coordinates identify a hamlet, lieu-dit, or street the property is on
- `commune` — the coordinates identify only the commune

The tier is declared by the user. It is not derived from how the coordinates were obtained.

The same action can produce either tier. A point placed after recognising the property in listing photographs is `exact`. A point placed because the property is somewhere on a hillside is `zone`. Nothing in the coordinates themselves distinguishes the two.

There is no default tier. A Property cannot be saved without one.

A user may raise a tier as they learn more, such as after visiting or obtaining a cadastral reference.

HomeGround must never raise a tier on the user's behalf.

Evidence derived from a Property describes the coordinates it was given. Evidence derived at `commune` tier describes the commune, not the property.

## Location

A saved Property must have confirmed coordinates and a declared location tier.

Coordinates may come from:

- an address that geocodes to a specific address point
- a point the user places on the map
- coordinates the user enters directly

Entering an address positions the map. It does not by itself establish where the property is, except where the geocoder returns a specific address point.

Do not save a Property from unconfirmed geocoding output.

Do not infer the location tier from the way the coordinates were produced.

## Boundaries

Property must not contain derived HomeGround evidence.

Do not add fields such as:

- `fireSafe`
- `hospitalGood`
- `remote`
- `riskLevel`

Those belong to evidence capabilities defined separately.

Notes are user-created context, not HomeGround-derived evidence. So is the
name: HomeGround never writes or changes it.

Location tier describes the coordinates HomeGround was given. It is not derived evidence, and it is not a judgment about the property.

## M1 Required Behavior

M1 must support:

1. entering an address or place name
2. geocoding it to position the map
3. establishing the property's location, by confirming a geocoded address point or by placing a point on the map
4. declaring the location tier
5. saving the Property
6. displaying saved Properties
7. changing Property status
8. editing notes and the name

## Invariants

- every saved Property has a name
- every saved Property has confirmed coordinates
- every saved Property has a declared location tier
- location tier is declared by the user, never inferred by HomeGround
- HomeGround never raises a location tier
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
- cadastral parcel lookup
