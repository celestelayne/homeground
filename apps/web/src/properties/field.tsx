import { type ReactNode, useId } from "react";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  /** Receives the id to put on the control, so the label is explicitly bound. */
  children: (id: string) => ReactNode;
}

/**
 * Defined at module scope. A field component declared inside a panel's render
 * body remounts its input on every keystroke and drops focus.
 */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
        {label}
      </label>
      {children(id)}
      {hint ? <span className="text-caption text-ink-3">{hint}</span> : null}
    </div>
  );
}

export const inputClass =
  "rounded-sharp border border-line-2 px-[9px] py-[7px] text-body focus:border-ink focus:shadow-[0_0_0_3px_rgba(27,26,23,.07)] focus:outline-none";
