import type { Evidence } from "../api/types.js";

/**
 * What the weather here has been, over the last five complete years.
 *
 * Grouped the way a person asks — what is the winter like, what is the summer
 * like, how much does it rain — rather than the way a station reports. Each
 * group names the station or stations behind it, because a commune has no
 * station of its own: Fabrezan's temperature comes from 5.1 km away and its
 * sunshine from Carcassonne, 35 km off and the only station in the entire
 * département that measures it.
 *
 * Five years is weather, not climate. The panel says so, because one hot
 * summer moves these figures.
 */
const number = new Intl.NumberFormat("en-GB");

interface Line {
  metric: string;
  say: (value: number) => string;
}

/** The three questions, and the figures that answer each. */
const GROUPS: { title: string; lines: Line[] }[] = [
  {
    title: "Winter",
    lines: [
      { metric: "weather.winterSun", say: (v) => `${Math.round(v)} hours of sun in December` },
      { metric: "weather.winterMornings", say: (v) => `mornings average ${v}°C` },
      { metric: "weather.frostDays", say: (v) => `${Math.round(v)} days of frost a year` },
    ],
  },
  {
    title: "Summer",
    lines: [
      { metric: "weather.summerAfternoons", say: (v) => `afternoons average ${v}°C` },
      { metric: "weather.daysAbove30", say: (v) => `${Math.round(v)} days above 30°C` },
      { metric: "weather.daysAbove35", say: (v) => `${Math.round(v)} of them above 35°C` },
      { metric: "weather.nightsAbove20", say: (v) => `${Math.round(v)} nights stay above 20°C` },
    ],
  },
  {
    title: "Rain and light",
    lines: [
      { metric: "weather.rainfall", say: (v) => `${number.format(Math.round(v))} mm a year` },
      { metric: "weather.rainDays", say: (v) => `falling on ${Math.round(v)} days` },
      {
        metric: "weather.sunshine",
        say: (v) => `${number.format(Math.round(v))} hours of sun a year`,
      },
    ],
  },
];

export function Weather({ area }: { area: { name: string; evidence: Evidence[] } }) {
  const held = new Map(area.evidence.map((fact) => [fact.metric, fact]));
  const groups = GROUPS.map((group) => ({
    title: group.title,
    rows: group.lines
      .map((line) => ({ ...line, fact: held.get(line.metric) }))
      .filter((row) => row.fact?.state === "known" && row.fact.value !== null),
  })).filter((group) => group.rows.length > 0);

  if (groups.length === 0) {
    const asked = GROUPS.some((group) => group.lines.some((line) => held.has(line.metric)));

    return (
      <p className="m-0 text-body leading-[1.5] text-ink-2">
        {asked ? (
          <>
            No weather station near enough to {area.name} has reported these measurements. A figure
            from further away would be describing somewhere else.
          </>
        ) : (
          <>Weather has not been looked up for {area.name}.</>
        )}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.title} className="rounded-card border border-line px-4 py-[10px]">
          <p className="m-0 text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
            {group.title}
          </p>

          <ul className="m-0 mt-[6px] flex list-none flex-col gap-[2px] p-0">
            {group.rows.map((row) => (
              <li key={row.metric} className="text-body leading-[1.5] text-ink">
                {row.say(row.fact?.value as number)}
              </li>
            ))}
          </ul>

          {/*
            Which station, how far, on how many years — deduplicated, because a
            group usually draws on one station and occasionally on two.
          */}
          <p className="m-0 mt-2 text-meta leading-[1.5] text-ink-3">
            {[...new Set(group.rows.map((row) => row.fact?.basis).filter(Boolean))].join(" · ")}
          </p>
        </div>
      ))}

      <p className="m-0 text-meta leading-[1.5] text-ink-3">
        Five years is weather, not climate: one hot summer moves these figures, and they are not an
        average year. A commune has no station of its own, so each figure comes from the nearest one
        that measures it — which is not the same station for each.
      </p>
    </div>
  );
}
