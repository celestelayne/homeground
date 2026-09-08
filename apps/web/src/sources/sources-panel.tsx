import { useEffect, useState } from "react";
import { getSources } from "../api/client.js";
import type { Source } from "../api/types.js";
import { baseMetricOf, labelFor } from "./metric-labels.js";

interface SourcesPanelProps {
  onClose: () => void;
}

type Load = { kind: "loading" } | { kind: "ready"; sources: Source[] } | { kind: "unavailable" };

/**
 * Everything HomeGround draws on, and what each one cannot tell you.
 *
 * Rendered from the registry the evidence cites rather than written as page
 * copy, so it cannot describe a source that is not wired up, and cannot omit
 * one that is. See specs/evidence.md.
 */
export function SourcesPanel({ onClose }: SourcesPanelProps) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  useEffect(() => {
    let live = true;

    getSources()
      .then((sources) => live && setLoad({ kind: "ready", sources }))
      .catch(() => live && setLoad({ kind: "unavailable" }));

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-[rgb(27_26_23/.34)] p-8">
      <section
        aria-label="Sources and methodology"
        className="w-full max-w-[720px] rounded-card border border-line-2 bg-surface shadow-[0_1px_2px_rgba(27,26,23,.05),0_24px_64px_-24px_rgba(27,26,23,.4)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <h2 className="m-0 text-panel-title font-semibold tracking-[-0.015em]">
            Sources &amp; methodology
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sources and methodology"
            className="px-1 text-ink-3 hover:text-ink"
          >
            ✕
          </button>
        </header>

        {/*
          The claim HomeGround is willing to make, and the two it is not. This
          is the only page copy here; everything below comes from the registry.
        */}
        <p className="m-0 border-b border-line px-6 py-5 text-body leading-[1.6] text-ink-2">
          HomeGround assembles public evidence about a place. It does not judge a property, and it
          does not tell you whether anywhere is safe. Every figure below names the source it came
          from and the date that source observed it.
        </p>

        {load.kind === "loading" ? (
          <p className="m-0 px-6 py-6 text-body text-ink-3">Loading…</p>
        ) : null}

        {load.kind === "unavailable" ? (
          <p className="m-0 px-6 py-6 text-body text-ink-3">
            Could not load the source list. That is a failure to ask, not an absence of sources.
          </p>
        ) : null}

        {load.kind === "ready"
          ? load.sources.map((source) => <SourceEntry key={source.id} source={source} />)
          : null}
      </section>
    </div>
  );
}

function SourceEntry({ source }: { source: Source }) {
  return (
    <article className="border-b border-line px-6 py-5 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-subhead font-semibold tracking-[-0.01em]">{source.name}</h3>
        <span className="text-caption text-ink-3">{source.publisher}</span>
      </div>

      <p className="m-0 mt-1 text-body leading-[1.55] text-ink-2">{source.description}</p>

      <dl className="numeric m-0 mt-3 flex flex-wrap gap-x-6 gap-y-1 text-caption text-ink-3">
        <div className="flex gap-1">
          <dt>updated:</dt>
          <dd className="m-0">{source.cadence}</dd>
        </div>
        <div className="flex gap-1">
          <dt>coverage:</dt>
          <dd className="m-0">{source.coverage}</dd>
        </div>
        <div className="flex gap-1">
          <dt>licence:</dt>
          <dd className="m-0">{source.licence}</dd>
        </div>
      </dl>

      <p className="m-0 mt-3 text-caption leading-[1.55] text-ink-2">
        <span className="font-medium">Provides.</span>{" "}
        {[
          // A metric and its comparisons are one thing to a reader, so the
          // derived forms fold back into the metric they come from.
          ...new Set(source.metrics.map((metric) => labelFor(baseMetricOf(metric)))),
          ...source.provides,
        ].join(" · ")}
      </p>

      {source.limitations.map((limitation) => (
        <p key={limitation} className="m-0 mt-2 text-caption leading-[1.55] text-ink-2">
          <span className="font-medium">Limitation.</span> {limitation}
        </p>
      ))}

      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-caption text-ink-3 underline underline-offset-2 hover:text-ink"
      >
        {source.url}
      </a>
    </article>
  );
}
