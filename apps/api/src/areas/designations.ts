import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { PROFESSIONS } from "../zoning/parse.js";

/**
 * What the health authorities have designated this commune as.
 *
 * A designation is evidence of a decision, not of a quantity: an ARS looked at
 * supply against need across a health catchment and published a decree. It is
 * reported in the authority's own words, with the date of the decree and the
 * catchment it was drawn over. See specs/evidence.md.
 *
 * Each designation is published beside how common it is, because that is what
 * makes it readable. 16,878 communes are the most severe category for general
 * practitioners and 13,646 the next: a commune designated under-served is in
 * the company of most of France, and a panel that omits that turns a fact into
 * an alarm.
 */
export const ZONING_SOURCE = "ars-zonage";
export const ZONING_METHOD = "ars-zoning-designation";
export const SHARE_METHOD = "share-of-communes-with-designation";
export const ZONING_METHOD_VERSION = 1;

export const zoningMetricOf = (profession: string) => `health.zoning.${profession}`;
export const zoningShareOf = (profession: string) => `health.zoning.${profession}.share`;

interface EvidenceRow {
  areaCode: string;
  metric: string;
  value: number | null;
  unit: string | null;
  category: string | null;
  state: "known" | "unknown";
  sourceId: string;
  observedAt: Date | null;
  method: string;
  methodVersion: number;
  basis: string | null;
  basisSourceId: string | null;
  peers: number | null;
}

interface ZoningRow extends Record<string, unknown> {
  profession: string;
  level: string;
  decreed_at: Date | null;
  catchment: string | null;
  same: number;
  total: number;
}

export async function designationEvidence(db: Db, code: string): Promise<EvidenceRow[]> {
  const { rows } = await db.execute<ZoningRow>(
    sql`select z.profession,
               z.level,
               z.decreed_at,
               z.catchment,
               (select count(*) from health_zoning peer
                 where peer.profession = z.profession and peer.level = z.level)::int as same,
               (select count(*) from health_zoning peer
                 where peer.profession = z.profession)::int as total
        from health_zoning z
        where z.code = ${code}`,
  );

  const found = new Map(rows.map((row) => [row.profession, row]));
  const evidence: EvidenceRow[] = [];

  for (const profession of Object.values(PROFESSIONS)) {
    const row = found.get(profession);

    // No designation held is Unknown: either the authority did not classify
    // this commune, or HomeGround has not ingested the file. Neither is the
    // mildest category, and neither is "adequately served".
    if (!row) {
      evidence.push(
        unknown(code, zoningMetricOf(profession), ZONING_METHOD),
        unknown(code, zoningShareOf(profession), SHARE_METHOD),
      );
      continue;
    }

    evidence.push({
      areaCode: code,
      metric: zoningMetricOf(profession),
      value: null,
      unit: null,
      // The authority's word, unchanged. Softening it here would be
      // HomeGround editorialising a legal designation.
      category: row.level,
      state: "known",
      sourceId: ZONING_SOURCE,
      // When the ARS decided, not when HomeGround fetched it.
      observedAt: row.decreed_at ? new Date(row.decreed_at) : null,
      method: ZONING_METHOD,
      methodVersion: ZONING_METHOD_VERSION,
      // The area the decision was drawn over. The commune sits inside it; the
      // ARS was not looking at the commune alone.
      basis: row.catchment,
      basisSourceId: row.catchment ? ZONING_SOURCE : null,
      peers: null,
    });

    const total = Number(row.total);

    evidence.push({
      areaCode: code,
      metric: zoningShareOf(profession),
      value: total > 0 ? Math.round((Number(row.same) / total) * 1000) / 10 : null,
      unit: total > 0 ? "percent" : null,
      category: null,
      state: total > 0 ? "known" : "unknown",
      sourceId: ZONING_SOURCE,
      observedAt: row.decreed_at ? new Date(row.decreed_at) : null,
      method: SHARE_METHOD,
      methodVersion: ZONING_METHOD_VERSION,
      basis: total > 0 ? "Communes carrying the same designation, France" : null,
      basisSourceId: total > 0 ? ZONING_SOURCE : null,
      peers: total > 0 ? total : null,
    });
  }

  return evidence;
}

function unknown(code: string, metric: string, method: string): EvidenceRow {
  return {
    areaCode: code,
    metric,
    value: null,
    unit: null,
    category: null,
    state: "unknown",
    sourceId: ZONING_SOURCE,
    observedAt: null,
    method,
    methodVersion: ZONING_METHOD_VERSION,
    basis: null,
    basisSourceId: null,
    peers: null,
  };
}
