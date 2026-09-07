import type { LocationTier } from "../api/types.js";

const TIERS: Array<{ tier: LocationTier; label: string; hint: string }> = [
  { tier: "exact", label: "Exactly", hint: "This is the property itself" },
  { tier: "zone", label: "Roughly", hint: "The right hamlet, street or valley" },
  { tier: "commune", label: "The commune", hint: "Only the village is known" },
];

interface LocationTierSelectorProps {
  value: LocationTier | null;
  suggested: LocationTier | null;
  onChange: (tier: LocationTier) => void;
}

/**
 * Locating a property from a listing is an estimate. The user says how good
 * the estimate is; HomeGround never decides for them, and there is no default.
 */
export function LocationTierSelector({ value, suggested, onChange }: LocationTierSelectorProps) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
        How well do you know where it is?
      </legend>

      <div className="flex flex-col gap-1">
        {TIERS.map(({ tier, label, hint }) => {
          const isActive = tier === value;

          return (
            <button
              key={tier}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(tier)}
              className={[
                "flex items-baseline gap-2 rounded-sharp border px-[9px] py-[7px] text-left",
                isActive
                  ? "border-ink bg-ink text-surface"
                  : "border-line-2 text-ink-2 hover:bg-row-hover",
              ].join(" ")}
            >
              <span className="text-row font-medium">{label}</span>
              <span className={isActive ? "text-caption opacity-80" : "text-caption text-ink-3"}>
                {hint}
              </span>
              {tier === suggested && !isActive ? (
                <span className="ml-auto text-caption text-ink-3">suggested</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
