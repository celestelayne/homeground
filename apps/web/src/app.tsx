import "./styles/global.css";
import { useState } from "react";
import { AddPropertyPanel } from "./properties/add-property-panel.js";
import { PropertyDetailPanel } from "./properties/property-detail-panel.js";
import { PropertyMap, REGION_VIEW } from "./properties/property-map.js";
import { PropertySidebar } from "./properties/property-sidebar.js";
import { useProperties } from "./properties/use-properties.js";
import { AppHeader } from "./ui/app-header.js";
import { AppShell } from "./ui/app-shell.js";
import { FirstUseOverlay } from "./ui/first-use-overlay.js";

type Point = { latitude: number; longitude: number };

export function App() {
  const { properties, state, selectedId, selected, setSelectedId, update, reload } =
    useProperties();
  const [showRejected, setShowRejected] = useState(true);
  const [adding, setAdding] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placedPoint, setPlacedPoint] = useState<Point | null>(null);
  const [initialQuery, setInitialQuery] = useState("");
  // Where a lookup landed. Not a selection and not a property — just somewhere
  // the map has been pointed.
  const [focus, setFocus] = useState<Point | null>(null);

  function closeAdd() {
    setAdding(false);
    setPlacing(false);
    setPlacedPoint(null);
    setInitialQuery("");
  }

  function startAdding(query: string) {
    setInitialQuery(query);
    setAdding(true);
    setSelectedId(null);
  }

  // The logo goes home. There is no router, so home is the state the
  // application opens in: the region, nothing selected, nothing half-written.
  // A fresh object every time, so clicking it twice works twice.
  function goHome() {
    closeAdd();
    setSelectedId(null);
    setFocus({ ...REGION_VIEW });
  }

  // Nothing saved yet: the sidebar has nothing to list, and the overlay
  // introduces the product over a legible map.
  const firstUse = state === "ready" && properties.length === 0 && !adding;

  return (
    <AppShell
      header={
        <AppHeader
          showAddProperty={!firstUse}
          addingProperty={adding}
          onAddProperty={() => startAdding("")}
          onGoHome={goHome}
        />
      }
      sidebar={
        firstUse ? undefined : state === "error" ? (
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
        <>
          {firstUse ? (
            <FirstUseOverlay onLookup={startAdding} onPlaceOnMap={() => startAdding("")} />
          ) : null}
          <PropertyMap
            properties={properties}
            selectedId={selectedId}
            onSelect={(id) => {
              closeAdd();
              setSelectedId(id);
            }}
            placing={placing}
            onPlace={setPlacedPoint}
            focus={focus}
          />
        </>
      }
      // Adding takes the panel: you cannot be reading one property and
      // creating another at the same time.
      panel={
        adding ? (
          <AddPropertyPanel
            placedPoint={placedPoint}
            initialQuery={initialQuery}
            onPlacingChange={setPlacing}
            onLocated={setFocus}
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
