import { useState } from "react";

interface PropertyNotesFieldProps {
  notes: string | null;
  onSave: (notes: string | null) => void;
}

/**
 * Defined at module scope. Declaring a field component inside a panel's render
 * remounts the input on every keystroke and drops focus.
 *
 * The caller keys this by property id, so selecting a different property
 * remounts it and an unsaved draft never follows you to another property.
 */
export function PropertyNotesField({ notes, onSave }: PropertyNotesFieldProps) {
  const [draft, setDraft] = useState(notes ?? "");

  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
        Your notes
      </span>
      <textarea
        value={draft}
        rows={4}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = draft.trim() === "" ? null : draft;

          if (next !== notes) {
            onSave(next);
          }
        }}
        className="rounded-sharp border border-line-2 px-[9px] py-[7px] text-body focus:border-ink focus:shadow-[0_0_0_3px_rgba(27,26,23,.07)] focus:outline-none"
      />
      <span className="text-caption text-ink-3">Kept separate from evidence.</span>
    </label>
  );
}
