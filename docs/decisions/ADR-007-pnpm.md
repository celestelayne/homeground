# ADR-007: pnpm

## Decision

HomeGround uses pnpm, with pnpm workspaces for monorepo package management.

## Why

The monorepo needs workspace management.

pnpm does not hoist dependencies. A package cannot be imported unless it is declared, so accidental dependencies fail at development time rather than surviving until a resolution order changes.

That constraint enforces mechanically what `AGENTS.md` requires in prose: every dependency must be justified by the milestone that needs it.

## Consequence

pnpm is the package manager.

Metro, the React Native bundler, has historically had difficulty resolving pnpm's symlinked layout.

The mobile application currently lives outside this repository, so this does not affect current work.

If the mobile application moves into the monorepo and Metro cannot resolve the workspace, setting `node-linker=hoisted` restores a flat layout. That trades away the strictness above, and should be recorded as a change to this decision rather than applied silently.
