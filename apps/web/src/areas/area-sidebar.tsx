import type { Area, Evidence } from "../api/types.js";
import { labelFor } from "../sources/metric-labels.js";
import { Section } from "../ui/section.js";
import type { Amenity, AmenityKind } from "./amenities.js";
import { AmenityList } from "./amenity-list.js";
import { CommuneImage } from "./commune-image.js";
import type { AreaLookup } from "./use-area-lookup.js";

interface AreaSidebarProps {
  lookup: AreaLookup;
  /** Take the outline off the map, or put it back. The research stays either way. */
  onToggleBoundary?: (() => void) | undefined;
  boundaryShown?: boolean;
  amenities: Amenity[];
  /** How many the source places here in total, per category. */
  totals: Record<string, number>;
  placeable: number;
  hidden: ReadonlySet<string>;
  onToggleCategory: (kind: AmenityKind) => void;
  selectedAmenityId: string | null;
  onSelectAmenity: (id: string | null) => void;
}

const number = new Intl.NumberFormat("en-GB");

const SOURCE_NAMES: Record<string, string> = {
  "geo-api-gouv": "Découpage administratif",
  "insee-census": "INSEE census",
  finess: "FINESS",
};

export function AreaSidebar({
  lookup,
  onToggleBoundary,
  boundaryShown = false,
  amenities,
  totals,
  placeable,
  hidden,
  onToggleCategory,
  selectedAmenityId,
  onSelectAmenity,
}: AreaSidebarProps) {
  // Only a loaded commune reaches here. Searching, ambiguity and failure are
  // search chrome and render beneath the input that caused them.
  if (lookup.kind !== "loaded") {
    return null;
  }

  return (
    <AreaDetail
      area={lookup.area}
      onToggleBoundary={onToggleBoundary}
      boundaryShown={boundaryShown}
      amenities={amenities}
      totals={totals}
      placeable={placeable}
      hidden={hidden}
      onToggleCategory={onToggleCategory}
      selectedAmenityId={selectedAmenityId}
      onSelectAmenity={onSelectAmenity}
    />
  );
}

function AreaDetail({
  area,
  onToggleBoundary,
  boundaryShown,
  amenities,
  totals,
  placeable,
  hidden,
  onToggleCategory,
  selectedAmenityId,
  onSelectAmenity,
}: {
  area: Area;
  onToggleBoundary?: (() => void) | undefined;
  boundaryShown?: boolean;
  amenities: Amenity[];
  totals: Record<string, number>;
  placeable: number;
  hidden: ReadonlySet<string>;
  onToggleCategory: (kind: AmenityKind) => void;
  selectedAmenityId: string | null;
  onSelectAmenity: (id: string | null) => void;
}) {
  const postcode = area.postcodes[0];

  return (
    <div className="flex flex-col">
      {/*
        The commune names itself before it is pictured. The photograph is one
        contributor's view of the place; the name and the department are what
        the reader looked up, so they lead.
      */}
      <div className="px-6 pt-6">
        <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          {area.department.name} · {area.region.name}
        </span>

        <h1 className="m-0 mt-1 text-hero-sm font-semibold tracking-[-0.02em]">
          {area.name}
          {postcode ? <span className="numeric text-ink-3">, {postcode}</span> : null}
        </h1>
      </div>

      <CommuneImage area={area} />

      <div className="px-6 pt-4 pb-5">
        {/*
          Where a description of the commune would go. Nothing is written here
          because no source publishes one and ADR-004 forbids inventing it —
          a placeholder that reads like real prose is shipped fiction.
        */}
        <p className="m-0 mt-3 text-body leading-[1.6] text-ink-3">
          A description of this commune's character is not shown because no source for one has been
          chosen yet — HomeGround does not write its own.
        </p>

        <p className="m-0 mt-3 text-caption leading-[1.5] text-ink-2">
          Results describe {area.name} and its surrounding area, not any single address.
        </p>

        {onToggleBoundary ? (
          <button
            type="button"
            onClick={onToggleBoundary}
            aria-pressed={boundaryShown}
            className="mt-4 flex items-center gap-[6px] rounded-sharp border border-line-2 px-[7px] py-[3px] text-caption text-ink-3 hover:bg-row-hover hover:text-ink"
          >
            <span aria-hidden="true">{boundaryShown ? "✕" : "▢"}</span>
            {boundaryShown ? "Hide the commune outline" : "Show the commune outline"}
          </button>
        ) : null}
      </div>

      <Section title="Area amenities" defaultOpen>
        <AmenityList
          amenities={amenities}
          totals={totals}
          placeable={placeable}
          hidden={hidden}
          onToggle={onToggleCategory}
          selectedId={selectedAmenityId}
          onSelect={onSelectAmenity}
        />
      </Section>

      <Section
        title={`Research around ${area.name}`}
        note={`These figures describe the whole commune, not any single address.`}
      >
        <Measurements evidence={area.evidence} />
      </Section>
    </div>
  );
}

/**
 * The most recent observation of each metric.
 *
 * The census publishes three editions and HomeGround holds all of them —
 * a commune's direction of travel is the point, and M3 compares against it.
 * But a brief that answers "what is this place like" does not answer it three
 * times over, so the panel shows the latest and the earlier editions stay in
 * the evidence behind it.
 */
function latestPerMetric(evidence: Evidence[]): Evidence[] {
  const latest = new Map<string, Evidence>();

  for (const fact of evidence) {
    const held = latest.get(fact.metric);

    if (!held || (fact.observedAt ?? "") > (held.observedAt ?? "")) {
      latest.set(fact.metric, fact);
    }
  }

  return [...latest.values()];
}

function Measurements({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return null;
  }

  const ordered = [...latestPerMetric(evidence)]
    // Facility counts belong beside the list of facilities, not repeated as
    // rows here.
    .filter((fact) => !fact.metric.startsWith("health."))
    .sort((a, b) => (b.observedAt ?? "").localeCompare(a.observedAt ?? ""));

  return (
    <dl className="m-0 divide-y divide-line rounded-card border border-line">
      {ordered.map((fact) => (
        <div
          key={`${fact.metric}-${fact.observedAt}`}
          className="flex items-baseline justify-between gap-4 px-4 py-[10px]"
        >
          <dt className="text-body text-ink">
            {labelFor(fact.metric)}
            {fact.observedAt ? (
              <span className="numeric ml-1 text-ink-3">
                {new Date(fact.observedAt).getUTCFullYear()}
              </span>
            ) : null}
          </dt>
          <dd className="m-0 text-right">
            <span className="numeric block text-body">
              <Reading fact={fact} />
            </span>
            <span className="numeric block text-caption text-ink-3">
              {SOURCE_NAMES[fact.sourceId] ?? fact.sourceId}
              {fact.state === "estimated" ? " · estimate" : null}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How far to round for display. The stored value keeps every decimal the
 * source published; rounding here is the only place it happens.
 *
 * A count of dwellings is a whole number to a reader. A commune of 28.87 km²
 * is not 29 — at this size the rounding is a tenth of the village.
 */
const DECIMALS: Record<string, number> = {
  "%": 1,
  "km²": 2,
  "residents per km²": 1,
};

function Reading({ fact }: { fact: Evidence }) {
  if (fact.state === "unavailable") {
    // Could not ask. Different from asking and being told nothing.
    return <span className="text-ink-3">Unavailable</span>;
  }

  if (fact.value === null) {
    return <Unknown />;
  }

  const decimals = DECIMALS[fact.unit ?? ""] ?? 0;

  return (
    <>
      {number.format(Number(fact.value.toFixed(decimals)))}
      {fact.unit === "%" ? "%" : ` ${fact.unit}`}
    </>
  );
}

/** Not zero, not blank. The source did not say. */
function Unknown() {
  return <span className="text-ink-3">Unknown</span>;
}
