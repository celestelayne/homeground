import { Map as MapLibreMap, type MapMouseEvent, Marker, NavigationControl } from "maplibre-gl";
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
  /** True while the user is choosing a point for a new property. */
  placing?: boolean;
  onPlace?: (point: { latitude: number; longitude: number }) => void;
}

/**
 * The only module that imports MapLibre. Required by ADR-002, and by the fact
 * that MapLibre needs WebGL and cannot render in jsdom, so component tests
 * mock this one file.
 */
export function PropertyMap({
  properties,
  selectedId,
  onSelect,
  placing = false,
  onPlace,
}: PropertyMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new globalThis.Map<string, Marker>());
  // Held in a ref so rebuilding markers does not depend on the callback.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

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

    // MapLibre reports source and tile failures only through this event, but
    // it also emits transient source errors while a style is still loading and
    // then recovers from them. Reporting those trains people to ignore the
    // listener, which is the only channel a real failure arrives on.
    instance.on("error", (event) => {
      if (instance.isStyleLoaded()) {
        console.error("map error", event.error?.message ?? event);
      }
    });

    // The failure actually worth knowing about is a style that never finishes
    // loading: the map draws a canvas and its markers, requests no tiles, and
    // otherwise says nothing at all.
    const styleWatchdog = setTimeout(() => {
      if (!instance.isStyleLoaded()) {
        console.error("map style never finished loading; no tiles will be requested");
      }
    }, 15_000);

    instance.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.current = instance;

    return () => {
      clearTimeout(styleWatchdog);
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

  // Placing a property shows aerial imagery and turns the next click into a
  // coordinate. A road map cannot tell you which building is the one.
  useEffect(() => {
    const instance = map.current;

    if (!instance) {
      return;
    }

    const apply = () => {
      instance.setLayoutProperty("aerial-layer", "visibility", placing ? "visible" : "none");
    };

    if (instance.isStyleLoaded()) {
      apply();
    } else {
      instance.once("style.load", apply);
    }

    instance.getCanvas().style.cursor = placing ? "crosshair" : "";

    if (!placing) {
      return;
    }

    const onClick = (event: MapMouseEvent) => {
      onPlaceRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    };

    instance.on("click", onClick);

    return () => {
      instance.off("click", onClick);
    };
  }, [placing]);

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
