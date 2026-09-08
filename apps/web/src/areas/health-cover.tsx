import type { Evidence } from "../api/types.js";

/**
 * What the health authorities have designated this commune as.
 *
 * A designation, not a measurement: an ARS looked at supply against need
 * across a health catchment and published a decree. HomeGround reports the
 * decision, the date it was taken, and how common it is — and never decides
 * what it means for a person. See specs/evidence.md.
 */
const PROFESSIONS = [
  { key: "gp", label: "General practitioners" },
  { key: "dentist", label: "Dentists" },
  { key: "nurse", label: "Nurses" },
  { key: "physiotherapist", label: "Physiotherapists" },
  { key: "midwife", label: "Midwives" },
  { key: "speechTherapist", label: "Speech therapists" },
];

/**
 * The authority's own terms, written as French writes them.
 *
 * The file publishes them stripped of accents and prefixed with the
 * authority's ordering — "1_Tres_sous_dotee". Nothing here translates or
 * softens: ZIP and ZAC are shown as ZIP and ZAC, because HomeGround has no
 * source for what they expand to and will not guess at a legal term.
 */
const TERMS: Record<string, string> = {
  "1_ZIP": "ZIP",
  "2_ZAC": "ZAC",
  "3_HZ": "hors zone",
  "4_ZAR": "ZAR",
  "1_Tres_sous_dotee": "très sous-dotée",
  "1b_Sous_dense": "sous-dense",
  "2_Sous_dotee": "sous-dotée",
  "3_intermediaire": "intermédiaire",
  "3_Intermediaire": "intermédiaire",
  "4_Tres_dotee": "très dotée",
  "5_Sur_dotee": "sur-dotée",
  "5b_Non_prioritaire": "non prioritaire",
};

const dates = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

export function HealthCover({ area }: { area: { name: string; evidence: Evidence[] } }) {
  const by = new Map(area.evidence.map((fact) => [fact.metric, fact]));
  const rows = PROFESSIONS.map((profession) => ({
    ...profession,
    designation: by.get(`health.zoning.${profession.key}`),
    share: by.get(`health.zoning.${profession.key}.share`),
  })).filter((row) => row.designation);

  if (rows.length === 0) {
    return null;
  }

  const catchment = rows.find((row) => row.designation?.basis)?.designation?.basis ?? null;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-caption leading-[1.5] text-ink-2">
        {catchment ? (
          <>
            {/*
              The commune is inside the area the decision was made about. Saying
              so is the difference between reporting a designation and implying
              somebody assessed this village on its own.
            */}
            These are decisions about the health catchment of{" "}
            <span className="italic">{catchment}</span>, which {area.name} sits inside — not about{" "}
            {area.name} alone. Each profession is zoned separately, under its own method, so the six
            are not comparable with each other.
          </>
        ) : (
          <>No designation is held for {area.name}.</>
        )}
      </p>

      {rows.map(({ key, label, designation, share }) => (
        <Designation key={key} label={label} designation={designation} share={share} />
      ))}
    </div>
  );
}

function Designation({
  label,
  designation,
  share,
}: {
  label: string;
  designation: Evidence | undefined;
  share: Evidence | undefined;
}) {
  if (!designation) {
    return null;
  }

  const category = designation.category;
  const term = category ? (TERMS[category] ?? category) : null;
  // The authority's own ordering, most under-supplied first. Read off the
  // prefix it publishes rather than assigned here.
  const rank = category ? /^(\d+)/.exec(category)?.[1] : null;

  return (
    <div className="rounded-card border border-line px-4 py-[10px]">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body text-ink">{label}</span>
        <span className="text-body">
          {designation.state === "known" && term ? (
            term
          ) : (
            <span className="text-ink-3">
              {/* Not "adequately served": nobody said that. */}
              Unknown
            </span>
          )}
        </span>
      </div>

      {designation.state === "known" ? (
        <p className="m-0 mt-[5px] text-caption leading-[1.5] text-ink-3">
          {rank ? (
            <>
              The authority's category <span className="numeric">{rank}</span>, counting from the
              most under-supplied
            </>
          ) : null}
          {share?.state === "known" && share.value !== null ? (
            <>
              {rank ? " · " : null}
              <span className="numeric">{share.value}%</span> of French communes carry the same
              designation
            </>
          ) : null}
          {designation.observedAt ? (
            <>
              {" · "}decreed {dates.format(new Date(designation.observedAt))}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
