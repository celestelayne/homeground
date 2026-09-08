import { useEffect, useId, useRef, useState } from "react";
import type { AreaLookup, CommuneChoice } from "../areas/use-area-lookup.js";
import { SearchResults } from "./search-results.js";

interface CommuneSearchProps {
  label: string;
  placeholder: string;
  /** Focus on mount, for a search that opened because it was asked for. */
  autoFocus?: boolean;
  onSuggest: (query: string) => void;
  onChoose: (choice: CommuneChoice) => void;
  onClose?: (() => void) | undefined;
  lookup: AreaLookup;
}

/** Long enough that the results settle, short enough not to feel posted. */
const DEBOUNCE_MS = 250;

/**
 * A typeahead over French communes.
 *
 * There is no submit: a query is a question, and the answer is the list of
 * communes it could mean. Nothing is looked up until one is chosen, which is
 * the same confirm-before-committing rule the rest of HomeGround follows.
 */
export function CommuneSearch({
  label,
  placeholder,
  autoFocus = false,
  onSuggest,
  onChoose,
  onClose,
  lookup,
}: CommuneSearchProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      input.current?.focus();
    }
  }, [autoFocus]);

  // Held in a ref so the debounce depends on the query alone. Depending on the
  // callback restarts the timer on every render, and since a suggestion causes
  // a render, that is a request a second forever.
  const onSuggestRef = useRef(onSuggest);
  onSuggestRef.current = onSuggest;

  // Typing outruns the network, so the query settles before it is asked.
  useEffect(() => {
    const timer = setTimeout(() => onSuggestRef.current(query), DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative flex flex-1 items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <span aria-hidden="true" className="absolute left-[10px] text-ink-3">
        ⌕
      </span>

      <input
        ref={input}
        id={inputId}
        type="search"
        className="h-[34px] w-full rounded-sharp border border-line-2 pr-3 pl-[30px] text-body focus:border-ink focus:shadow-[0_0_0_3px_rgba(27,26,23,.07)] focus:outline-none"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="flex-none px-1 text-ink-3 hover:text-ink"
        >
          ✕
        </button>
      ) : null}

      <SearchResults
        lookup={lookup}
        onChoose={(choice) => {
          setQuery("");
          onChoose(choice);
        }}
      />
    </div>
  );
}
