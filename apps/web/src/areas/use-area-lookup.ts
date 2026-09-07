import { useCallback, useState } from "react";
import { geocode, getArea } from "../api/client.js";
import type { Area, GeocodeCandidate } from "../api/types.js";

/** One commune a query could have meant. */
export interface CommuneChoice {
  code: string;
  label: string;
}

/**
 * Where an area lookup has got to. Like the add-property machine, the states
 * are a union rather than a set of flags, so an impossible combination cannot
 * be represented — "loaded and unavailable" has no way to exist.
 */
export type AreaLookup =
  | { kind: "idle" }
  | { kind: "searching"; query: string }
  /** The query named no commune HomeGround could find. */
  | { kind: "no-matches"; query: string }
  /** The lookup could not be answered. Different from finding nothing. */
  | { kind: "unavailable"; query: string }
  /**
   * The query matched several communes. A postcode does this routinely: 11200
   * covers five. HomeGround does not choose for the user.
   */
  | { kind: "ambiguous"; query: string; choices: CommuneChoice[] }
  | { kind: "loaded"; area: Area };

/** Distinct communes among the candidates, in the order the geocoder ranked them. */
function communesIn(candidates: GeocodeCandidate[]): CommuneChoice[] {
  const seen = new Map<string, CommuneChoice>();

  for (const candidate of candidates) {
    if (candidate.communeCode && !seen.has(candidate.communeCode)) {
      seen.set(candidate.communeCode, { code: candidate.communeCode, label: candidate.label });
    }
  }

  return [...seen.values()];
}

export function useAreaLookup() {
  const [lookup, setLookup] = useState<AreaLookup>({ kind: "idle" });

  const load = useCallback(async (code: string, query: string) => {
    try {
      setLookup({ kind: "loaded", area: await getArea(code) });
    } catch {
      setLookup({ kind: "unavailable", query });
    }
  }, []);

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();

      if (trimmed.length < 3) {
        return;
      }

      setLookup({ kind: "searching", query: trimmed });

      let candidates: GeocodeCandidate[];

      try {
        candidates = await geocode(trimmed);
      } catch {
        setLookup({ kind: "unavailable", query: trimmed });
        return;
      }

      const communes = communesIn(candidates);
      const only = communes[0];

      if (!only) {
        // The geocoder answered and named no commune. A real answer.
        setLookup({ kind: "no-matches", query: trimmed });
        return;
      }

      if (communes.length > 1) {
        setLookup({ kind: "ambiguous", query: trimmed, choices: communes });
        return;
      }

      await load(only.code, trimmed);
    },
    [load],
  );

  const choose = useCallback(
    async (choice: CommuneChoice) => {
      setLookup({ kind: "searching", query: choice.label });
      await load(choice.code, choice.label);
    },
    [load],
  );

  const clear = useCallback(() => setLookup({ kind: "idle" }), []);

  return { lookup, search, choose, clear };
}
