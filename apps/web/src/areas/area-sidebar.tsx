import type { Area, Evidence } from "../api/types.js";
import { labelFor } from "../sources/metric-labels.js";
import type { AreaLookup, CommuneChoice } from "./use-area-lookup.js";

interface AreaSidebarProps {
  lookup: AreaLookup;
  onChoose: (choice: CommuneChoice) => void;
}

const number = new Intl.NumberFormat("en-GB");

export function AreaSidebar({ lookup, onChoose }: AreaSidebarProps) {
  switch (lookup.kind) {
    case "idle":
      return null;

    case "searching":
      return <Note>Looking up {lookup.query}…</Note>;

    case "no-matches":
      // The lookup worked. Nothing matched. Not the same as it failing.
      return <Note>No commune found for “{lookup.query}”.</Note>;

    case "unavailable":
      return (
        <Note>
          Could not look up “{lookup.query}”. The commune service did not answer, so this is unknown
          rather than nothing.
        </Note>
      );

    case "ambiguous":
      return (
        <div className="flex flex-col gap-2 px-4 py-4">
          <Heading>Which commune?</Heading>
          <p className="m-0 text-body text-ink-3">
            “{lookup.query}” matches {lookup.choices.length} communes. A postcode covers several,
            and a village name turns up in street names elsewhere.
          </p>
          <div className="flex flex-col gap-1">
            {lookup.choices.map((choice) => (
              <button
                key={choice.code}
                type="button"
                onClick={() => onChoose(choice)}
                className="rounded-sharp px-2 py-[6px] text-left text-body hover:bg-row-hover"
              >
                {choice.label}
                <span className="numeric ml-2 text-caption text-ink-3">{choice.code}</span>
              </button>
            ))}
          </div>
        </div>
      );

    case "loaded":
      return <AreaDetail area={lookup.area} />;
  }
}

function AreaDetail({ area }: { area: Area }) {
  const postcode = area.postcodes[0];

  return (
    <div className="flex flex-col">
      <div className="border-b border-line px-4 py-4">
        <Heading>Research around</Heading>
        <h2 className="m-0 text-panel-title font-semibold tracking-[-0.015em]">
          {area.name}
          {postcode ? <span className="numeric text-ink-3">, {postcode}</span> : null}
        </h2>
        <p className="m-0 mt-2 text-caption leading-[1.5] text-ink-2">
          Results describe {area.name} and its surrounding area, not this specific house.
        </p>
      </div>

      <dl className="m-0 flex flex-col gap-3 px-4 py-4">
        <Fact label="Department">
          {area.department.name} <span className="numeric text-ink-3">{area.department.code}</span>
        </Fact>
        <Fact label="Region">{area.region.name}</Fact>
        {area.intercommunality ? (
          <Fact label="Intercommunality">{area.intercommunality.name}</Fact>
        ) : null}
        <Fact label="INSEE code">
          <span className="numeric">{area.code}</span>
        </Fact>
      </dl>

      <Measurements evidence={area.evidence} />

      <p className="m-0 border-t border-line px-4 py-4 text-caption leading-[1.5] text-ink-3">
        A description of the area's character is not shown because no source for one has been chosen
        yet — HomeGround does not write its own.
      </p>
    </div>
  );
}

const SOURCE_NAMES: Record<string, string> = {
  "geo-api-gouv": "Découpage administratif",
  "insee-census": "INSEE census",
};

/**
 * Every figure carries where it came from and when the source observed it.
 *
 * Rounding happens here and only here. The stored value keeps the decimals the
 * source published, because rounding before deriving a share changes the share.
 */
function Measurements({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return null;
  }

  const ordered = [...evidence].sort((a, b) =>
    (b.observedAt ?? "").localeCompare(a.observedAt ?? ""),
  );

  return (
    <dl className="m-0 flex flex-col gap-3 border-t border-line px-4 py-4">
      {ordered.map((fact) => (
        <div key={`${fact.metric}-${fact.observedAt}`} className="flex flex-col gap-[2px]">
          <dt className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
            {labelFor(fact.metric)}
            {fact.observedAt ? (
              <span className="numeric ml-1 normal-case">
                {new Date(fact.observedAt).getUTCFullYear()}
              </span>
            ) : null}
          </dt>
          <dd className="m-0 text-body">
            <Reading fact={fact} />
          </dd>
          <span className="text-caption text-ink-3">
            {SOURCE_NAMES[fact.sourceId] ?? fact.sourceId}
            {fact.state === "estimated" ? " · estimate" : null}
          </span>
        </div>
      ))}
    </dl>
  );
}

function Reading({ fact }: { fact: Evidence }) {
  if (fact.state === "unavailable") {
    // Could not ask. Different from asking and being told nothing.
    return <span className="text-ink-3">Unavailable</span>;
  }

  if (fact.value === null) {
    return <Unknown />;
  }

  const decimals = fact.unit === "%" ? 1 : 0;

  return (
    <>
      {number.format(Number(fact.value.toFixed(decimals)))}
      {fact.unit === "%" ? "%" : ` ${fact.unit}`}
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <dt className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">{label}</dt>
      <dd className="m-0 text-body">{children}</dd>
    </div>
  );
}

/** Not zero, not blank. The source did not say. */
function Unknown() {
  return <span className="text-ink-3">Unknown</span>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
      {children}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="m-0 px-4 py-4 text-body leading-[1.5] text-ink-3">{children}</p>;
}
