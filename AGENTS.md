# AGENTS.md

Read `/docs` and the relevant `/specs` before implementing a milestone.

Implement only the requested milestone.

Do not invent product features.

Do not implement obvious future features unless the current milestone requires them.

Do not introduce infrastructure, services, dependencies, or abstractions until the current milestone requires them.

Before adding a new dependency, service, datastore, worker, queue, cache, or shared package, be able to explain which current requirement needs it.

Prefer the smallest implementation that satisfies the acceptance criteria.

Prefer explicit implementations over clever abstractions.

Do not create shared abstractions for anticipated future use.

Keep app-specific behavior inside its owning application unless there is a demonstrated shared responsibility.

Do not invent wildfire classifications or methodology.

Do not invent any unresolved methodology, threshold, classification, or calculation.

If a methodology decision is unresolved, stop and identify the decision rather than choosing one.

Do not treat Unknown as zero, false, safe, passing, or equivalent to no evidence.

Keep Property, derived evidence, user preferences, and user-created context conceptually separate.

Keep evidence separate from preferences and judgments.

Preserve source provenance for derived evidence.

AI must not generate or substitute geographic evidence.

Add tests for derived domain behavior.

Do not change unrelated code while implementing a milestone.

If an out-of-scope improvement is discovered, note it rather than implementing it.

If the specification and implementation disagree, stop and surface the discrepancy rather than silently choosing one.

Keep core documentation concise. Do not expand `/docs` beyond what is needed to explain current decisions and constraints.

## Frontend Conventions

Use lowercase kebab-case for files and directories.

Use PascalCase for React component names.

Use camelCase for functions and variables.

Keep related code close to where it is used.

Prefer components with one clear responsibility.

Do not move code into shared modules until there is a demonstrated shared responsibility.

Test observable behavior and outcomes rather than implementation details.