import "leaflet/dist/leaflet.css";
import "./amenity-pins.css";
import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { Amenity } from "../areas/amenities.js";
import { BaseMapPicker } from "./base-map-picker.js";
import {
  AERIAL_ATTRIBUTION,
  AERIAL_TILES,
  type BaseMap,
  DEFAULT_BASE_MAP,
  MAX_ZOOM,
} from "./map-tiles.js";

/** Roughly the Hérault and the Gard, before anything is selected. */
const REGION_CENTRE: [number, number] = [43.7, 3.6];
const REGION_ZOOM = 8;

/** The view the map opens on, and the one the logo returns to. */
export const REGION_VIEW = {
  latitude: REGION_CENTRE[0],
  longitude: REGION_CENTRE[1],
  zoom: REGION_ZOOM,
};
/** Closer than a selection: a lookup is usually followed by placing a point. */
const LOOKUP_ZOOM = 14;

interface AreaMapProps {
  /** True while the user is choosing a point for a new property. */
  placing?: boolean;
  onPlace?: (point: { latitude: number; longitude: number }) => void;
  /**
   * Somewhere to look, from a lookup rather than from a saved property. Set a
   * new object to move the map; the same object twice does nothing.
   */
  focus?: { latitude: number; longitude: number; zoom?: number } | null;
  /**
   * The commune under research, drawn as an outline with everything outside it
   * dimmed. The dimming is not decoration: an area brief describes the commune
   * and nothing beyond it, so what is dimmed is what the brief does not cover.
   */
  boundary?: AreaBoundary | null;
  /**
   * Hospitals and pharmacies inside the commune, already numbered.
   *
   * Every one here carries a number matching its row in the list, and both are
   * renumbered together when a category is toggled. Facilities the source
   * located only to their commune never reach this list: their coordinate is
   * the commune's centre, so a numbered pin would point at a field.
   */
  amenities?: Amenity[];
  selectedAmenityId?: string | null;
  onSelectAmenity?: (id: string | null) => void;
}

export type AreaBoundary =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/** Big enough to cover the map at any zoom, so the scrim has no visible edge. */
const WORLD_RING: L.LatLngTuple[] = [
  [-89.9, -179.9],
  [89.9, -179.9],
  [89.9, 179.9],
  [-89.9, 179.9],
];

/**
 * The outer ring of each part, as Leaflet [lat, lng]. GeoJSON gives [lng, lat],
 * and reversing them puts an Aude commune in the Indian Ocean.
 *
 * A commune's own holes are ignored: they are rare, and a hole in the scrim's
 * hole would dim an enclave that the brief does in fact describe.
 */
function outerRings(boundary: AreaBoundary): L.LatLngTuple[][] {
  const parts = boundary.type === "Polygon" ? [boundary.coordinates] : boundary.coordinates;

  return parts
    .map((part) => part[0] ?? [])
    .filter((ring) => ring.length > 0)
    .map((ring) => ring.map(([lng, lat]) => [lat as number, lng as number] as L.LatLngTuple));
}

/**
 * The only module that imports Leaflet, so component tests mock this one file
 * and the mapping library stays swappable. See ADR-011.
 */
export function AreaMap({
  placing = false,
  onPlace,
  focus = null,
  boundary = null,
  amenities = [],
  selectedAmenityId = null,
  onSelectAmenity,
}: AreaMapProps) {
  const container = useRef<HTMLDivElement>(null);
  // TEMPORARY: for comparing basemaps.
  const [basemap, setBasemap] = useState<BaseMap>(DEFAULT_BASE_MAP);
  const base = useRef<L.TileLayer | null>(null);
  const map = useRef<L.Map | null>(null);
  const aerial = useRef<L.TileLayer | null>(null);
  // Held in a ref so the placing effect does not depend on callback identity.
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const instance = L.map(container.current, {
      center: REGION_CENTRE,
      zoom: REGION_ZOOM,
      // Bottom right: the top left is where the commune's own controls sit.
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(instance);

    base.current = baseLayer(DEFAULT_BASE_MAP).addTo(instance);

    aerial.current = L.tileLayer(AERIAL_TILES, {
      maxZoom: MAX_ZOOM,
      attribution: AERIAL_ATTRIBUTION,
    });

    map.current = instance;

    // Leaflet measures its container once. Hiding the sidebar changes the map's
    // width and it has no way to notice, so it renders into the old size.
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);

    return () => {
      resize.disconnect();
      instance.remove();
      base.current = null;
      map.current = null;
      aerial.current = null;
    };
  }, []);

  // TEMPORARY: swapping basemaps for comparison.
  useEffect(() => {
    const instance = map.current;

    if (!instance) {
      return;
    }

    base.current?.remove();
    base.current = baseLayer(basemap).addTo(instance);
    base.current.bringToBack();
  }, [basemap]);

  // The calm filter is a property of the basemap, but it lifts while aerial
  // imagery is shown: that is there to be read, not to be calm. Set inline, so
  // it cannot be expressed as a stylesheet rule the inline value would beat.
  useEffect(() => {
    const pane = map.current?.getPane("tilePane");

    if (pane) {
      pane.style.filter = placing ? "" : (basemap.filter ?? "");
    }
  }, [basemap, placing]);

  // The commune under research: a scrim over everywhere it is not, and a line
  // on the edge itself. The commune keeps its terrain unfiltered, because that
  // is the thing the user came to read.
  useEffect(() => {
    const instance = map.current;

    if (!instance) {
      return;
    }

    if (!boundary) {
      return;
    }

    const rings = outerRings(boundary);

    if (rings.length === 0) {
      return;
    }

    // One polygon whose first ring is the world and whose remaining rings are
    // the commune, so the commune is punched out of the scrim.
    const scrim = L.polygon([WORLD_RING, ...rings], {
      stroke: false,
      fillColor: "#1b1a17",
      fillOpacity: 0.28,
      interactive: false,
    }).addTo(instance);

    const edge = L.polygon(rings, {
      color: "#1b1a17",
      weight: 1.5,
      opacity: 0.9,
      fill: false,
      interactive: false,
    }).addTo(instance);

    instance.fitBounds(edge.getBounds(), { padding: [32, 32] });

    return () => {
      scrim.remove();
      edge.remove();
    };
  }, [boundary]);

  // A lookup moves the map without selecting or creating anything. The only
  // writer of the camera, now that a boundary or a lookup is all that moves it.
  useEffect(() => {
    if (focus && map.current) {
      map.current.flyTo([focus.latitude, focus.longitude], focus.zoom ?? LOOKUP_ZOOM, {
        duration: 0.9,
      });
    }
  }, [focus]);

  // Held in a ref so re-rendering pins does not depend on callback identity.
  const onSelectAmenityRef = useRef(onSelectAmenity);
  onSelectAmenityRef.current = onSelectAmenity;

  // Numbered pins. The integer is the list row's, so they are rebuilt whenever
  // the visible set changes rather than kept and patched.
  useEffect(() => {
    const instance = map.current;

    if (!instance || amenities.length === 0) {
      return;
    }

    const drawn = amenities.map((amenity) =>
      L.marker([amenity.latitude, amenity.longitude], {
        icon: amenityIcon(amenity, amenity.id === selectedAmenityId),
        keyboard: false,
        zIndexOffset: amenity.id === selectedAmenityId ? 1000 : 0,
      })
        .addTo(instance)
        .on("click", () =>
          onSelectAmenityRef.current?.(amenity.id === selectedAmenityId ? null : amenity.id),
        )
        .bindTooltip(`${amenity.number}. ${amenity.name}`, {
          direction: "top",
          offset: [0, -10],
        }),
    );

    return () => {
      for (const marker of drawn) {
        marker.remove();
      }
    };
  }, [amenities, selectedAmenityId]);

  // Placing shows aerial imagery and turns the next click into a coordinate.
  useEffect(() => {
    const instance = map.current;

    if (!instance || !aerial.current) {
      return;
    }

    instance.getContainer().classList.toggle("hg-placing", placing);

    if (!placing) {
      aerial.current.remove();
      return;
    }

    aerial.current.addTo(instance);

    const onClick = (event: L.LeafletMouseEvent) => {
      onPlaceRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    };

    instance.on("click", onClick);

    return () => {
      instance.off("click", onClick);
    };
  }, [placing]);

  return (
    <>
      <div ref={container} className="h-full w-full" />
      <BaseMapPicker value={basemap} onChange={setBasemap} />
    </>
  );
}

function baseLayer(basemap: BaseMap): L.TileLayer {
  return L.tileLayer(basemap.url, {
    maxZoom: MAX_ZOOM,
    attribution: basemap.attribution,
    // Providers that serve 512px tiles need both, or every label renders twice
    // the size it should at half the detail.
    ...(basemap.tileSize ? { tileSize: basemap.tileSize } : {}),
    ...(basemap.zoomOffset ? { zoomOffset: basemap.zoomOffset } : {}),
  });
}

function amenityIcon(amenity: Amenity, selected: boolean): L.DivIcon {
  const size = selected ? 30 : 25;

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<button type="button" class="hg-amenity" data-kind="${amenity.kind}"` +
      ` data-selected="${selected}" aria-label="${escapeHtml(`${amenity.number}. ${amenity.name}`)}">` +
      `<span class="hg-amenity-shape" aria-hidden="true">${amenity.number}</span></button>`,
  });
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}
