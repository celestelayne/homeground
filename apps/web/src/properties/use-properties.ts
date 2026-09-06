import { useCallback, useEffect, useState } from "react";
import { listProperties, updateProperty } from "../api/client.js";
import type { Property, UpdateProperty } from "../api/types.js";

type LoadState = "loading" | "ready" | "error";

/**
 * One collection, one selection. Mutations await the server and refetch rather
 * than updating optimistically: nothing in M1 requires the complexity, and a
 * local round trip costs milliseconds.
 */
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProperties(await listProperties());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (id: string, patch: UpdateProperty) => {
      await updateProperty(id, patch);
      await load();
    },
    [load],
  );

  const selected = properties.find((property) => property.id === selectedId) ?? null;

  return { properties, state, selectedId, selected, setSelectedId, update, reload: load };
}
