import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-marker.css";
import { useEffect, useRef } from "react";
import type { Property } from "../api/types.js";
import { createMarkerElement } from "./map-marker.js";
import { baseStyle } from "./map-style.js";

/** Roughly the Hérault and the Gard, before anything is selected. */
const REGION_CENTRE: [number, number] = [3.6, 43.7];
const REGION_ZOOM = 8;
const SELECTED_ZOOM = 12;

interface PropertyMapProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The only module that imports MapLibre. Required by ADR-002, and by the fact
 * that MapLibre needs WebGL and cannot render in jsdom, so component tests
 * mock this one file.
 */
export function PropertyMap({ properties, selectedId, onSelect }: PropertyMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new globalThis.Map<string, Marker>());
  // Held in a ref so rebuilding markers does not depend on the callback.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const instance = new MapLibreMap({
      container: container.current,
      style: baseStyle(),
      center: REGION_CENTRE,
      zoom: REGION_ZOOM,
      attributionControl: { compact: true },
    });

    // MapLibre reports source and tile failures only through this event.
    instance.on("error", (event) => {
      console.error("map error", event.error?.message ?? event);
    });

    instance.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
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
        existing.setLngLat([property.longitude, property.latitude]);
        (existing.getElement() as HTMLElement).dataset.status = property.status;
        continue;
      }

      const element = createMarkerElement(property.name, property.status);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(property.id);
      });

      markers.current.set(
        property.id,
        new Marker({ element }).setLngLat([property.longitude, property.latitude]).addTo(instance),
      );
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
      const element = marker.getElement() as HTMLElement;

      element.dataset.selected = String(id === selectedId);
      element.dataset.dimmed = String(selectedId !== null && id !== selectedId);
    }

    const selected = properties.find((property) => property.id === selectedId);

    if (selected && map.current) {
      map.current.flyTo({
        center: [selected.longitude, selected.latitude],
        zoom: SELECTED_ZOOM,
        duration: 900,
      });
    }
  }, [selectedId, properties]);

  return <div ref={container} className="h-full w-full" />;
}
