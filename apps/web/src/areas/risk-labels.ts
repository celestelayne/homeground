/**
 * The state's hazard vocabulary, in English, with the original kept.
 *
 * HomeGround shows these in English because it is written for people who do
 * not read French — that is the whole point of the product. The rule it must
 * not break is a different one: a designation may be **translated** but never
 * **softened**. "Tassements différentiels" becomes "Differential settlement",
 * not "minor ground movement". The French the state wrote is kept beside every
 * translation so a reader can check it, and so nobody has to trust ours.
 *
 * Keyed on the authority's own codes rather than its labels, because a label
 * can be reworded upstream and a code is what identifies the hazard. A code
 * with no translation falls back to the French, which is the honest failure.
 */
export const HAZARDS: Record<string, string> = {
  "11": "Flooding",
  "112": "Slow-rising river flooding",
  "113": "Flash flooding from a watercourse",
  "114": "Surface runoff and mudflow",
  "115": "Debris flow",
  "116": "Rising groundwater",
  "117": "Coastal flooding",
  "12": "Ground movement",
  "121": "Subsidence and collapse over former quarries",
  "122": "Subsidence and collapse over natural cavities",
  "123": "Rockfall",
  "124": "Landslide",
  "125": "Advancing dunes",
  "126": "Coastline and cliff erosion",
  "127": "Differential settlement",
  "13": "Earthquake",
  "14": "Avalanche",
  "15": "Volcanic eruption",
  "16": "Forest fire",
  "17": "Severe weather",
  "171": "Cyclone or hurricane winds",
  "172": "Storms and squalls",
  "174": "Lightning",
  "175": "Hail",
  "176": "Snow and freezing rain",
  "18": "Radon",
  "21": "Industrial hazard",
  "211": "Thermal effects",
  "212": "Blast overpressure",
  "213": "Toxic release",
  "214": "Projection of debris",
  "22": "Nuclear",
  "23": "Dam failure",
  "24": "Transport of dangerous goods",
  "25": "Unexploded ordnance",
  "31": "Mining subsidence",
  "311": "Widespread collapse",
  "312": "Localised collapse",
  "313": "Progressive subsidence",
  "314": "Settlement",
  "315": "Slope movement",
  "316": "Flows",
  "317": "Rock collapse",
  "32": "Flooding of mining ground",
  "321": "Groundwater and surface water pollution",
  "322": "Sediment and soil pollution",
  "33": "Mine gas reaching the surface",
  "34": "Heating of spoil ground",
  AUTRE: "Other hazard",
};

/** The kinds a disaster order can declare. Same rule, same fallback. */
export const DECLARED: Record<string, string> = {
  ICB: "Flooding and mudflow",
  SEC: "Drought",
  MVT: "Ground movement",
  TMP: "Storm",
  CMV: "Wave impact",
  GLT: "Landslide",
  PDN: "Snow load",
  IRN: "Flooding from rising groundwater",
  GRL: "Hail",
  SEI: "Earthquake tremor",
  AVA: "Avalanche",
  EFA: "Collapse or subsidence",
  VCY: "Cyclonic winds",
  DIV: "Other",
  ECB: "Rockfall",
  LVT: "Debris flow",
  RAZ: "Tidal wave",
  COB: "Mudflow",
  GET: "Landslide and ground collapse",
  GER: "Landslide and rockfall",
};

/**
 * The family a hazard belongs to, which is the authority's own hierarchy
 * rather than a grouping HomeGround invented: 113 and 114 are kinds of 11.
 */
export function familyOf(riskCode: string): string {
  return /^\d{3}$/.test(riskCode) ? riskCode.slice(0, 2) : riskCode;
}

export function inEnglish(map: Record<string, string>, code: string, original: string): string {
  return map[code] ?? original;
}
