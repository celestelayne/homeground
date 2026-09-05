# ADR-008: Biome and Vitest

## Decision

HomeGround uses Biome for formatting and linting, and Vitest for tests.

## Why

The M0 pipeline requires a formatting check, a lint check, and a test check.

Biome performs formatting and linting as a single dependency. The conventional alternative requires a formatter, a linter, a TypeScript plugin, a configuration bridge, and framework plugins.

Biome includes accessibility rules, which M0 requires so that later interface milestones inherit them.

Vitest shares configuration with Vite, already chosen for the web application.

## Consequence

Biome provides the formatting and lint checks. Vitest provides the test check.

M0 implements no domain behavior, so the test check must be configured to pass on an empty suite rather than fail on one.

If a required lint rule cannot be expressed in Biome, revisit this decision rather than running a second linter alongside it.
