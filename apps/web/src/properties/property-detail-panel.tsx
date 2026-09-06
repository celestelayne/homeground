import type { Property, PropertyStatus } from "../api/types.js";
import { formatCoordinates, formatPrice } from "./format.js";
import { LocationTierNote } from "./location-tier-note.js";
import { PropertyNotesField } from "./property-notes-field.js";
import { PropertyStatusSelector } from "./property-status-selector.js";

interface PropertyDetailPanelProps {
  property: Property;
  onClose: () => void;
  onChangeStatus: (status: PropertyStatus) => void;
  onSaveNotes: (notes: string | null) => void;
}

export function PropertyDetailPanel({
  property,
  onClose,
  onChangeStatus,
  onSaveNotes,
}: PropertyDetailPanelProps) {
  const price = formatPrice(property.askingPrice);

  return (
    <div className="flex flex-col gap-4 px-[18px] py-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-panel-title font-semibold tracking-[-0.015em]">{property.name}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close property"
          className="-mt-1 px-1 text-ink-3 hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-body text-ink-3">
          {property.address ? `${property.address} · ` : null}
          <span className="numeric">
            {formatCoordinates(property.latitude, property.longitude)}
          </span>
        </p>
        <div>
          <LocationTierNote tier={property.locationTier} />
        </div>
      </div>

      {price ? <p className="numeric text-section">{price}</p> : null}

      <PropertyStatusSelector value={property.status} onChange={onChangeStatus} />

      <PropertyNotesField key={property.id} notes={property.notes} onSave={onSaveNotes} />

      {property.listingUrl ? (
        <a
          href={property.listingUrl}
          target="_blank"
          rel="noreferrer"
          className="text-caption text-ink-3 underline underline-offset-2 hover:text-ink-2"
        >
          Original listing
        </a>
      ) : null}
    </div>
  );
}
