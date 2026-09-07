import { useEffect, useReducer, useState } from "react";
import { createProperty, geocode } from "../api/client.js";
import type { GeocodeCandidate, LocationTier } from "../api/types.js";
import {
  type AddPropertyDraft,
  canSave,
  emptyDraft,
  locationQuery,
  reduce,
} from "./add-property-machine.js";
import { Field, inputClass } from "./field.js";
import { readListingUrl } from "./listing-url.js";
import { LocationTierSelector } from "./location-tier-selector.js";

interface AddPropertyPanelProps {
  /** Coordinates from a point placed on the map, if the user has placed one. */
  placedPoint: { latitude: number; longitude: number } | null;
  onPlacingChange: (placing: boolean) => void;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export function AddPropertyPanel({
  placedPoint,
  onPlacingChange,
  onClose,
  onSaved,
}: AddPropertyPanelProps) {
  const [draft, dispatch] = useReducer(reduce, emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // A point placed on the map arrives from the parent.
  useEffect(() => {
    if (placedPoint) {
      dispatch({ type: "placed-on-map", ...placedPoint });
    }
  }, [placedPoint]);

  const query = locationQuery(draft.location);

  async function search() {
    if (query.trim().length < 3) {
      return;
    }

    dispatch({ type: "search-started", query });

    try {
      const candidates = await geocode(query);
      dispatch({ type: "candidates-returned", query, candidates });
    } catch {
      dispatch({ type: "lookup-failed", query });
    }
  }

  async function save() {
    if (draft.location.kind !== "confirmed" || draft.tier === null) {
      return;
    }

    setSaving(true);
    setSaveFailed(false);

    try {
      const price = Number.parseInt(draft.askingPrice.replace(/\D/g, ""), 10);
      const saved = await createProperty({
        name: draft.name.trim(),
        latitude: draft.location.latitude,
        longitude: draft.location.longitude,
        locationTier: draft.tier,
        address: draft.location.address,
        listingUrl: draft.listingUrl.trim() || null,
        askingPrice: Number.isNaN(price) ? null : price,
      });

      onSaved(saved.id);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 px-[18px] pt-4 pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-panel-title font-semibold tracking-[-0.015em]">Add property</h2>
          <p className="text-body text-ink-3">A name and a location. Add the rest later.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel adding a property"
          className="px-1 text-ink-3 hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] pb-4">
        <Field
          label="Listing URL"
          hint="HomeGround does not read estate-agent sites. The link is for your own reference."
        >
          {(id) => (
            <input
              id={id}
              type="url"
              className={inputClass}
              placeholder="Paste the agent's link"
              value={draft.listingUrl}
              onChange={(event) =>
                dispatch({
                  type: "listing-url-changed",
                  value: event.target.value,
                  suggestedName: readListingUrl(event.target.value).suggestedName,
                })
              }
            />
          )}
        </Field>

        <Field label="Name">
          {(id) => (
            <input
              id={id}
              className={inputClass}
              placeholder="Mas above the village"
              value={draft.name}
              onChange={(event) => dispatch({ type: "name-changed", value: event.target.value })}
            />
          )}
        </Field>

        <Field label="Address or place">
          {(id) => (
            <div className="flex gap-1">
              <input
                id={id}
                className={`${inputClass} flex-1`}
                placeholder="Montouliers"
                value={query}
                onChange={(event) => dispatch({ type: "query-changed", value: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void search();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void search()}
                className="rounded-sharp border border-line-2 px-[9px] text-caption text-ink-2 hover:bg-row-hover"
              >
                Find
              </button>
            </div>
          )}
        </Field>

        <LocationOutcome
          draft={draft}
          onConfirm={(candidate) => dispatch({ type: "candidate-confirmed", candidate })}
        />

        <button
          type="button"
          onClick={() => {
            dispatch({ type: draft.placing ? "placing-cancelled" : "placing-started" });
            onPlacingChange(!draft.placing);
          }}
          className={[
            "rounded-sharp border px-[9px] py-[7px] text-caption",
            draft.placing
              ? "border-ink bg-ink text-surface"
              : "border-line-2 text-ink-2 hover:bg-row-hover",
          ].join(" ")}
        >
          {draft.placing ? "Click the map to place it · cancel" : "Place on map"}
        </button>

        {draft.location.kind === "confirmed" ? (
          <LocationTierSelector
            value={draft.tier}
            suggested={
              draft.location.kind === "confirmed" && draft.location.source === "geocode"
                ? draft.location.suggestedTier
                : null
            }
            onChange={(tier: LocationTier) => dispatch({ type: "tier-declared", tier })}
          />
        ) : null}

        <Field label="Asking price €">
          {(id) => (
            <input
              id={id}
              inputMode="numeric"
              className={inputClass}
              placeholder="415000"
              value={draft.askingPrice}
              onChange={(event) => dispatch({ type: "price-changed", value: event.target.value })}
            />
          )}
        </Field>

        {saveFailed ? <p className="text-caption text-fail">Could not save. Try again.</p> : null}
      </div>

      <div className="flex gap-2 border-t border-line px-[18px] py-3">
        <button
          type="button"
          disabled={!canSave(draft) || saving}
          onClick={() => void save()}
          className="flex-1 rounded-sharp bg-ink px-[9px] py-[7px] text-caption text-surface disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save property"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sharp border border-line-2 px-[9px] py-[7px] text-caption text-ink-2 hover:bg-row-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** What the geocoder said, in the user's terms. */
function LocationOutcome({
  draft,
  onConfirm,
}: {
  draft: AddPropertyDraft;
  onConfirm: (candidate: GeocodeCandidate) => void;
}) {
  const { location } = draft;

  if (location.kind === "searching") {
    return <p className="text-caption text-ink-3">Looking…</p>;
  }

  if (location.kind === "no-matches") {
    return (
      <p className="text-caption text-ink-3">
        No matches for that address. You can still place it on the map.
      </p>
    );
  }

  if (location.kind === "lookup-unavailable") {
    // Unable to determine, which is not the same as finding nothing.
    return (
      <p className="text-caption text-ink-3">
        Address lookup is unavailable just now. You can still place it on the map.
      </p>
    );
  }

  if (location.kind === "candidates") {
    return (
      <ul className="flex flex-col gap-px">
        {location.candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              onClick={() => onConfirm(candidate)}
              className="w-full rounded-sharp px-[9px] py-[6px] text-left text-body hover:bg-row-hover"
            >
              {candidate.label}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (location.kind === "confirmed") {
    return (
      <p className="numeric text-caption text-ink-3">
        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
      </p>
    );
  }

  return null;
}
