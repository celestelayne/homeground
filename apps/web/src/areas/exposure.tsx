import type { Area, Evidence } from "../api/types.js";

/**
 * What the state records about a commune's exposure.
 *
 * Two kinds of fact, deliberately shown in this order. What has actually been
 * declared here comes first: it is dated, specific, and the thing a buyer can
 * act on. What the commune is designated as exposed to comes second, and every
 * designation is shown with how many communes carry the same one — because
 * most of France carries several, and a bare list of thirteen reads as a
 * catastrophe rather than as the ordinary condition of living in France.
 *
 * Nothing here is scored, rated or ranked. The counts describe what has
 * happened; they are not a rate and not a forecast. See docs/methodology.md.
 */
const number = new Intl.NumberFormat("en-GB");

export function Exposure({ area, evidence }: { area: Area; evidence: Evidence[] }) {
  const radon = evidence.find((fact) => fact.metric === "exposure.radon");

  // Null is the archive not carrying this commune. An empty list is the
  // archive carrying it and recording nothing, which is a different sentence.
  if (area.exposures === null || area.disasters === null) {
    return (
      <p className="m-0 text-caption leading-[1.5] text-ink-3">
        The national archive does not carry {area.name}, so HomeGround has nothing to show. That is
        not a commune with nothing recorded against it — it is a commune the archive has not caught
        up with, usually one created or merged since its last edition.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Declared area={area} />
      <Designated area={area} />
      {radon?.state === "known" && radon.category ? <Radon fact={radon} /> : null}
    </div>
  );
}

/** Declared disasters: the specific, dated half. */
function Declared({ area }: { area: Area }) {
  const declarations = area.disasters ?? [];

  if (declarations.length === 0) {
    return (
      <p className="m-0 text-caption leading-[1.5] text-ink-2">
        No natural disaster has been declared in {area.name}.
      </p>
    );
  }

  const byKind = new Map<string, { label: string; count: number; latest: string }>();

  for (const declaration of declarations) {
    const held = byKind.get(declaration.label);

    byKind.set(declaration.label, {
      label: declaration.label,
      count: (held?.count ?? 0) + 1,
      // The list arrives most recent first, so the first is the latest.
      latest: held?.latest ?? declaration.beganAt,
    });
  }

  const orders = new Set(declarations.map((d) => d.id)).size;
  const earliest = declarations[declarations.length - 1]?.beganAt;

  return (
    <div>
      <p className="m-0 mb-2 text-body leading-[1.5] text-ink">
        The state has declared a natural disaster here{" "}
        <span className="numeric">{declarations.length}</span> times since{" "}
        <span className="numeric">{year(earliest)}</span>, in{" "}
        <span className="numeric">{number.format(orders)}</span> orders.
      </p>

      <dl className="m-0 divide-y divide-line rounded-card border border-line">
        {[...byKind.values()]
          .sort((a, b) => b.count - a.count)
          .map((kind) => (
            <div
              key={kind.label}
              className="flex items-baseline justify-between gap-4 px-4 py-[9px]"
            >
              <dt className="text-body text-ink">{kind.label}</dt>
              <dd className="numeric m-0 text-right text-body">
                {kind.count}
                <span className="ml-2 text-caption text-ink-3">latest {year(kind.latest)}</span>
              </dd>
            </div>
          ))}
      </dl>

      <p className="m-0 mt-2 text-meta leading-[1.5] text-ink-3">
        {/*
          The sentence that stops a count becoming a prediction. It is here
          rather than in a tooltip because it is the whole caveat.
        */}
        A record of what has happened and been recognised. It is not a rate, and says nothing about
        what will happen.
      </p>
    </div>
  );
}

/** Designations: the common, contextless half, shown with its context. */
function Designated({ area }: { area: Area }) {
  const exposures = area.exposures ?? [];

  if (exposures.length === 0) {
    return (
      <p className="m-0 text-caption leading-[1.5] text-ink-2">
        {area.name} is not recorded as exposed to anything.
      </p>
    );
  }

  return (
    <div>
      <p className="m-0 mb-2 text-body leading-[1.5] text-ink">
        Recorded as exposed to <span className="numeric">{exposures.length}</span> things. Most
        communes in France carry several, so the figure beside each one says how many others carry
        the same.
      </p>

      <ul className="m-0 flex list-none flex-col gap-px p-0">
        {exposures.map((exposure) => (
          <li
            key={exposure.riskCode}
            className="flex items-baseline justify-between gap-4 px-1 py-[5px] text-body"
          >
            {/* The authority's own words, never softened. */}
            <span className="text-ink-2">{exposure.label}</span>
            {exposure.prevalence === null ? null : (
              <span className="numeric flex-none text-caption text-ink-3">
                {number.format(exposure.prevalence)} communes
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Radon({ fact }: { fact: Evidence }) {
  return (
    <p className="m-0 text-caption leading-[1.5] text-ink-2">
      <span className="text-ink">Radon potential {fact.category}</span> on the authority's scale
      {fact.peers ? (
        <>
          {" "}
          · <span className="numeric">{number.format(fact.peers)}</span> communes are in the same
          class
        </>
      ) : null}
      . It describes the ground, not the air inside any building.
    </p>
  );
}

function year(iso: string | undefined): string {
  return iso ? String(new Date(iso).getUTCFullYear()) : "—";
}
