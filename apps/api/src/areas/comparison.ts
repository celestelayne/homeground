import { sql } from "drizzle-orm";
import {
  BPE_EDITION,
  BPE_METHOD,
  COMPARED,
  COMPARISON_METHOD_VERSION,
  MEDIAN_METHOD,
  MINIMUM_PEERS,
  PERCENTILE_METHOD,
  peerMedianOf,
  peerPercentileOf,
} from "../bpe/metrics.js";
import type { Db } from "../db/client.js";

/**
 * A commune's facility counts, and where they sit among comparable communes.
 *
 * The comparison is a position, never a verdict: how many communes of the same
 * density class have fewer, and what the middle of that class holds. What the
 * reader concludes from "more than four fifths have none" is theirs to
 * conclude. See specs/evidence.md and ADR-012.
 *
 * Everything here reads HomeGround's own tables. No national distribution is
 * computed from a third party at request time, and none is computed at request
 * time at all — these rows are written when a commune is first stored, and
 * rewritten when an ingest brings new figures.
 */
export const BPE_SOURCE = "insee-bpe";
export const DENSITY_SOURCE = "insee-density-grid";
export const COMPARISON_METHODS = [PERCENTILE_METHOD, MEDIAN_METHOD];

interface EvidenceRow {
  areaCode: string;
  metric: string;
  value: number | null;
  unit: string | null;
  state: "known" | "unknown";
  sourceId: string;
  observedAt: Date | null;
  method: string;
  methodVersion: number;
  basis: string | null;
  basisSourceId: string | null;
  peers: number | null;
}

interface DensityClass extends Record<string, unknown> {
  level: number;
  label: string;
  edition: number;
}

/**
 * Everything BPE and the density grid can say about one commune.
 *
 * Three absences are kept apart, because they are three different facts:
 *
 * - the commune is in neither table, so HomeGround cannot say it exists and
 *   cannot read a missing row as none
 * - the commune exists but is unclassified, so it has counts and no peers
 * - the class is too small to compare against
 */
export async function comparisonEvidence(db: Db, code: string): Promise<EvidenceRow[]> {
  const communeClass = await classOf(db, code);
  const counted = await countsOf(db, code);
  // BPE publishes no zeroes: a commune with nothing has no rows at all. A
  // missing row is therefore only readable as none for a commune the
  // classification says exists.
  const exists = communeClass !== null || counted.size > 0;
  const rows: EvidenceRow[] = [];

  for (const compared of COMPARED) {
    const value = exists ? sum(counted, compared.types) : null;

    rows.push({
      areaCode: code,
      metric: compared.metric,
      value,
      unit: value === null ? null : compared.unit,
      state: value === null ? "unknown" : "known",
      sourceId: BPE_SOURCE,
      observedAt: new Date(Date.UTC(BPE_EDITION, 0, 1)),
      method: BPE_METHOD,
      methodVersion: compared.methodVersion,
      basis: null,
      basisSourceId: null,
      peers: null,
    });

    const position =
      value === null || communeClass === null
        ? null
        : await positionIn(db, communeClass, compared.types, value);

    const basis =
      communeClass === null
        ? null
        : `${communeClass.label}, INSEE density grid ${communeClass.edition}`;

    // Both derived figures share one fate: either the class could place this
    // commune or it could not.
    rows.push(
      comparison(code, peerPercentileOf(compared.metric), position?.percentile ?? null, "percent", {
        basis,
        peers: position?.peers ?? null,
        method: PERCENTILE_METHOD,
      }),
      comparison(code, peerMedianOf(compared.metric), position?.median ?? null, compared.unit, {
        basis,
        peers: position?.peers ?? null,
        method: MEDIAN_METHOD,
      }),
    );
  }

  return rows;
}

function comparison(
  code: string,
  metric: string,
  value: number | null,
  unit: string,
  context: { basis: string | null; peers: number | null; method: string },
): EvidenceRow {
  const made = value !== null && context.basis !== null && context.peers !== null;

  return {
    areaCode: code,
    metric,
    value: made ? value : null,
    unit: made ? unit : null,
    state: made ? "known" : "unknown",
    sourceId: BPE_SOURCE,
    observedAt: new Date(Date.UTC(BPE_EDITION, 0, 1)),
    method: context.method,
    methodVersion: COMPARISON_METHOD_VERSION,
    // A comparison that could not be made names no group. The constraint on
    // the table enforces all three or none.
    basis: made ? context.basis : null,
    basisSourceId: made ? DENSITY_SOURCE : null,
    peers: made ? context.peers : null,
  };
}

async function classOf(db: Db, code: string): Promise<DensityClass | null> {
  const { rows } = await db.execute<DensityClass>(
    sql`select level, label, edition from commune_density where code = ${code} limit 1`,
  );

  return rows[0] ?? null;
}

async function countsOf(db: Db, code: string): Promise<Map<string, number>> {
  const { rows } = await db.execute<{ facility_type: string; count: number }>(
    sql`select facility_type, count from bpe_counts
        where code = ${code} and edition = ${BPE_EDITION}`,
  );

  return new Map(rows.map((row) => [row.facility_type, Number(row.count)]));
}

function sum(counted: Map<string, number>, types: string[]): number {
  return types.reduce((total, type) => total + (counted.get(type) ?? 0), 0);
}

/**
 * Where a count sits in its class.
 *
 * `percentile` is the share of comparable communes holding strictly fewer —
 * the plainest thing that can be said, and the method's name says exactly what
 * it counts. `median` is what the middle of the class holds, taken as a
 * published value rather than an average, because half a bakery is not a
 * number any commune has.
 *
 * Peers with no row for a type are counted as none, which is what BPE's
 * sparseness means for a commune the grid says exists.
 */
async function positionIn(
  db: Db,
  communeClass: DensityClass,
  types: string[],
  value: number,
): Promise<{ percentile: number; median: number; peers: number } | null> {
  const { rows } = await db.execute<{ peers: number; below: number; median: number }>(
    sql`with peer as (
          select code from commune_density where level = ${communeClass.level}
        ),
        counted as (
          select peer.code, coalesce(sum(bpe_counts.count), 0) as value
          from peer
          left join bpe_counts
            on bpe_counts.code = peer.code
           and bpe_counts.edition = ${BPE_EDITION}
           and bpe_counts.facility_type in ${types}
          group by peer.code
        )
        select count(*)::int as peers,
               count(*) filter (where value < ${value})::int as below,
               percentile_disc(0.5) within group (order by value)::int as median
        from counted`,
  );

  const found = rows[0];

  if (!found || Number(found.peers) < MINIMUM_PEERS) {
    // A class this small says nothing. Stated rather than computed anyway.
    return null;
  }

  const peers = Number(found.peers);

  return {
    peers,
    percentile: Math.round((Number(found.below) / peers) * 1000) / 10,
    median: Number(found.median),
  };
}
