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
    ],
    metrics: ["health.pharmacies", "health.hospitals"],
  },
];

/** Every metric any source claims to provide. */
export const REGISTERED_METRICS = new Set(SOURCES.flatMap((source) => source.metrics));

export function sourceOf(metric: string): SourceDefinition | undefined {
  return SOURCES.find((source) => source.metrics.includes(metric));
}
