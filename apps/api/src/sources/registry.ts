/**
 * Every source HomeGround uses, and what each one provides.
 *
 * This is the origin of the Sources and methodology panel. The panel is
 * rendered from these rows, never written as page copy, so it cannot describe
 * a source that is not wired up — and a source added here without evidence
 * behind it fails a test.
 *
 * A source cannot be listed without a limitation. Every source misleads
 * somebody, and the limitation that earns its place is the one bearing on the
 * question being asked of it. See specs/evidence.md.
 */
export interface SourceDefinition {
  id: string;
  name: string;
  publisher: string;
  description: string;
  url: string;
  cadence: string;
  coverage: string;
  licence: string;
  limitations: string[];
  /** The metrics this source is the origin of. Asserted against evidence. */
  metrics: string[];
  /**
   * What it supplies that is not a measurement — a photograph, a boundary.
   *
   * Named in plain words because there is no metric to label. A source must
   * supply at least one of `metrics` or `provides`: one that supplies neither
   * is a source with nothing behind it.
   */
  provides: string[];
}

export const SOURCES: SourceDefinition[] = [
  {
    id: "geo-api-gouv",
    name: "Découpage administratif",
    publisher: "Etalab, from INSEE and IGN",
    description:
      "The reference list of French communes: names, postcodes, administrative " +
      "hierarchy, legal population, surface and boundaries.",
    url: "https://geo.api.gouv.fr",
    cadence: "Following each administrative and census revision",
    coverage: "France, including overseas départements",
    licence: "Licence Ouverte 2.0",
    limitations: [
      "The legal population has a reference year three years behind publication.",
      "Surface is the administrative area of the commune, including land nobody lives on.",
    ],
    metrics: ["population", "area.sqKm", "population.density"],
    provides: [],
  },
  {
    id: "insee-census",
    name: "Recensement de la population",
    publisher: "INSEE",
    description:
      "Housing occupancy by commune: how many dwellings are lived in, how many " +
      "are second homes, and how many stand empty.",
    url: "https://api.insee.fr/melodi",
    cadence: "Annual, each edition built from five years of rolling collection",
    coverage: "France",
    licence: "Licence Ouverte 2.0",
    limitations: [
      "Figures are weighted estimates from a rolling survey, not counts, and are published with decimals.",
      "Communes under 10,000 residents are surveyed once every five years, so a single year reflects several.",
    ],
    metrics: [
      "dwellings.main",
      "dwellings.secondHome",
      "dwellings.vacant",
      "dwellings.secondHomeShare",
    ],
    provides: [],
  },
  {
    id: "finess",
    name: "FINESS",
    publisher: "Ministère de la Santé, via Etalab",
    description:
      "The national directory of health establishments: where the hospitals " +
      "and pharmacies are, with coordinates.",
    url: "https://www.data.gouv.fr/datasets/finess-extraction-du-fichier-des-etablissements",
    cadence: "Continuous, republished as establishments open and close",
    coverage: "Metropolitan France. The geolocated extract carries no overseas establishments",
    licence: "Licence Ouverte 2.0",
    limitations: [
      "It registers establishments, so a practitioner working alone may not appear as one.",
      "Around one facility in twenty-five is placed at its commune rather than at its address, and is shown as an area rather than a point.",
      "Outside metropolitan France it holds nothing, so a count there is unknown rather than zero.",
      "Hospitals means general hospitals somebody would be taken to. Hospitals registered wholly as psychiatric, and home-care services, are not counted.",
      "The register lists sites, not institutions, so one hospital group appears once per site — including its day units and outposts, which carry the group's own category.",
    ],
    metrics: ["health.pharmacies", "health.hospitals"],
    provides: [],
  },
  {
    id: "insee-density-grid",
    name: "Grille communale de densité",
    publisher: "INSEE",
    description:
      "The seven-level classification of communes by how their population is " +
      "settled, from grands centres urbains to rural à habitat très dispersé. " +
      "It is what HomeGround means by a comparable commune.",
    url: "https://www.insee.fr/fr/information/6439600",
    cadence: "Annual",
    coverage: "France, including overseas départements. 34,935 communes in the 2024 edition",
    licence: "Licence Ouverte 2.0",
    limitations: [
      "It classifies how a commune is settled, not what living there is like. Two communes in one class are alike in that respect and in no other.",
      "The edition held describes France as it was on 1 January 2024, so communes created or merged since have no class and no comparison.",
      "A commune can move class between editions, which changes what it is compared against.",
      "The 2024 edition still lists 69 communes that have since been abolished, so a class holds a few communes that no longer exist.",
    ],
    metrics: [],
    provides: ["The class of comparable communes a figure is compared against"],
  },
  {
    id: "wikimedia-commons",
    name: "Wikimedia Commons",
    publisher: "Wikimedia Foundation, linked through Wikidata",
    description:
      "Photographs of communes, contributed by the public. Wikidata links each " +
      "commune to a picture through its INSEE code.",
    url: "https://commons.wikimedia.org",
    cadence: "Continuous, as contributors upload",
    coverage:
      "Worldwide, wherever somebody has taken a photograph. Roughly six communes in seven " +
      "in the Aude have one",
    licence: "Per file, most often CC BY-SA. Named beneath each photograph",
    limitations: [
      "The photograph is whatever one contributor chose to point a camera at, on a day of their choosing. It is a picture of the commune, not a picture of what the commune is like.",
      "Nobody selects these for representativeness, so a commune may be shown by its most photogenic corner or by a single building.",
      "A commune with no photograph is one nobody has uploaded, which says nothing whatever about the place.",
      "The image carries no date HomeGround can rely on, so an old photograph and a recent one look the same here.",
    ],
    metrics: [],
    provides: ["A photograph of the commune"],
  },
];

/** Every metric any source claims to provide. */
export const REGISTERED_METRICS = new Set(SOURCES.flatMap((source) => source.metrics));

export function sourceOf(metric: string): SourceDefinition | undefined {
  return SOURCES.find((source) => source.metrics.includes(metric));
}
