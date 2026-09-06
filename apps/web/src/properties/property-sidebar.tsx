import type { Property, PropertyStatus } from "../api/types.js";
import { PropertyRow } from "./property-row.js";
import { STATUS_LABEL, STATUS_ORDER } from "./status.js";
import { StatusMark } from "./status-mark.js";

interface PropertySidebarProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showRejected: boolean;
  onToggleRejected: () => void;
}

export function PropertySidebar({
  properties,
  selectedId,
  onSelect,
  showRejected,
  onToggleRejected,
}: PropertySidebarProps) {
  const groups = STATUS_ORDER.map((status) => ({
    status,
    // Grouping is presentation. The server returns one flat, ordered list.
    members: properties.filter((property) => property.status === status),
  })).filter(
    ({ status, members }) => members.length > 0 && (showRejected || status !== "rejected"),
  );

  const hasRejected = properties.some((property) => property.status === "rejected");

  return (
    <>
      <div className="flex flex-col gap-1 border-b border-line px-4 pt-[14px] pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
            Saved properties
          </span>
          <span className="numeric text-meta text-ink-3">{properties.length}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col py-2">
        {groups.map(({ status, members }) => (
          <StatusGroup
            key={status}
            status={status}
            members={members}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {hasRejected ? (
        <button
          type="button"
          onClick={onToggleRejected}
          className="px-4 py-3 text-left text-caption text-ink-3 hover:text-ink-2"
        >
          {showRejected ? "Hide rejected properties" : "Show rejected properties"}
        </button>
      ) : null}
    </>
  );
}

function StatusGroup({
  status,
  members,
  selectedId,
  onSelect,
}: {
  status: PropertyStatus;
  members: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="pb-3">
      <h2 className="flex items-center gap-2 px-4 pt-3 pb-1">
        <StatusMark status={status} size={9} />
        <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          {STATUS_LABEL[status]}
        </span>
        <span className="numeric text-meta text-ink-3">{members.length}</span>
      </h2>
      {members.map((property) => (
        <PropertyRow
          key={property.id}
          property={property}
          isSelected={property.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
