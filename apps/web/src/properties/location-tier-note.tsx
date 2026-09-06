import type { LocationTier } from "../api/types.js";

/**
 * What the stored coordinates actually identify. Shown because locating a
 * property from a listing is an estimate, and specs/property.md requires that
 * the estimate stay visible rather than be dressed up as precision.
 */
const TIER_NOTE: Record<LocationTier, string> = {
  exact: "Located exactly",
  zone: "Located to a hamlet or street",
  commune: "Located to the commune only",
};

export function LocationTierNote({ tier }: { tier: LocationTier }) {
  return (
    <span className="rounded-sharp border border-line px-[5px] py-px text-[10px] text-ink-3">
      {TIER_NOTE[tier]}
    </span>
  );
}
