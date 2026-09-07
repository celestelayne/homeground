import { type Static, Type } from "@sinclair/typebox";

/**
 * A source, as the Sources and methodology panel shows it.
 *
 * The panel is rendered from these rows and never written as page copy, so it
 * cannot describe a source that is not wired up. See specs/evidence.md.
 */
export const SourceSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  publisher: Type.String(),
  description: Type.String(),
  url: Type.String(),
  /** How often the publisher republishes. */
  cadence: Type.String(),
  /** Where it applies, and where it does not. */
  coverage: Type.String(),
  licence: Type.String(),
  /**
   * At least one, always. Every source misleads somebody, and saying how is a
   * condition of using it rather than something a user discovers.
   */
  limitations: Type.Array(Type.String(), { minItems: 1 }),
  /** The metrics this source is the origin of, so the panel shows the link. */
  metrics: Type.Array(Type.String()),
});

export const SourcesResultSchema = Type.Object({
  sources: Type.Array(SourceSchema),
});

export type Source = Static<typeof SourceSchema>;
