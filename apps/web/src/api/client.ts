import type { Property, UpdateProperty } from "./types.js";

/** Same origin in development, via the Vite proxy. */
const BASE = "/api";

class RequestFailed extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RequestFailed";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: init?.body ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    throw new RequestFailed("unreachable", "Could not reach HomeGround");
  }

  if (!response.ok) {
    // The code is the contract; the message is a developer diagnostic and is
    // never shown to a user.
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;

    throw new RequestFailed(body?.error?.code ?? "request_failed", `${path} failed`);
  }

  return (await response.json()) as T;
}

export async function listProperties(): Promise<Property[]> {
  const { properties } = await request<{ properties: Property[] }>("/properties");

  return properties;
}

export async function updateProperty(id: string, patch: UpdateProperty): Promise<Property> {
  return request<Property>(`/properties/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export { RequestFailed };
