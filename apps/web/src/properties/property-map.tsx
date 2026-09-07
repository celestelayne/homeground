import "leaflet/dist/leaflet.css";
import "./map-marker.css";
import * as L from "leaflet";
import { useEffect, useRef } from "react";
import type { Property } from "../api/types.js";
import { AERIAL_TILES, BASE_TILES, MAX_ZOOM, TILE_ATTRIBUTION } from "./map-tiles.js";

/** Roughly the Hérault and the Gard, before anything is selected. */
const REGION_CENTRE: [number, number] = [43.7, 3.6];
const REGION_ZOOM = 8;
const SELECTED_ZOOM = 12;

interface PropertyMapProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** True while the user is choosing a point for a new property. */
  placing?: boolean;
  onPlace?: (point: { latitude: number; longitude: number }) => void;
}

/**
 * The only module that imports Leaflet, so component tests mock this one file
 * and the mapping library stays swappable. See ADR-011.
 */
export function PropertyMap({
  properties,
  selectedId,
  onSelect,
  placing = false,
  onPlace,
}: PropertyMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const aerial = useRef<L.TileLayer | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  // Held in refs so rebuilding markers does not depend on callback identity.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const instance = L.map(container.current, {
      center: REGION_CENTRE,
      zoom: REGION_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(BASE_TILES, { maxZoom: MAX_ZOOM, attribution: TILE_ATTRIBUTION }).addTo(instance);

    aerial.current = L.tileLayer(AERIAL_TILES, {
      maxZoom: MAX_ZOOM,
      attribution: TILE_ATTRIBUTION,
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
      aerial.current = null;
      markers.current.clear();
    };
  }, []);

  // Markers follow the collection.
  useEffect(() => {
    const instance = map.current;

    if (!instance) {
      return;
    }

    const seen = new Set<string>();

    for (const property of properties) {
      seen.add(property.id);

      const existing = markers.current.get(property.id);

      if (existing) {
        existing.setLatLng([property.latitude, property.longitude]);
        setMarkerStatus(existing, property.status);
        continue;
      }

      const marker = L.marker([property.latitude, property.longitude], {
        icon: markerIcon(property),
        // Status is carried by shape, and the button inside carries the name.
        keyboard: false,
      })
        .addTo(instance)
        .on("click", () => onSelectRef.current(property.id));

      markers.current.set(property.id, marker);
    }

    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [properties]);

  // Selection drives emphasis and the camera. One value, two writers.
  useEffect(() => {
    for (const [id, marker] of markers.current) {
      const element = marker.getElement();

      if (element) {
        element.dataset.selected = String(id === selectedId);
        element.dataset.dimmed = String(selectedId !== null && id !== selectedId);
      }
    }

    const selected = properties.find((property) => property.id === selectedId);

    if (selected && map.current) {
      map.current.flyTo([selected.latitude, selected.longitude], SELECTED_ZOOM, {
        duration: 0.9,
      });
    }
  }, [selectedId, properties]);

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

  return <div ref={container} className="h-full w-full" />;
}

function markerIcon(property: Property): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [17, 17],
    iconAnchor: [8.5, 8.5],
    html: `<button type="button" class="hg-marker" data-status="${property.status}" aria-label="${escapeHtml(property.name)}"><span class="hg-marker-shape" aria-hidden="true"></span></button>`,
  });
}

function setMarkerStatus(marker: L.Marker, status: Property["status"]): void {
  const button = marker.getElement()?.querySelector<HTMLElement>(".hg-marker");

  if (button) {
    button.dataset.status = status;
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}
