/**
 * What HomeGround compares, and which BPE types it reads to do it.
 *
 * A short list on purpose. BPE counts 235 kinds of facility, and a panel
 * listing all of them would be a spreadsheet. These are the ones a person
 * deciding where to live asks about first — is there bread, food, a school, a
 * doctor, a post office, somewhere to eat.
 *
 * Where a metric reads several types, that is a derivation and carries its own
 * method version. A village with a supérette and no épicerie has a grocer, and
 * a metric that only counted épiceries would report none.
 */
export interface ComparedMetric {
  metric: string;
  /** BPE type codes, summed. */
  types: string[];
  unit: string;
  /** Bumped when the set of types changes, per specs/evidence.md. */
  methodVersion: number;
}

export const COMPARED: ComparedMetric[] = [
  { metric: "shops.bakery", types: ["B207"], unit: "bakeries", methodVersion: 1 },
  {
    // Supermarket, mini-market and grocer. Three types, one question.
    metric: "shops.grocery",
    types: ["B105", "B201", "B202"],
    unit: "food shops",
    methodVersion: 1,
  },
  {
    // Nursery, primary and elementary: schools for children under eleven.
    metric: "education.school",
    types: ["C107", "C108", "C109"],
    unit: "schools",
    methodVersion: 1,
  },
  { metric: "health.gp", types: ["D265"], unit: "general practitioners", methodVersion: 1 },
  { metric: "services.postOffice", types: ["A206"], unit: "post offices", methodVersion: 1 },
  {
    metric: "services.restaurant",
    types: ["A504"],
    unit: "restaurants and takeaways",
    methodVersion: 1,
  },
];

/** The edition ingested. Two editions could sit side by side; one does today. */
export const BPE_EDITION = 2025;
export const BPE_METHOD = "bpe-facility-count";

/** Derived metric names, kept in one place so the registry and the store agree. */
export const peerPercentileOf = (metric: string) => `${metric}.peerPercentile`;
export const peerMedianOf = (metric: string) => `${metric}.peerMedian`;

export const PERCENTILE_METHOD = "peer-percentile-below";
export const MEDIAN_METHOD = "peer-median";
export const COMPARISON_METHOD_VERSION = 1;

/**
 * Below this, a class says nothing.
 *
 * A convention rather than a law, which is why it is stated on screen and
 * carried by the method version. INSEE's smallest class holds 545 communes, so
 * this guards a grid that changes rather than one that exists today.
 */
export const MINIMUM_PEERS = 30;
