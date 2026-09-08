import type { Evidence } from "../api/types.js";
import { labelFor, PEER_MEDIAN, PEER_PERCENTILE } from "../sources/metric-labels.js";

/**
 * What a commune has, and where that sits among communes like it.
 *
 * A count on its own is not a finding: one bakery means nothing until you know
 * that most comparable communes have none, or that nearly all of them have
 * one. This is the distribution, stated as a position and never as a verdict —
 * no "well served", no ranking, no score. See specs/evidence.md and ADR-012.
 */
const ORDER = [
  "shops.bakery",
  "shops.grocery",
  "education.school",
  "health.gp",
  "services.postOffice",
  "services.restaurant",
];

const number = new Intl.NumberFormat("en-GB");

export function Everyday({ evidence }: { evidence: Evidence[] }) {
  const by = new Map(evidence.map((fact) => [fact.metric, fact]));
  const rows = ORDER.map((metric) => ({
    metric,
    count: by.get(metric),
    percentile: by.get(`${metric}${PEER_PERCENTILE}`),
    median: by.get(`${metric}${PEER_MEDIAN}`),
  })).filter((row) => row.count);

  if (rows.length === 0) {
    return null;
  }

  // Every row is compared against the same class, so the group is named once
  // rather than repeated under each figure — and so is the reason when there
  // is no group. It is still named: "compared to similar communes" is what
  // this refuses to say.
  const compared = rows.find((row) => row.percentile?.state === "known")?.percentile;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-caption leading-[1.5] text-ink-2">
        {compared ? (
          <>
            Compared against the{" "}
            <span className="numeric">{number.format(compared.peers ?? 0)}</span> communes INSEE
            places in the same class: <span className="italic">{compared.basis}</span>.
          </>
        ) : (
          <>
            {/*
              The vintage is a fact; why this commune is missing from it is not
              one HomeGround can read, so it says what it knows and stops.
            */}
            These counts are not compared. The classification HomeGround holds describes France as
            it was in 2024 and places this commune in no class, so there is no group to compare it
            against. That is not a reading of average, and not one of zero.
          </>
        )}
      </p>

      {rows.map((row) => (
        <Row key={row.metric} {...row} />
      ))}
    </div>
  );
}

function Row({
  metric,
  count,
  percentile,
  median,
}: {
  metric: string;
  count: Evidence | undefined;
  percentile: Evidence | undefined;
  median: Evidence | undefined;
}) {
  const has = count?.state === "known" ? (count.value ?? 0) : null;

  return (
    <div className="rounded-card border border-line px-4 py-[10px]">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body text-ink">{labelFor(metric)}</span>
        <span className="numeric text-body">
          {has === null ? <span className="text-ink-3">Unknown</span> : number.format(has)}
        </span>
      </div>

      <Position percentile={percentile} median={median} count={has} />
    </div>
  );
}

/**
 * The position, in words and as a line.
 *
 * The words say what the number counts — communes holding fewer — because
 * "84.9%" beside a figure invites a reader to imagine a score. The line shows
 * the same thing, with the middle of the group marked, so the reader can see
 * how ordinary the commune is without doing arithmetic.
 */
function Position({
  percentile,
  median,
  count,
}: {
  percentile: Evidence | undefined;
  median: Evidence | undefined;
  count: number | null;
}) {
  if (percentile?.state !== "known" || percentile.value === null) {
    // Why there is no comparison is said once, above the rows.
    return null;
  }

  const share = percentile.value;
  const middle = median?.state === "known" ? median.value : null;

  return (
    <>
      <Distribution share={share} count={count} middle={middle} />

      <p className="m-0 mt-[5px] text-caption leading-[1.5] text-ink-3">
        <span className="numeric">{share}%</span> of comparable communes have fewer
        {middle === null ? null : (
          <>
            {" "}
            · the middle one has <span className="numeric">{number.format(middle)}</span>
          </>
        )}
      </p>
    </>
  );
}

/**
 * One line, one mark. Drawn rather than charted: a library for this would be
 * a dependency carrying a hundred chart types nobody asked for.
 */
function Distribution({
  share,
  count,
  middle,
}: {
  share: number;
  count: number | null;
  middle: number | null;
}) {
  const label =
    count === null
      ? `${share}% of comparable communes hold fewer`
      : `${count} here; ${share}% of comparable communes hold fewer` +
        (middle === null ? "" : `, and the middle one holds ${middle}`);

  return (
    <svg
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="mt-[6px] block h-[6px] w-full overflow-visible"
    >
      <title>{label}</title>
      <line x1="0" y1="3" x2="100" y2="3" stroke="var(--color-line-2)" strokeWidth="1" />
      <line
        x1="0"
        y1="3"
        x2={share}
        y2="3"
        stroke="var(--color-ink-3)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx={share} cy="3" r="2.5" fill="var(--color-ink)" />
    </svg>
  );
}
