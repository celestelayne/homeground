import { useState } from "react";
import type { Area, Evidence } from "../api/types.js";
import { DECLARED, familyOf, HAZARDS, inEnglish } from "./risk-labels.js";

/**
 * What the state records about a commune's exposure.
 *
 * An overview, not an archive. What has actually been declared here comes
 * first — dated, specific, and the thing a buyer can act on — and only the
 * three commonest kinds are shown until asked. Designations come second,
 * folded into the families the authority itself defines: Narbonne is recorded
 * for nineteen hazards, which is six families, and nineteen rows of French was
 * a wall rather than an overview.
 *
 * Every designation carries how many communes carry the same one, because most
 * of France carries several and a bare list reads as a catastrophe.
 *
 * Nothing here is scored or ranked. The counts describe what has happened;
 * they are not a rate and not a forecast. See docs/methodology.md.
 */
const number = new Intl.NumberFormat("en-GB");
/** Enough to see the shape of it. The rest is a click away. */
const SHOWN = 3;
/**
 * How far back the overview looks.
 *
 * The archive runs to 1982, and a count over forty years warns nobody: a
 * commune declared eleven times since 1982 and one declared eleven times since
 * 2020 are not the same place. Five years is recent enough to describe the
 * commune as it is now. The full history is held and served; this is what the
 * overview shows.
 */
const RECENT_YEARS = 5;

/** The authority's code for forest fire. */
const FOREST_FIRE = "16";

export function Exposure({ area, evidence }: { area: Area; evidence: Evidence[] }) {
  const radon = evidence.find((fact) => fact.metric === "exposure.radon");
  const fire = (area.exposures ?? []).some((exposure) => exposure.riskCode === FOREST_FIRE);

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
      {fire ? <Fire name={area.name} /> : null}
      <Designated area={area} />
      {radon?.state === "known" && radon.category ? <Radon fact={radon} /> : null}
      <p className="m-0 text-meta leading-[1.5] text-ink-3">
        Hazard names are translated from the French the state uses; the original is shown beside
        each one. Nothing is renamed to sound milder.
      </p>
    </div>
  );
}

/** Declared disasters: the specific, dated half. */
function Declared({ area }: { area: Area }) {
  const [all, setAll] = useState(false);
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - RECENT_YEARS);

  const held = area.disasters ?? [];
  const declarations = held.filter((declaration) => new Date(declaration.beganAt) >= since);

  if (declarations.length === 0) {
    return (
      <p className="m-0 text-body leading-[1.5] text-ink-2">
        No natural disaster has been declared in {area.name} in the last{" "}
        <span className="numeric">{RECENT_YEARS}</span> years.
        {held.length > 0 ? (
          <span className="text-ink-3">
            {" "}
            The archive holds <span className="numeric">{held.length}</span> older, the most recent
            in <span className="numeric">{year(held[0]?.beganAt)}</span>.
          </span>
        ) : null}
      </p>
    );
  }

  const byKind = new Map<string, { code: string; label: string; count: number; latest: string }>();

  for (const declaration of declarations) {
    const held = byKind.get(declaration.riskCode);

    byKind.set(declaration.riskCode, {
      code: declaration.riskCode,
      label: declaration.label,
      count: (held?.count ?? 0) + 1,
      // The list arrives most recent first, so the first seen is the latest.
      latest: held?.latest ?? declaration.beganAt,
    });
  }

  const kinds = [...byKind.values()].sort((a, b) => b.count - a.count);
  const shown = all ? kinds : kinds.slice(0, SHOWN);
  const older = held.length - declarations.length;

  return (
    <div>
      <p className="m-0 mb-2 text-body leading-[1.5] text-ink">
        A natural disaster has been declared here{" "}
        <span className="numeric">{declarations.length}</span>{" "}
        {declarations.length === 1 ? "time" : "times"} in the last{" "}
        <span className="numeric">{RECENT_YEARS}</span> years.
        {older > 0 ? (
          <span className="text-ink-3">
            {" "}
            The archive holds <span className="numeric">{older}</span> older.
          </span>
        ) : null}
      </p>

      <dl className="m-0 divide-y divide-line rounded-card border border-line">
        {shown.map((kind) => (
          <div key={kind.code} className="flex items-baseline justify-between gap-4 px-4 py-[9px]">
            <dt className="text-body text-ink">{inEnglish(DECLARED, kind.code, kind.label)}</dt>
            <dd className="numeric m-0 flex-none text-right text-body">
              {kind.count}
              <span className="ml-2 text-caption text-ink-3">latest {year(kind.latest)}</span>
            </dd>
          </div>
        ))}
      </dl>

      {kinds.length > SHOWN ? (
        <More
          open={all}
          onToggle={() => setAll((shownAll) => !shownAll)}
          label={`${kinds.length - SHOWN} more kind${kinds.length - SHOWN === 1 ? "" : "s"}`}
        />
      ) : null}

      <p className="m-0 mt-2 text-meta leading-[1.5] text-ink-3">
        {/* The sentence that stops a count becoming a prediction. */}A record of what has happened
        and been recognised. Not a rate, and silent about what will happen.
      </p>
    </div>
  );
}

/**
 * The absence a reader would otherwise misread.
 *
 * Not one of the 247,140 declarations in the archive is a fire, and not
 * because France does not burn: the natural disaster regime excludes fire,
 * which is covered by ordinary insurance, so no prefectoral order is ever
 * issued for one. A commune in the Corbières shows no fires above and is
 * designated for forest fire below, and without this the reader draws exactly
 * the wrong conclusion from the gap.
 */
function Fire({ name }: { name: string }) {
  return (
    <p className="m-0 rounded-card border border-line bg-surface-2 px-4 py-[10px] text-caption leading-[1.5] text-ink-2">
      <span className="text-ink">{name} is designated for forest fire</span>, and no fire appears in
      the declarations above. Fires never do: the natural disaster regime does not cover them, so
      the state issues no order when one burns.
      {/*
        Naming the database matters. The first version said only that fires
        were not in this archive, and a reader who had just been told the
        commune is designated for fire still went looking for one here.
      */}{" "}
      Fires are recorded separately, in the national fire database (BDIFF), which HomeGround does
      not yet hold. Nothing above is a statement about whether {name} has burned.
    </p>
  );
}

/** Designations, folded into the authority's own families. */
function Designated({ area }: { area: Area }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const exposures = area.exposures ?? [];

  if (exposures.length === 0) {
    return (
      <p className="m-0 text-body leading-[1.5] text-ink-2">
        {area.name} is not recorded as exposed to anything.
      </p>
    );
  }

  // 113 and 114 are kinds of 11. The hierarchy is the state's, not ours.
  const families = new Map<
    string,
    { code: string; label: string; prevalence: number | null; kinds: typeof exposures }
  >();

  for (const exposure of exposures) {
    const code = familyOf(exposure.riskCode);
    const held = families.get(code) ?? { code, label: "", prevalence: null, kinds: [] };

    if (exposure.riskCode === code) {
      held.label = exposure.label;
      held.prevalence = exposure.prevalence;
    } else {
      held.kinds.push(exposure);
    }

    families.set(code, held);
  }

  return (
    <div>
      <p className="m-0 mb-2 text-body leading-[1.5] text-ink">
        Recorded as exposed to <span className="numeric">{families.size}</span> kinds of hazard.
        Most communes in France carry several, so each shows how many others carry the same.
      </p>

      <ul className="m-0 flex list-none flex-col gap-px p-0">
        {[...families.values()].map((family) => {
          const open = expanded === family.code;

          return (
            <li key={family.code}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : family.code)}
                aria-expanded={open}
                disabled={family.kinds.length === 0}
                className="flex w-full items-baseline justify-between gap-4 rounded-sharp px-1 py-[5px] text-left text-body hover:bg-row-hover disabled:hover:bg-transparent"
              >
                <span className="text-ink-2">
                  {inEnglish(HAZARDS, family.code, family.label)}
                  {family.kinds.length > 0 ? (
                    <span className="ml-2 text-caption text-ink-3">
                      {open ? "−" : "+"} {family.kinds.length}
                    </span>
                  ) : null}
                </span>
                {family.prevalence === null ? null : (
                  <span className="numeric flex-none text-caption text-ink-3">
                    {number.format(family.prevalence)} communes
                  </span>
                )}
              </button>

              {open ? (
                <ul className="m-0 mb-1 flex list-none flex-col gap-px border-l border-line py-1 pl-3">
                  {family.kinds.map((kind) => (
                    <li
                      key={kind.riskCode}
                      className="flex items-baseline justify-between gap-4 px-1 text-caption"
                    >
                      <span className="text-ink-2">
                        {inEnglish(HAZARDS, kind.riskCode, kind.label)}
                        {/* The state's own words, so nobody has to trust ours. */}
                        <span className="ml-2 text-meta text-ink-3 italic">{kind.label}</span>
                      </span>
                      {kind.prevalence === null ? null : (
                        <span className="numeric flex-none text-meta text-ink-3">
                          {number.format(kind.prevalence)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
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

function More({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-[6px] text-caption text-ink-3 underline underline-offset-2 hover:text-ink"
    >
      {open ? "Show fewer" : `Show ${label}`}
    </button>
  );
}

function year(iso: string | undefined): string {
  return iso ? String(new Date(iso).getUTCFullYear()) : "—";
}
