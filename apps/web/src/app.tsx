import "./styles/global.css";
import { useEffect, useState } from "react";
import { AreaSidebar } from "./areas/area-sidebar.js";
import { SourcesPanel } from "./sources/sources-panel.js";
import { useAreaLookup } from "./areas/use-area-lookup.js";
import { AddPropertyPanel } from "./properties/add-property-panel.js";
import { PropertyDetailPanel } from "./properties/property-detail-panel.js";
import { AreaMap, REGION_VIEW } from "./map/area-map.js";
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
  // True on arrival: the root route is the landing hero. Looking a commune up
  // is the thing a user comes to do, so it is what they are shown first,
  // whether or not anything has been saved.
  const [showLanding, setShowLanding] = useState(true);
  const [showSources, setShowSources] = useState(false);
  // The outline says what the brief covers, but it also sits over the terrain.
  const [showBoundary, setShowBoundary] = useState(true);
  const { lookup, search, choose, clear } = useAreaLookup();

  function closeAdd() {
    setAdding(false);
    setPlacing(false);
    setPlacedPoint(null);
    setInitialQuery("");
  }

  function startAdding(query: string) {
    setInitialQuery(query);
    setAdding(true);
    setShowLanding(false);
    setSelectedId(null);
  }

  function select(id: string) {
    closeAdd();
    setShowLanding(false);
    setSelectedId(id);
  }

  // The logo goes home. There is no router, so home is the state the
  // application opens in: the region, nothing selected, nothing half-written,
  // and the search bar in front of you.
  // A fresh focus object every time, so clicking it twice works twice.
  function goHome() {
    closeAdd();
    setSelectedId(null);
    setShowLanding(true);
    clear();
    setFocus({ ...REGION_VIEW });
  }

  // Looking a commune up takes over the sidebar and moves the map. It creates
  // nothing: researching a place is not the same as tracking a house.
  async function lookUpArea(query: string) {
    closeAdd();
    setSelectedId(null);
    setShowLanding(false);
    // A new commune brings its outline back; hiding one was about that one.
    setShowBoundary(true);
    await search(query);
  }

  // A commune that loads moves the map to it. When it has a boundary the map
  // fits to that instead, so only the boundary-less case needs a centre.
  // `lookup` only changes when the hook sets it, so this cannot loop.
  useEffect(() => {
    if (lookup.kind === "loaded" && !lookup.area.boundary) {
      setFocus({ ...lookup.area.centre });
    }
  }, [lookup]);

  // Nothing saved yet: the sidebar has nothing to list, and the overlay
  // introduces the product over a legible map.
  const firstUse = state === "ready" && properties.length === 0 && !adding;

  // The landing hero is what you see before you have looked anything up. It
  // cannot be reachable only while the database happens to be empty — saving a
  // property must not take away the search bar — and it steps aside the moment
  // a lookup gives the sidebar something to say.
  const landing = (firstUse || showLanding) && !adding && lookup.kind === "idle";

  return (
    <AppShell
      header={
        <AppHeader
          onGoHome={goHome}
          onSearch={(query) => void lookUpArea(query)}
          onShowSources={() => setShowSources(true)}
        />
      }
      // The landing hero has no sidebar: nothing has been looked up, so there
      // is nothing for it to say. A lookup then takes it over — the commune is
      // the subject, and the property list steps aside while it is.
      sidebar={
        landing ? undefined : lookup.kind !== "idle" ? (
          <AreaSidebar
            lookup={lookup}
            onChoose={(choice) => void choose(choice)}
            onToggleBoundary={() => setShowBoundary((shown) => !shown)}
            boundaryShown={showBoundary}
          />
        ) : state === "error" ? (
          <p className="px-4 py-4 text-body text-ink-3">Could not load your properties.</p>
        ) : (
          <PropertySidebar
            properties={properties}
            selectedId={selectedId}
            onSelect={select}
            showRejected={showRejected}
            onToggleRejected={() => setShowRejected((shown) => !shown)}
          />
        )
      }
      map={
        <>
          {showSources ? <SourcesPanel onClose={() => setShowSources(false)} /> : null}
          {landing ? (
            <FirstUseOverlay
              onLookup={(query) => void lookUpArea(query)}
              onPlaceOnMap={() => startAdding("")}
              onDismiss={firstUse ? undefined : () => setShowLanding(false)}
            />
          ) : null}
          <AreaMap
            placing={placing}
            onPlace={setPlacedPoint}
            focus={focus}
            boundary={showBoundary && lookup.kind === "loaded" ? lookup.area.boundary : null}
            facilities={lookup.kind === "loaded" ? lookup.area.facilities : []}
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
