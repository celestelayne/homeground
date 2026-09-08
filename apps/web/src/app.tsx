import "./styles/global.css";
import { useEffect, useState } from "react";
import { type AmenityKind, visibleAmenities } from "./areas/amenities.js";
import { AreaSidebar } from "./areas/area-sidebar.js";
import { useAreaLookup } from "./areas/use-area-lookup.js";
import { AreaMap, REGION_VIEW } from "./map/area-map.js";
import { SourcesPanel } from "./sources/sources-panel.js";
import { AppHeader } from "./ui/app-header.js";
import { AppShell } from "./ui/app-shell.js";
import { FirstUseOverlay } from "./ui/first-use-overlay.js";

type Point = { latitude: number; longitude: number };

/**
 * The commune is the subject.
 *
 * Saved properties are not wired into this screen. `PropertySidebar`,
 * `PropertyDetailPanel`, `AddPropertyPanel` and `useProperties` are left in the
 * repository, dormant and unimported: properties return at M11 with listing
 * partnerships, and working components are a better starting point than ones
 * recovered from history.
 */
export function App() {
  // Where a lookup landed, when there is no boundary to fit to instead.
  const [focus, setFocus] = useState<Point | null>(null);
  // True on arrival: the root route is the landing hero. Looking a commune up
  // is the thing a user comes to do, so it is what they are shown first.
  const [showLanding, setShowLanding] = useState(true);
  const [showSources, setShowSources] = useState(false);
  // The outline says what the brief covers, but it also sits over the terrain.
  const [showBoundary, setShowBoundary] = useState(true);
  // Categories the reader has switched off. Empty means everything shows.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(null);
  const { lookup, suggest, choose, clear } = useAreaLookup();

  // The logo goes home. There is no router, so home is the state the
  // application opens in: the region, nothing looked up, and the search bar in
  // front of you. A fresh focus object every time, so clicking twice works twice.
  function goHome() {
    setShowLanding(true);
    setSelectedAmenityId(null);
    clear();
    setFocus({ ...REGION_VIEW });
  }

  // Choosing a commune is the commitment; typing was only a question.
  async function openCommune(choice: Parameters<typeof choose>[0]) {
    // A new commune brings its outline back; hiding one was about that one.
    setShowBoundary(true);
    setSelectedAmenityId(null);
    setShowLanding(false);
    await choose(choice);
  }

  // A commune that loads moves the map to it. When it has a boundary the map
  // fits to that instead, so only the boundary-less case needs a centre.
  // `lookup` only changes when the hook sets it, so this cannot loop.
  useEffect(() => {
    if (lookup.kind === "loaded" && !lookup.area.boundary) {
      setFocus({ ...lookup.area.centre });
    }
  }, [lookup]);

  // Numbered here, so a row and its pin always carry the same integer.
  const {
    shown: amenities,
    totals,
    placeable,
  } = lookup.kind === "loaded"
    ? visibleAmenities(lookup.area.facilities, lookup.area.centre, hidden)
    : { shown: [], totals: {}, placeable: 0 };

  function toggleCategory(kind: AmenityKind) {
    setHidden((current) => {
      const next = new Set(current);

      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }

      return next;
    });
    // Numbers move when a category is toggled, so a selection made under the
    // old numbering would point at a different row.
    setSelectedAmenityId(null);
  }

  // The hero stays while a query is being typed and answered, and steps aside
  // only when a commune actually loads. Standing down at the first keystroke
  // left the reading half blank for as long as the network took.
  const landing = showLanding && lookup.kind !== "loaded";

  return (
    <AppShell
      header={
        <AppHeader
          onGoHome={goHome}
          onShowSources={() => setShowSources(true)}
          onSuggest={(query) => void suggest(query)}
          onChoose={(choice) => void openCommune(choice)}
          lookup={lookup}
        />
      }
      // The overview takes half the frame once a commune is looked up. The
      // landing hero has no panel: nothing has been looked up, so there is
      // nothing for it to say.
      panel={
        lookup.kind !== "loaded" ? undefined : (
          <AreaSidebar
            lookup={lookup}
            onToggleBoundary={() => setShowBoundary((shown) => !shown)}
            boundaryShown={showBoundary}
            amenities={amenities}
            totals={totals}
            placeable={placeable}
            hidden={hidden}
            onToggleCategory={toggleCategory}
            selectedAmenityId={selectedAmenityId}
            onSelectAmenity={setSelectedAmenityId}
          />
        )
      }
      map={
        <>
          {showSources ? <SourcesPanel onClose={() => setShowSources(false)} /> : null}
          {landing ? (
            <FirstUseOverlay
              onSuggest={(query) => void suggest(query)}
              onChoose={(choice) => void openCommune(choice)}
              lookup={lookup}
              onDismiss={() => setShowLanding(false)}
            />
          ) : null}
          <AreaMap
            focus={focus}
            boundary={showBoundary && lookup.kind === "loaded" ? lookup.area.boundary : null}
            amenities={amenities}
            selectedAmenityId={selectedAmenityId}
            onSelectAmenity={setSelectedAmenityId}
          />
        </>
      }
    />
  );
}
