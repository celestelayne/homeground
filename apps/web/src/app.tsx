import "./styles/global.css";
import { useState } from "react";
import { AddPropertyPanel } from "./properties/add-property-panel.js";
import { PropertyDetailPanel } from "./properties/property-detail-panel.js";
import { PropertyMap } from "./properties/property-map.js";
import { PropertySidebar } from "./properties/property-sidebar.js";
import { useProperties } from "./properties/use-properties.js";
import { AppHeader } from "./ui/app-header.js";
import { AppShell } from "./ui/app-shell.js";

type Point = { latitude: number; longitude: number };

export function App() {
  const { properties, state, selectedId, selected, setSelectedId, update, reload } =
    useProperties();
  const [showRejected, setShowRejected] = useState(true);
  const [adding, setAdding] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placedPoint, setPlacedPoint] = useState<Point | null>(null);

  function closeAdd() {
    setAdding(false);
    setPlacing(false);
    setPlacedPoint(null);
  }

  return (
    <AppShell
      header={
        <AppHeader
          addingProperty={adding}
          onAddProperty={() => {
            setAdding(true);
            setSelectedId(null);
          }}
        />
      }
      sidebar={
        state === "error" ? (
          <p className="px-4 py-4 text-body text-ink-3">Could not load your properties.</p>
        ) : (
          <PropertySidebar
            properties={properties}
            selectedId={selectedId}
            onSelect={(id) => {
              closeAdd();
              setSelectedId(id);
            }}
            showRejected={showRejected}
            onToggleRejected={() => setShowRejected((shown) => !shown)}
          />
        )
      }
      map={
        <PropertyMap
          properties={properties}
          selectedId={selectedId}
          onSelect={(id) => {
            closeAdd();
            setSelectedId(id);
          }}
          placing={placing}
          onPlace={setPlacedPoint}
        />
      }
      // Adding takes the panel: you cannot be reading one property and
      // creating another at the same time.
      panel={
        adding ? (
          <AddPropertyPanel
            placedPoint={placedPoint}
            onPlacingChange={setPlacing}
            onClose={closeAdd}
            onSaved={async (id) => {
              closeAdd();
              await reload();
              setSelectedId(id);
            }}
          />
        ) : selected ? (
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
