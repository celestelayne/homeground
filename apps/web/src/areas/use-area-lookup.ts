import { useCallback, useRef, useState } from "react";
import { geocode, getArea } from "../api/client.js";
import type { Area, GeocodeCandidate } from "../api/types.js";

/** One commune a query could have meant. */
export interface CommuneChoice {
  code: string;
  name: string;
  /** "34000 · Hérault · Occitanie" — enough to tell two Saint-Martins apart. */
  where: string;
}

/**
 * Where an area lookup has got to.
 *
 * A union rather than a set of flags, so an impossible combination cannot be
 * represented — "loaded and unavailable" has no way to exist.
 */
export type AreaLookup =
  | { kind: "idle" }
  | { kind: "searching"; query: string }
  /** The query named no commune HomeGround could find. */
  | { kind: "no-matches"; query: string }
  /** The lookup could not be answered. Different from finding nothing. */
  | { kind: "unavailable"; query: string }
  /**
   * What the query could mean. Always offered, never chosen automatically:
   * a postcode names several communes and a village name turns up in street
   * names elsewhere, and picking the first would research somewhere the user
   * did not ask about.
   */
  | { kind: "matches"; query: string; choices: CommuneChoice[] }
  | { kind: "loaded"; area: Area };

/** Distinct communes among the candidates, in the order the geocoder ranked them. */
function communesIn(candidates: GeocodeCandidate[]): CommuneChoice[] {
  const seen = new Map<string, CommuneChoice>();

  for (const candidate of candidates) {
    if (!candidate.communeCode || seen.has(candidate.communeCode)) {
      continue;
    }

    const where = [candidate.postcode, ...(candidate.context ?? "").split(", ").slice(1)]
      .filter((part) => part)
      .join(" · ");

    seen.set(candidate.communeCode, {
      code: candidate.communeCode,
      // The commune's own name, not the street that happened to match it.
      name: candidate.commune ?? candidate.label,
      where,
    });
  }

  return [...seen.values()];
}

const MIN_QUERY = 3;

export function useAreaLookup() {
  const [lookup, setLookup] = useState<AreaLookup>({ kind: "idle" });
  /** Only the newest query may write. Typing outruns the network. */
  const latest = useRef(0);

  const suggest = useCallback(async (query: string) => {
    const trimmed = query.trim();
    const ticket = ++latest.current;

    if (trimmed.length < MIN_QUERY) {
      setLookup({ kind: "idle" });
      return;
    }

    setLookup({ kind: "searching", query: trimmed });

    let candidates: GeocodeCandidate[];

    try {
      candidates = await geocode(trimmed);
    } catch {
      if (ticket === latest.current) {
        setLookup({ kind: "unavailable", query: trimmed });
      }
      return;
    }

    if (ticket !== latest.current) {
      return;
    }

    const choices = communesIn(candidates);

    setLookup(
      choices.length === 0
        ? // The geocoder answered and named no commune. A real answer.
          { kind: "no-matches", query: trimmed }
        : { kind: "matches", query: trimmed, choices },
    );
  }, []);

  const choose = useCallback(async (choice: CommuneChoice) => {
    const ticket = ++latest.current;

    setLookup({ kind: "searching", query: choice.name });

    try {
      const area = await getArea(choice.code);

      if (ticket === latest.current) {
        setLookup({ kind: "loaded", area });
      }
    } catch {
      if (ticket === latest.current) {
        setLookup({ kind: "unavailable", query: choice.name });
      }
    }
  }, []);

  const clear = useCallback(() => {
    latest.current += 1;
    setLookup({ kind: "idle" });
  }, []);

  return { lookup, suggest, choose, clear };
}
