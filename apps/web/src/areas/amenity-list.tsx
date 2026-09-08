import type { Amenity, AmenityKind } from "./amenities.js";
import { CATEGORIES, formatDistance, KIND_COLOUR } from "./amenities.js";

interface AmenityListProps {
  amenities: Amenity[];
  /** How many the source places here in total, per category. */
  totals: Record<string, number>;
  /** How many could be drawn at all. */
  placeable: number;
  hidden: ReadonlySet<string>;
  onToggle: (kind: AmenityKind) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * The categories, and the facilities they let through.
 *
 * The number beside a row is the number on its pin, and both are recomputed
 * whenever a category is toggled — the number is a lookup between two panels,
 * not an identity, so a list reading 1, 4, 7 would be nothing but gaps.
 */
export function AmenityList({
  amenities,
  totals,
  placeable,
  hidden,
  onToggle,
  selectedId,
  onSelect,
}: AmenityListProps) {
  return (
    <div className="flex gap-6">
      <div className="flex w-[190px] flex-none flex-col gap-1">
        {CATEGORIES.map((category) => {
          const off = hidden.has(category.kind);

          return (
            <button
              key={category.kind}
              type="button"
              onClick={() => onToggle(category.kind)}
              aria-pressed={!off}
              className={`flex items-center gap-2 rounded-sharp px-1 py-[5px] text-left text-body hover:bg-row-hover ${
                off ? "opacity-40" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-[19px] flex-none place-items-center rounded-full text-[10px] text-surface ${KIND_COLOUR[category.kind]}`}
              >
                {category.glyph}
              </span>
              <span className="flex-1">{category.label}</span>
              <span className="numeric text-caption text-ink-3">{totals[category.kind] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1">
        <p className="numeric m-0 mb-2 text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          {/*
            "5 of 51" rather than "5 shown": the nearest five answer the
            question, and the total stops them being mistaken for all of them.
          */}
          {amenities.length === placeable ? (
            <>{amenities.length} shown</>
          ) : (
            <>
              {amenities.length} of {placeable} shown
            </>
          )}
        </p>

        {amenities.length === 0 ? (
          <p className="m-0 text-body leading-[1.5] text-ink-3">
            Nothing to place here. A facility the register located only to its commune is counted
            beside its category but left off the map, because its coordinate is the commune's centre
            rather than its own address.
          </p>
        ) : null}

        <ol className="m-0 flex list-none flex-col gap-px p-0">
          {amenities.map((amenity) => (
            <li key={amenity.id}>
              <button
                type="button"
                onClick={() => onSelect(amenity.id === selectedId ? null : amenity.id)}
                aria-pressed={amenity.id === selectedId}
                className={`flex w-full items-start gap-[10px] rounded-sharp px-2 py-2 text-left hover:bg-row-hover ${
                  amenity.id === selectedId ? "bg-row-selected" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`numeric mt-[1px] grid size-[21px] flex-none place-items-center rounded-full text-[11px] text-surface ${KIND_COLOUR[amenity.kind]}`}
                >
                  {amenity.number}
                </span>
                <span className="min-w-0">
                  <span className="block text-body font-medium">{amenity.name}</span>
                  <span className="block text-caption text-ink-3">
                    {amenity.address ?? "No street given"} · {formatDistance(amenity.distanceKm)}{" "}
                    from the centre
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
