import { BASE_MAPS, type BaseMap } from "./map-tiles.js";

interface BaseMapPickerProps {
  value: BaseMap;
  onChange: (basemap: BaseMap) => void;
}

/** TEMPORARY: for comparing basemaps. Remove once one is chosen. */
export function BaseMapPicker({ value, onChange }: BaseMapPickerProps) {
  return (
    <div className="absolute bottom-3 left-3 z-[600] flex flex-col gap-px rounded-card border border-line-2 bg-surface p-1 shadow-[0_1px_2px_rgba(27,26,23,.05),0_8px_24px_-12px_rgba(27,26,23,.22)]">
      {BASE_MAPS.map((basemap) => (
        <button
          key={basemap.id}
          type="button"
          onClick={() => onChange(basemap)}
          aria-pressed={basemap.id === value.id}
          className={[
            "rounded-sharp px-2 py-1 text-left text-caption",
            basemap.id === value.id ? "bg-ink text-surface" : "text-ink-2 hover:bg-row-hover",
          ].join(" ")}
        >
          {basemap.label}
        </button>
      ))}
    </div>
  );
}
