import { useId, useState } from "react";

interface FirstUseOverlayProps {
  /** Look a place up: move the map there and begin a property from it. */
  onLookup: (query: string) => void;
  /**
   * Close it and go back to the map. Absent on genuine first use, where there
   * is nothing behind this to go back to.
   */
  onDismiss?: (() => void) | undefined;
}

const MIN_QUERY = 3;

/**
 * Shown over the map on first use, and whenever the user goes home. The
 * gradient thins to the right so the map stays legible: geography is the
 * mental model, and it should be established before anything has been saved.
 */
export function FirstUseOverlay({ onLookup, onDismiss }: FirstUseOverlayProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const ready = query.trim().length >= MIN_QUERY;

  function submit() {
    if (ready) {
      onLookup(query.trim());
    }
  }

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
          Find somewhere worth living.
        </h2>

        <p className="m-0 max-w-[440px] text-[15.5px] leading-[1.6] text-ink-2">
          Save a property and HomeGround will help you understand its wildfire context, healthcare
          access and everyday remoteness.
        </p>

        <form
          aria-label="Look up a place"
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
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
              // A form whose only submit button is disabled does not submit on
              // Enter, so Enter is handled here rather than left to the browser.
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="submit"
              disabled={!ready}
              className="h-[38px] rounded-sharp bg-ink px-4 text-caption text-surface disabled:opacity-40"
            >
              Look up
            </button>
          </div>
        </form>

        <p className="m-0 max-w-[420px] text-body text-ink-3">
          You find houses wherever you like. This is where you work out whether their locations suit
          the life you want — evidence and trade-offs, never a verdict on safety.
        </p>
      </div>
    </div>
  );
}
