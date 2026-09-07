import { useId, useState } from "react";

interface FirstUseOverlayProps {
  /** Look a place up: move the map there and begin a property from it. */
  onLookup: (query: string) => void;
  /** Skip the lookup, for somewhere the user can already find on the map. */
  onPlaceOnMap: () => void;
}

const MIN_QUERY = 3;

/**
 * Shown over the map when nothing is saved. The gradient thins to the right so
 * the map stays legible: geography is the mental model, and it should be
 * established before anything has been saved.
 */
export function FirstUseOverlay({ onLookup, onPlaceOnMap }: FirstUseOverlayProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  return (
    <div
      className="absolute inset-0 z-[800] flex items-center"
      style={{
        background:
          "linear-gradient(90deg, rgb(247 245 241 / 0.96) 0%, rgb(247 245 241 / 0.90) 42%, rgb(247 245 241 / 0.28) 100%)",
      }}
    >
      <div className="ml-[7vw] flex max-w-[520px] flex-col gap-4">
        <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          HomeGround
        </span>

        <h2 className="m-0 text-hero leading-[1.08] font-semibold tracking-[-0.03em]">
          Find somewhere worth living.
        </h2>

        <p className="m-0 max-w-[440px] text-[15.5px] leading-[1.6] text-ink-2">
          Save a property and HomeGround will help you understand its wildfire context, healthcare
          access and everyday remoteness.
        </p>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();

            if (query.trim().length >= MIN_QUERY) {
              onLookup(query.trim());
            }
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Address, village or place name
          </label>

          <div className="flex gap-2">
            <input
              id={inputId}
              className="h-[38px] flex-1 rounded-sharp border border-line-2 bg-surface px-3 text-body focus:border-ink focus:shadow-[0_0_0_3px_rgba(27,26,23,.07)] focus:outline-none"
              placeholder="A village, hamlet or address — Montouliers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="submit"
              disabled={query.trim().length < MIN_QUERY}
              className="h-[38px] rounded-sharp bg-ink px-4 text-caption text-surface disabled:opacity-40"
            >
              Look up
            </button>
          </div>

          <p className="m-0 text-caption text-ink-3">
            Somewhere with no address? Look up the nearest village, then{" "}
            <button
              type="button"
              onClick={onPlaceOnMap}
              className="underline underline-offset-2 hover:text-ink"
            >
              place the point yourself
            </button>
            .
          </p>
        </form>

        <p className="m-0 max-w-[420px] text-body text-ink-3">
          You find houses wherever you like. This is where you work out whether their locations suit
          the life you want — evidence and trade-offs, never a verdict on safety.
        </p>
      </div>
    </div>
  );
}
