import { useEffect, useState } from "react";
import type { AreaLookup, CommuneChoice } from "../areas/use-area-lookup.js";
import { CommuneSearch } from "./commune-search.js";

interface AppHeaderProps {
  /** Back to the region, with nothing looked up. */
  onGoHome: () => void;
  /** What HomeGround draws on, and what each source cannot tell you. */
  onShowSources: () => void;
  onSuggest: (query: string) => void;
  onChoose: (choice: CommuneChoice) => void;
  lookup: AreaLookup;
}

export function AppHeader({
  onGoHome,
  onShowSources,
  onSuggest,
  onChoose,
  lookup,
}: AppHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="relative flex h-header flex-none items-center gap-[14px] border-b border-line-2 bg-surface px-[14px]">
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

      <div className="flex flex-1 items-center justify-end gap-3">
        <button
          type="button"
          onClick={onShowSources}
          className="flex-none rounded-sharp px-[9px] py-[5px] text-caption text-ink-2 hover:bg-row-hover"
        >
          Sources &amp; methodology
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search communes"
          aria-expanded={open}
          className="grid size-[32px] flex-none place-items-center rounded-full border border-line-2 text-ink-2 hover:bg-row-hover"
        >
          <span aria-hidden="true">⌕</span>
        </button>
      </div>

      {/*
        Open, the search covers the whole bar rather than opening a field of
        its own width. The query and its results then occupy one column, so
        nothing about searching reaches into the panel below.
      */}
      {open ? (
        <div className="absolute inset-0 z-[860] flex items-center gap-2 bg-surface px-[14px]">
          <CommuneSearch
            label="Search communes"
            placeholder="Search communes — Fabrezan, or 11200"
            autoFocus
            onSuggest={onSuggest}
            onChoose={(choice) => {
              setOpen(false);
              onChoose(choice);
            }}
            onClose={() => setOpen(false)}
            lookup={lookup}
          />
        </div>
      ) : null}
    </header>
  );
}
