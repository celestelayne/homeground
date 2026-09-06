import type { PropertyStatus } from "../api/types.js";
import { STATUS_LABEL, STATUS_ORDER } from "./status.js";
import { StatusMark } from "./status-mark.js";

interface PropertyStatusSelectorProps {
  value: PropertyStatus;
  onChange: (status: PropertyStatus) => void;
  disabled?: boolean;
}

export function PropertyStatusSelector({ value, onChange, disabled }: PropertyStatusSelectorProps) {
  return (
    <fieldset className="m-0 flex flex-wrap gap-1 border-0 p-0">
      <legend className="sr-only">Status</legend>
      {STATUS_ORDER.map((status) => {
        const isActive = status === value;

        return (
          <button
            key={status}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={[
              "flex items-center gap-[6px] rounded-sharp border px-[9px] py-[5px] text-caption",
              "disabled:opacity-50",
              isActive
                ? "border-ink bg-ink text-surface"
                : "border-line-2 text-ink-2 hover:bg-row-hover",
            ].join(" ")}
          >
            <StatusMark status={status} size={9} />
            {STATUS_LABEL[status]}
          </button>
        );
      })}
    </fieldset>
  );
}
