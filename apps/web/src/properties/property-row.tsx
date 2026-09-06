import type { Property } from "../api/types.js";
import { formatPrice } from "./format.js";
import { StatusMark } from "./status-mark.js";

interface PropertyRowProps {
  property: Property;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function PropertyRow({ property, isSelected, onSelect }: PropertyRowProps) {
  const price = formatPrice(property.askingPrice);

  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={() => onSelect(property.id)}
      className={[
        "flex w-full items-start gap-2 px-4 py-[7px] text-left",
        "hover:bg-row-hover",
        isSelected ? "bg-row-selected shadow-[inset_2px_0_0_var(--color-ink)]" : "",
        // Rejected properties stay in the list. Another house may yet appear
        // in the same area, and the reason for rejecting this one still matters.
        property.status === "rejected" ? "opacity-[0.68]" : "",
      ].join(" ")}
    >
      <span className="pt-[3px]">
        <StatusMark status={property.status} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-row font-medium">{property.name}</span>
        {price ? <span className="numeric block text-meta text-ink-3">{price}</span> : null}
      </span>
    </button>
  );
}
