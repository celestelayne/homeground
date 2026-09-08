import { type ReactNode, useId, useState } from "react";

interface SectionProps {
  title: string;
  /** Open when this is what the reader came for, closed when it is context. */
  defaultOpen?: boolean;
  /** A caption above the body, for scoping what the figures describe. */
  note?: ReactNode;
  children: ReactNode;
}

/**
 * The one accordion. Every collapsible block on this screen uses it, and a new
 * one chooses its open state by whether it is primary content or supporting
 * context — never by content length or novelty.
 */
export function Section({ title, defaultOpen = false, note, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2 px-6 py-4 text-left hover:bg-row-hover"
      >
        <span
          aria-hidden="true"
          className={`text-caption text-ink-3 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="flex-1 text-subhead font-semibold tracking-[-0.01em]">{title}</span>
        <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        // Labelled so each section is reachable on its own: "Pharmacies" is a
        // category toggle in one and a counted metric in another.
        <section id={bodyId} aria-label={title} className="px-6 pb-5">
          {note ? <p className="m-0 mb-3 text-body leading-[1.5] text-ink-3">{note}</p> : null}
          {children}
        </section>
      ) : null}
    </div>
  );
}
