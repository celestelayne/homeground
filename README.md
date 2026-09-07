# HomeGround

Research the place around a property you are considering.

You find the property. HomeGround helps you understand its location — see
`docs/product.md`.

## Running it

### Once, to set up

You need **Node 22** (the version in `.nvmrc`), **pnpm**, and **PostgreSQL 16**.

```sh
nvm use                  # or otherwise switch to Node 22
corepack enable pnpm     # pnpm comes with Node; this activates the pinned version
pnpm install
```

Start PostgreSQL, then create the database and apply the schema:

```sh
createdb homeground
cp .env.example .env
pnpm --filter @homeground/api db:migrate
```

`.env` points at `postgres://localhost:5432/homeground`. Change it if your
PostgreSQL uses a different user, port, or password.

### Every time

**Start PostgreSQL first.** If it is not running, the interface loads but the
list fails, and the API logs `ECONNREFUSED`.

```sh
pnpm run dev
```

That starts both applications together:

| | | |
|---|---|---|
| Web | http://localhost:5173 | the interface |
| API | http://localhost:3000 | `/health`, `/api/properties`, `/api/geocode` |

Open **http://localhost:5173**. Use `localhost`, not `127.0.0.1` — Vite binds
IPv6 only, so `127.0.0.1` refuses the connection.

The web application proxies `/api` to the API, so the browser stays on one
origin and there is no CORS configuration.

### Adding a property while there is no interface for it

The add-property form arrives in a later step. Until then, `curl`:

```sh
curl -X POST http://localhost:3000/api/properties -H 'content-type: application/json' -d '{"name":"Mas above the village","address":"Montouliers","latitude":43.351,"longitude":2.889,"locationTier":"zone","askingPrice":415000}'
```

`name`, `latitude`, `longitude` and `locationTier` are required. The tier —
`exact`, `zone` or `commune` — says how precisely those coordinates identify the
property, and there is deliberately no default. See `specs/property.md`.

To find real coordinates for a French address:

```sh
curl -G http://localhost:3000/api/geocode --data-urlencode "q=Montouliers"
```

## Checks

```sh
pnpm run check
```

Formatting, lint, TypeScript, tests and build — the same five that gate every
pull request. Tests need PostgreSQL running; they use a separate
`homeground_test` database, created automatically on first run.

## Where things are

```
apps/api    Fastify, Drizzle, PostgreSQL
apps/web    React, Vite, Leaflet
docs        product, architecture, methodology, milestones, decisions
specs       implementation contracts for what is being built
```

`docs/milestones.md` says what is being built now and what is deliberately not.
`AGENTS.md` is the working agreement.

## External services

Geocoding and map tiles come from IGN's Géoplateforme, which needs no API key.
HomeGround currently requires no credentials of any kind — see
`docs/decisions/ADR-010-ign-geocoding.md` and `ADR-011-leaflet.md`.
