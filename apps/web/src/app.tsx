import "./styles/global.css";
import { useState } from "react";
import { PropertyDetailPanel } from "./properties/property-detail-panel.js";
import { PropertyMap } from "./properties/property-map.js";
import { PropertySidebar } from "./properties/property-sidebar.js";
import { useProperties } from "./properties/use-properties.js";
import { AppShell } from "./ui/app-shell.js";

export function App() {
  const { properties, state, selectedId, selected, setSelectedId, update } = useProperties();
  const [showRejected, setShowRejected] = useState(true);

  return (
    <AppShell
      sidebar={
        state === "error" ? (
          <p className="px-4 py-4 text-body text-ink-3">Could not load your properties.</p>
        ) : (
          <PropertySidebar
            properties={properties}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showRejected={showRejected}
            onToggleRejected={() => setShowRejected((shown) => !shown)}
          />
        )
      }
      map={<PropertyMap properties={properties} selectedId={selectedId} onSelect={setSelectedId} />}
      panel={
        selected ? (
          <PropertyDetailPanel
            property={selected}
            onClose={() => setSelectedId(null)}
            onChangeStatus={(status) => void update(selected.id, { status })}
            onSaveNotes={(notes) => void update(selected.id, { notes })}
          />
        ) : null
      }
    />
  );
}
