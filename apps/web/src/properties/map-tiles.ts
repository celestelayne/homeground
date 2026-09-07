/**
 * IGN's tiles, served without an API key. See ADR-011.
 *
 * WMTS, addressed as an XYZ template: TILECOL is x and TILEROW is y.
 */
const IGN_WMTS =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
  "&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

export const BASE_TILES = `${IGN_WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&FORMAT=image/png`;

/** Shown while placing a property: you cannot pick a roof off a road map. */
export const AERIAL_TILES = `${IGN_WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg`;

export const TILE_ATTRIBUTION = "IGN";
export const MAX_ZOOM = 19;
