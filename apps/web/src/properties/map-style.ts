import type { StyleSpecification } from "maplibre-gl";

/**
 * IGN's base map, served without an API key. See ADR-011.
 *
 * The design asks for a calm, near-monochrome basemap so that colour is left
 * for evidence. IGN's own styling is full French cartography, so it is toned
 * down with raster paint properties rather than a CSS filter over the canvas,
 * which would also wash out the markers drawn on top.
 */
const IGN_WMTS =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
  "&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

/**
 * Built fresh on every call. MapLibre takes ownership of the style object it is
 * given, and React mounts effects twice in development, so a shared constant
 * would be handed to two instances at once.
 */
export function baseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      plan: {
        type: "raster",
        tiles: [`${IGN_WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&FORMAT=image/png`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "IGN",
      },
      // Aerial photography, shown while placing a property: you cannot pick a
      // roof off a road map.
      aerial: {
        type: "raster",
        tiles: [`${IGN_WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "IGN",
      },
    },
    layers: [
      {
        // Layer ids stay distinct from source ids: MapLibre resolves both in
        // one namespace and a collision breaks the layer's tile manager.
        id: "plan-layer",
        type: "raster",
        source: "plan",
        paint: {
          "raster-saturation": -0.85,
          "raster-contrast": -0.08,
          "raster-brightness-min": 0.06,
        },
      },
      {
        id: "aerial-layer",
        type: "raster",
        source: "aerial",
        layout: { visibility: "none" },
      },
    ],
  };
}
