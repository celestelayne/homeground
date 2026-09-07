const IGN_WMTS =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
  "&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

/**
 * Both are public, browser-exposed keys. They are restricted by HTTP origin in
 * their provider account, not kept secret — a client-side tile key cannot be.
 */
const MAPBOX_TOKEN = readKey("VITE_MAPBOX_TOKEN");
const MAPTILER_KEY = readKey("VITE_MAPTILER_KEY");

function readKey(name: string): string | null {
  const value: unknown = import.meta.env[name];
  return typeof value === "string" && value !== "" ? value : null;
}

const MAPBOX_ATTRIBUTION =
  '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '<a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noreferrer">Improve this map</a>';

const MAPTILER_ATTRIBUTION =
  '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export interface BaseMap {
  id: string;
  label: string;
  url: string;
  attribution: string;
  /** Applied to the tile pane. Some basemaps are already calm enough. */
  filter?: string;
  /** Mapbox serves 512px tiles, which Leaflet must be told about. */
  tileSize?: number;
  zoomOffset?: number;
}

function mapbox(id: string, label: string, style: string): BaseMap {
  return {
    id,
    label,
    url: `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
    attribution: MAPBOX_ATTRIBUTION,
    tileSize: 512,
    zoomOffset: -1,
  };
}

function maptiler(id: string, label: string, style: string): BaseMap {
  return {
    id,
    label,
    url: `https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}@2x.png?key=${MAPTILER_KEY}`,
    attribution: MAPTILER_ATTRIBUTION,
  };
}

/**
 * TEMPORARY: several basemaps, so the calm-but-legible tradeoff can be judged
 * by looking rather than argued about. Remove all but the chosen one.
 *
 * Keyed providers are offered only when their key is present, so a missing key
 * shows as a shorter picker rather than a basemap that silently renders blank.
 *
 * Note Esri orders its tile path {z}/{y}/{x}, against the usual convention.
 */
export const BASE_MAPS: BaseMap[] = [
  {
    id: "ign",
    label: "IGN Plan",
    url: `${IGN_WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&FORMAT=image/png`,
    attribution: "IGN",
    filter: "grayscale(0.88) contrast(0.92) brightness(1.06) sepia(0.16) saturate(0.85)",
  },
  {
    id: "ign-plain",
    label: "IGN Plan, unfiltered",
    url: `${IGN_WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&FORMAT=image/png`,
    attribution: "IGN",
  },
  ...(MAPBOX_TOKEN
    ? [
        mapbox("mapbox-streets", "Mapbox Streets", "streets-v12"),
        mapbox("mapbox-light", "Mapbox Light", "light-v11"),
        mapbox("mapbox-outdoors", "Mapbox Outdoors", "outdoors-v12"),
      ]
    : []),
  ...(MAPTILER_KEY
    ? [
        maptiler("maptiler-streets", "MapTiler Streets", "streets-v2"),
        maptiler("maptiler-dataviz", "MapTiler Dataviz Light", "dataviz-light"),
        maptiler("maptiler-outdoor", "MapTiler Outdoor", "outdoor-v2"),
      ]
    : []),
  {
    id: "topo",
    label: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors, SRTM · © OpenTopoMap (CC-BY-SA)",
  },
  {
    id: "esri-gray",
    label: "Esri Light Gray",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
  },
];

export const DEFAULT_BASE_MAP = BASE_MAPS[0] as BaseMap;

/** Aerial photography, for placing a property. */
export const AERIAL_TILES = `${IGN_WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg`;
export const AERIAL_ATTRIBUTION = "IGN";

export const MAX_ZOOM = 19;
