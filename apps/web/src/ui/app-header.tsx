import { useId, useState } from "react";

interface AppHeaderProps {
  /** Back to the region, with nothing selected and nothing half-written. */
  onGoHome: () => void;
  /** Look a commune up. Permanent: it is the main thing a user comes to do. */
  onSearch: (query: string) => void;
  /** What HomeGround draws on, and what each source cannot tell you. */
  onShowSources: () => void;
}

const MIN_QUERY = 3;

export function AppHeader({ onGoHome, onSearch, onShowSources }: AppHeaderProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const ready = query.trim().length >= MIN_QUERY;

  function submit() {
    if (ready) {
      onSearch(query.trim());
      // The commune being researched is named in the sidebar from here on, so
      // leaving it in the field only makes the next lookup a deletion first.
      setQuery("");
    }
  }

  return (
    <header className="flex h-header flex-none items-center gap-[14px] border-b border-line-2 bg-surface px-[14px]">
      {/* Fixed to the sidebar width so the wordmark aligns with the column below. */}
      <div className="flex w-sidebar flex-none items-center gap-2">
        <h1 className="m-0">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 rounded-sharp text-subhead font-semibold tracking-[-0.01em] hover:opacity-80"
          >
            {/* Decorative: the wordmark beside it already carries the name. */}
            <img src="/logo.svg" alt="" className="size-[18px] flex-none" />
            HomeGround
          </button>
        </h1>
        <span className="numeric rounded-sharp border border-line px-[5px] py-px text-[10px] whitespace-nowrap text-ink-3">
          OCC · PACA
        </span>
      </div>

      <form
        aria-label="Look up a commune"
        className="flex min-w-0 flex-1 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={searchId} className="sr-only">
          Look up a commune
        </label>
        <input
          id={searchId}
          className="h-[30px] w-full max-w-[420px] min-w-0 rounded-sharp border border-line-2 px-[9px] text-body focus:border-ink focus:shadow-[0_0_0_3px_rgba(27,26,23,.07)] focus:outline-none"
          placeholder="Look up a commune — Fabrezan, or 11200"
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
          className="rounded-sharp border border-line-2 px-[9px] py-[5px] text-caption text-ink-2 hover:bg-row-hover disabled:opacity-40"
        >
          Look up
        </button>
      </form>

      <button
        type="button"
        onClick={onShowSources}
        className="flex-none rounded-sharp border border-line-2 px-[9px] py-[5px] text-caption text-ink-2 hover:bg-row-hover"
      >
        Sources &amp; methodology
      </button>
    </header>
  );
}
