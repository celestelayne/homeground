import type { AreaLookup, CommuneChoice } from "../areas/use-area-lookup.js";

interface SearchResultsProps {
  lookup: AreaLookup;
  onChoose: (choice: CommuneChoice) => void;
}

/**
 * What the search has found, directly beneath the input that typed it.
 *
 * These states used to render in the overview panel, which meant a half-typed
 * query took over the place a commune's figures belong. They are search
 * chrome, so they live with the search, and the panel keeps its own job.
 *
 * A commune is never chosen automatically, not even when only one matches: a
 * postcode names several and a village name turns up in street names
 * elsewhere, so picking the first would research somewhere nobody asked about.
 */
export function SearchResults({ lookup, onChoose }: SearchResultsProps) {
  if (lookup.kind === "idle" || lookup.kind === "loaded") {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Search results"
      className="absolute top-full right-0 left-0 z-[870] max-h-[60vh] overflow-y-auto border-b border-line-2 bg-surface shadow-[0_18px_40px_-24px_rgba(27,26,23,.45)]"
    >
      {lookup.kind === "searching" ? (
        <p className="m-0 px-4 py-4 text-body text-ink-3">Looking up {lookup.query}…</p>
      ) : null}

      {lookup.kind === "no-matches" ? (
        // The lookup worked. Nothing matched. Not the same as it failing.
        <p className="m-0 px-4 py-4 text-body text-ink-3">No commune found for “{lookup.query}”.</p>
      ) : null}

      {lookup.kind === "unavailable" ? (
        <p className="m-0 px-4 py-4 text-body leading-[1.5] text-ink-3">
          Could not look up “{lookup.query}”. The commune service did not answer, so this is unknown
          rather than nothing.
        </p>
      ) : null}

      {lookup.kind === "matches" ? (
        <>
          <p className="m-0 px-4 pt-3 pb-1 text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
            {lookup.choices.length === 1 ? "Match" : `${lookup.choices.length} communes`}
          </p>
          <ul className="m-0 flex list-none flex-col p-0 pb-2">
            {lookup.choices.map((choice) => (
              <li key={choice.code}>
                <button
                  type="button"
                  onClick={() => onChoose(choice)}
                  className="w-full px-4 py-[9px] text-left hover:bg-row-hover"
                >
                  <span className="block text-body font-medium">{choice.name}</span>
                  <span className="numeric block text-caption text-ink-3">{choice.where}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
