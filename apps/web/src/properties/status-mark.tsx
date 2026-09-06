import type { PropertyStatus } from "../api/types.js";

/**
 * Status is carried by shape, never by colour. Colour is reserved for
 * environmental evidence, and shape stays legible without colour vision.
 */
export function StatusMark({ status, size = 11 }: { status: PropertyStatus; size?: number }) {
  const box = { width: size, height: size };

  if (status === "shortlist") {
    return (
      <span
        aria-hidden="true"
        className="inline-block flex-none rounded-[3px] bg-ink"
        style={box}
      />
    );
  }

  if (status === "visit") {
    return (
      <span
        aria-hidden="true"
        className="inline-block flex-none rotate-45 bg-ink-2"
        style={{ width: size - 2, height: size - 2 }}
      />
    );
  }

  if (status === "rejected") {
    return (
      <span
        aria-hidden="true"
        className="inline-block flex-none rounded-full border border-dashed border-marker-rejected"
        style={box}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-block flex-none rounded-full border-[1.5px] border-marker-saved"
      style={box}
    />
  );
}
