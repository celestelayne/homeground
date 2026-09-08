import type { AreaLookup, CommuneChoice } from "../areas/use-area-lookup.js";
import { CommuneSearch } from "./commune-search.js";

interface FirstUseOverlayProps {
  onSuggest: (query: string) => void;
  onChoose: (choice: CommuneChoice) => void;
  lookup: AreaLookup;
  /**
   * Close it and go back to the map. Absent on genuine first use, where there
   * is nothing behind this to go back to.
   */
  onDismiss?: (() => void) | undefined;
}

/**
 * Shown over the map on first use, and whenever the user goes home. The
 * gradient thins to the right so the map stays legible: geography is the
 * mental model, and it should be established before anything has been saved.
 */
export function FirstUseOverlay({ onSuggest, onChoose, lookup, onDismiss }: FirstUseOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[800] flex items-center"
      style={{
        background:
          "linear-gradient(90deg, rgb(247 245 241 / 0.96) 0%, rgb(247 245 241 / 0.90) 42%, rgb(247 245 241 / 0.28) 100%)",
      }}
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close and return to the map"
          className="absolute top-3 right-3 px-2 py-1 text-ink-3 hover:text-ink"
        >
          ✕
        </button>
      ) : null}
      <div className="ml-[7vw] flex max-w-[520px] flex-col gap-4">
        <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          HomeGround
        </span>

        <h2 className="m-0 text-hero leading-[1.08] font-semibold tracking-[-0.03em]">
          Understand the community, not just the property.
        </h2>

        <p className="m-0 max-w-[440px] text-[15.5px] leading-[1.6] text-ink-2">
          Look up any commune and let’s explore it together. Let HomeGround show you where to find
          your daily essentials, local healthcare, and how the surrounding natural environment
          shapes daily life.
        </p>

        <div className="flex max-w-[440px]">
          <CommuneSearch
            label="Search communes"
            placeholder="A commune — Fabrezan, or 11200"
            onSuggest={onSuggest}
            onChoose={onChoose}
            lookup={lookup}
          />
        </div>

        <p className="m-0 max-w-[420px] text-body text-ink-3">
          Traditional agencies show you the four walls; HomeGround wants to help you find where you
          belong.
        </p>
      </div>
    </div>
  );
}
