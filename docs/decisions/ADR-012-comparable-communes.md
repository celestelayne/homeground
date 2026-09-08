# ADR-012: What makes two communes comparable

## Decision

Two communes are comparable when INSEE's *grille communale de densité* places
them in the same one of its seven levels.

HomeGround does not define similarity. It cites a classification, names it on
screen, and says how many communes the class holds.

## Why

M3 shows a figure beside the distribution of that figure across communes like
this one. That sentence contains a decision — what "like this one" means — and
it is load-bearing for the life of the product. A comparison against the wrong
peers is worse than no comparison, because it looks like a finding.

Fabrezan has 1,306 residents and one pharmacy. Against every commune in France
that is unremarkable. Against communes classed *rural à habitat dispersé* it
may be the difference between a village with a shop and a village without one.
The peer group decides what the reader learns.

Three candidates were considered.

**The density grid, seven levels.** A published INSEE classification, built for
exactly this purpose: separating a large urban centre from a rural commune with
dispersed housing, and distinguishing the intermediate cases that a population
count alone flattens. It is keyed on the INSEE code HomeGround already holds.
Verified before deciding: the national table is published as
`grille_densite_7_niveaux_2024.xlsx`, 34,935 communes, columns `CODGEO`,
`DENS` and `LIBDENS`. Earlier editions are published back to 2015.

**Population bands.** Simpler, and available today from data already held. But a
band boundary is a choice, and choosing one is HomeGround deciding that 1,000
residents is a meaningful line. INSEE publishes its own tranches, which would
have made this citable rather than invented — it stays the fallback if the grid
becomes unobtainable. It also ignores situation entirely: a commune of 1,300 in
the Corbières and a commune of 1,300 in Montpellier's suburbs have little in
common, and the grid separates them where a band does not.

**Département or intercommunality.** Administrative, not statistical. The Aude
holds Narbonne and Fontanès-de-Sault. Grouping them would compare a town of
53,000 to a hamlet of thirty-eight and call it context.

## Consequence

The density grid is ingested as a national table keyed on the INSEE code, and
registered as a source in its own right, with its own limitations. A comparison
therefore cites two sources — the figures and the classification — as
`specs/evidence.md` now requires.

The grid is published as `.xlsx` and in no other machine-readable form on
INSEE's site. A national CSV does not exist, and data.gouv carries only regional
fragments. HomeGround reads the workbook itself rather than asking an operator
to convert it by hand, because a conversion step nobody records is a step that
silently changes.

A commune the grid does not classify has no peer group, and its comparisons are
`unknown`. The grid covers metropolitan France and the overseas départements;
Mayotte's communes are classified, which the FINESS extract does not manage, so
coverage differs by source and each says so separately.

The class label is shown to the reader in INSEE's own words — *rural à habitat
dispersé*, *centres urbains intermédiaires* — rather than translated into
softer English. A reader who wants to know what the class means should find the
same words at INSEE.

A commune's class can change between editions. Recomputing a comparison against
a new edition is a new method version, not a silent update, and
`specs/evidence.md` already requires that.

This decision governs comparison only. It is not a statement that two communes
in one class are alike in any other respect, and nothing in the product may
imply that it is.
