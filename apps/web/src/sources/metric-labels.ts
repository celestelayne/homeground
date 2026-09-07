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
};

export function labelFor(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}
