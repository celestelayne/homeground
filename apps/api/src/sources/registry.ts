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
    id: "georisques",
    name: "Géorisques — GASPAR, and the radon potential",
    publisher: "Ministère de la Transition écologique; radon from the Autorité de sûreté nucléaire",
    description:
      "What every commune in France is officially recorded as exposed to, the " +
      "natural disasters the state has declared there with the dates of the " +
      "orders, and the radon potential of the ground beneath it.",
    url: "https://www.georisques.gouv.fr/donnees/bases-de-donnees/base-gaspar",
    cadence: "Continuously, as prefectoral orders are signed and procedures are revised",
    coverage:
      "France entière. 31,733 communes carry a designation and 34,699 have been declared for at " +
      "least one disaster; 24 communes in the reference list are absent from the archive entirely",
    licence: "Licence Ouverte",
    limitations: [
      "A designation says a commune is recorded as exposed, not that any particular house is. Where within a commune the exposure lies is not in this data.",
      "Designations are common: most communes carry several, so the number alone says little without the count of communes carrying the same one.",
      "A declared disaster is a record that something happened and was recognised, not a rate and not a forecast. Six droughts in eight years describes the past.",
      "No fire is ever declared: the natural disaster regime excludes forest fire, which ordinary insurance covers, so an archive of 247,140 declarations contains not one. Absence of fire here says nothing about whether a commune burns.",
      "One order can declare several kinds at once, so a commune has more declarations than orders — both counts are true and they are different.",
      "A commune the archive does not carry is unknown, never a commune with nothing recorded. Recent mergers are the usual reason.",
      "Radon potential describes the geology under a commune, not the concentration inside any building, which depends on the building.",
    ],
    metrics: ["exposure.designations", "disasters.declared", "exposure.radon"],
    provides: [
      "The designations themselves, in the authority's words",
      "Declared natural disasters, with the date of the event and of the order",
    ],
  },
  {
    id: "meteo-france",
    name: "Données climatologiques de base",
    publisher: "Météo-France",
    description:
      "What every weather station in France recorded, month by month: rainfall, " +
      "temperature, days of heat and frost, and sunshine.",
    url: "https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-mensuelles",
    cadence: "Monthly, with the current year republished as it goes",
    coverage:
      "France entière, but thinly: the Aude holds 126 stations opened since 1950, of which 39 " +
      "still report, 26 measure temperature and one measures sunshine",
    licence: "Licence Ouverte 2.0",
    limitations: [
      "A commune has no station of its own. Every figure is borrowed from the nearest station that measures that thing, which is a different station for different measurements and is named with its distance.",
      "Sunshine is measured at roughly one station per département, so a sunshine figure is typically borrowed from much further away than a rainfall one.",
      "Five years is weather rather than climate. One hot summer moves these figures, and they are not a normal.",
      "Distance is not similarity. The nearest station measuring sunshine to Fontanès-de-Sault is 30 km away and 1,600 m up, over a mountain range, and its December is nothing like the village's. Each figure carries its station's distance and altitude so a reader can discount it.",
      "A commune's own altitude is not held, so HomeGround can state the station's and no more.",
      "Stations open, close and are renumbered, so the station answering for a commune can change between editions.",
    ],
    metrics: [
      "weather.sunshine",
      "weather.winterSun",
      "weather.rainDays",
      "weather.rainfall",
      "weather.daysAbove30",
      "weather.daysAbove35",
      "weather.nightsAbove20",
      "weather.frostDays",
      "weather.winterMornings",
      "weather.summerAfternoons",
    ],
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
