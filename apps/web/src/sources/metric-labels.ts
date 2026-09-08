/**
 * How a metric is written for a reader.
 *
 * Shared by the area sidebar and the sources panel, so a figure and the source
 * that produced it are never named differently on the same screen.
 */
export const METRIC_LABELS: Record<string, string> = {
  population: "Population",
  "area.sqKm": "Commune area",
  "population.density": "Density",
  "dwellings.main": "Lived-in homes",
  "dwellings.secondHome": "Second homes",
  "dwellings.vacant": "Empty homes",
  "dwellings.secondHomeShare": "Second homes, share of all",
  "health.pharmacies": "Pharmacies",
  "health.hospitals": "Hospitals",
  "shops.bakery": "Bakeries",
  "shops.grocery": "Food shops",
  "education.school": "Schools for under-elevens",
  "health.gp": "General practitioners",
  "services.postOffice": "Post offices",
  "services.restaurant": "Restaurants and takeaways",
  "health.zoning.gp": "GP cover designation",
  "health.zoning.dentist": "Dentist cover designation",
  "health.zoning.nurse": "Nurse cover designation",
  "health.zoning.physiotherapist": "Physiotherapist cover designation",
  "health.zoning.midwife": "Midwife cover designation",
  "health.zoning.speechTherapist": "Speech therapist cover designation",
};

/**
 * A comparison's label is its metric's, because the two are read together —
 * "Bakeries: 1, and where that sits among comparable communes".
 */
export const PEER_PERCENTILE = ".peerPercentile";
export const PEER_MEDIAN = ".peerMedian";

export function baseMetricOf(metric: string): string {
  return metric
    .replace(PEER_PERCENTILE, "")
    .replace(PEER_MEDIAN, "")
    .replace(/\.share$/, "");
}

export function labelFor(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}
