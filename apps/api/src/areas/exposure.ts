import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";

/**
 * What the state records about a commune's exposure.
 *
 * Two kinds of fact, kept apart because they are not the same claim. A
 * **designation** says the commune is recorded as exposed to something: no
 * date, no severity, and unreadable without knowing how common it is. A
 * **declared disaster** says something happened and the state signed an order
 * saying so, on a date.
 *
 * Neither is scored, rated or classified here. See docs/methodology.md.
 */
export const GEORISQUES_SOURCE = "georisques";
export const DESIGNATION_METHOD = "gaspar-designation";
export const DISASTER_METHOD = "gaspar-declared-disaster";
export const RADON_METHOD = "radon-potential-class";
export const EXPOSURE_METHOD_VERSION = 1;
export const EXPOSURE_METHODS = [DESIGNATION_METHOD, DISASTER_METHOD, RADON_METHOD];

export interface Exposure extends Record<string, unknown> {
  riskCode: string;
  label: string;
  /** How many communes in France carry the same designation. */
  prevalence: number | null;
}

export interface Declaration extends Record<string, unknown> {
  id: string;
  riskCode: string;
  label: string;
  beganAt: string;
  /** When the order was signed. A different fact from when it happened. */
  signedAt: string | null;
}

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

/**
 * Whether the archive carries this commune at all.
 *
 * The distinction the whole milestone turns on. A commune the base does not
 * carry has nothing recorded *by HomeGround*, which is not the same as having
 * nothing recorded against it — twenty-four communes in the reference list are
 * absent from GASPAR entirely, and recent mergers are absent from both. Their
 * exposure is Unknown, never "no risks".
 */
async function isCovered(db: Db, code: string): Promise<boolean> {
  const { rows } = await db.execute<{ covered: boolean }>(
    sql`select (exists (select 1 from commune_risks where code = ${code})
             or exists (select 1 from commune_disasters where code = ${code})) as covered`,
  );

  return rows[0]?.covered === true;
}

/** The designations, each with how common it is nationally. */
export async function exposuresOf(db: Db, code: string): Promise<Exposure[] | null> {
  if (!(await isCovered(db, code))) {
    return null;
  }

  const { rows } = await db.execute<Exposure>(
    sql`select r.risk_code as "riskCode",
               r.label,
               (select count(distinct peer.code)::int from commune_risks peer
                 where peer.risk_code = r.risk_code) as prevalence
        from commune_risks r
        where r.code = ${code}
        order by r.risk_code`,
  );

  return rows.map((row) => ({ ...row, prevalence: Number(row.prevalence) }));
}

/** The declarations, most recent first. */
export async function declarationsOf(db: Db, code: string): Promise<Declaration[] | null> {
  if (!(await isCovered(db, code))) {
    return null;
  }

  const { rows } = await db.execute<{
    id: string;
    riskCode: string;
    label: string;
    beganAt: Date;
    signedAt: Date | null;
  }>(
    sql`select id, risk_code as "riskCode", label, began_at as "beganAt", signed_at as "signedAt"
        from commune_disasters
        where code = ${code}
        order by began_at desc, id`,
  );

  return rows.map((row) => ({
    id: row.id,
    riskCode: row.riskCode,
    label: row.label,
    beganAt: new Date(row.beganAt).toISOString(),
    signedAt: row.signedAt ? new Date(row.signedAt).toISOString() : null,
  }));
}

/**
 * The summary figures, as evidence.
 *
 * Counts and a date, and nothing derived from them. Six droughts in eight
 * years is a record of what happened; a rate, a frequency or a trend would be
 * a claim about what happens next, and this milestone does not make one.
 */
export async function exposureEvidence(db: Db, code: string): Promise<EvidenceRow[]> {
  const covered = await isCovered(db, code);

  if (!covered) {
    return [
      unknown(code, "exposure.designations", DESIGNATION_METHOD),
      unknown(code, "disasters.declared", DISASTER_METHOD),
      unknown(code, "exposure.radon", RADON_METHOD),
    ];
  }

  const { rows } = await db.execute<{
    designations: number;
    declarations: number;
    orders: number;
    latest: Date | null;
    radon: number | null;
    radon_peers: number | null;
    communes: number;
  }>(
    sql`select (select count(*)::int from commune_risks where code = ${code}) as designations,
               (select count(*)::int from commune_disasters where code = ${code}) as declarations,
               (select count(distinct id)::int from commune_disasters where code = ${code}) as orders,
               (select max(began_at) from commune_disasters where code = ${code}) as latest,
               (select potential_class from commune_radon where code = ${code}) as radon,
               (select count(*)::int from commune_radon peer
                 where peer.potential_class = (select potential_class from commune_radon where code = ${code}))
                 as radon_peers,
               (select count(*)::int from commune_radon) as communes`,
  );

  const found = rows[0];

  if (!found) {
    return [];
  }

  const radon = found.radon === null ? null : Number(found.radon);

  return [
    measured(code, "exposure.designations", Number(found.designations), "designations", {
      method: DESIGNATION_METHOD,
    }),
    // Declarations rather than orders: one order can declare two kinds at once,
    // and both counts are true. The list beneath shows which is which.
    measured(code, "disasters.declared", Number(found.declarations), "declarations", {
      method: DISASTER_METHOD,
      // The most recent event, not the most recent signature.
      observedAt: found.latest ? new Date(found.latest) : null,
      basis: `${found.orders} prefectoral orders`,
    }),
    radon === null
      ? unknown(code, "exposure.radon", RADON_METHOD)
      : {
          areaCode: code,
          metric: "exposure.radon",
          value: null,
          unit: null,
          // The authority's scale, as the authority numbers it.
          category: `${radon} of 3`,
          state: "known" as const,
          sourceId: GEORISQUES_SOURCE,
          observedAt: null,
          method: RADON_METHOD,
          methodVersion: EXPOSURE_METHOD_VERSION,
          basis: "Communes in the same radon class, France",
          basisSourceId: GEORISQUES_SOURCE,
          peers: Number(found.radon_peers ?? 0),
        },
  ];
}

function measured(
  code: string,
  metric: string,
  value: number,
  unit: string,
  extra: { method: string; observedAt?: Date | null; basis?: string },
): EvidenceRow {
  return {
    areaCode: code,
    metric,
    value,
    unit,
    category: null,
    state: "known",
    sourceId: GEORISQUES_SOURCE,
    observedAt: extra.observedAt ?? null,
    method: extra.method,
    methodVersion: EXPOSURE_METHOD_VERSION,
    basis: extra.basis ?? null,
    basisSourceId: extra.basis ? GEORISQUES_SOURCE : null,
    peers: null,
  };
}

function unknown(code: string, metric: string, method: string): EvidenceRow {
  return {
    areaCode: code,
    metric,
    value: null,
    unit: null,
    category: null,
    state: "unknown",
    sourceId: GEORISQUES_SOURCE,
    observedAt: null,
    method,
    methodVersion: EXPOSURE_METHOD_VERSION,
    basis: null,
    basisSourceId: null,
    peers: null,
  };
}
