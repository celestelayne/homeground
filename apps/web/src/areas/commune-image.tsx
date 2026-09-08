import { useState } from "react";
import type { Area } from "../api/types.js";

/**
 * A photograph of the commune, from Wikimedia Commons.
 *
 * It is not evidence and carries no measurement: it is whatever one
 * contributor chose to photograph, on a day of their choosing. Honest as a
 * photograph of the place, and no basis for a conclusion about it — which is
 * why the caption names the source rather than the subject.
 *
 * The credit is not decoration. These files are licensed on attribution and
 * share-alike terms, so the photographer and the licence are shown with the
 * picture or the picture is not shown.
 */
export function CommuneImage({ area }: { area: Area }) {
  // Commons is not a CDN with a contract. A file renamed or deleted upstream
  // leaves a broken frame, so a failed load is reported as what it is: the
  // picture could not be fetched, which says nothing about the commune.
  const [broken, setBroken] = useState(false);
  const image = area.image;

  if (image.state !== "known") {
    return <NoPhotograph area={area} state={image.state} />;
  }

  if (broken) {
    return <NoPhotograph area={area} state="unavailable" />;
  }

  return (
    <figure className="m-0 px-6 pt-4">
      <img
        src={image.url}
        // What it is and where it came from. Not a description of the scene:
        // nothing in the record says what the photograph shows.
        alt={`Photograph of ${area.name}, contributed to Wikimedia Commons`}
        onError={() => setBroken(true)}
        loading="lazy"
        className="block aspect-[16/9] w-full rounded-card border border-line object-cover"
      />

      <figcaption className="mt-2 text-meta leading-[1.45] text-ink-3">
        {image.artist ? `Photograph: ${image.artist}` : "Photograph: contributor not recorded"}
        {image.licence ? ` · ${image.licence}` : null} ·{" "}
        <a
          href={image.descriptionUrl ?? "https://commons.wikimedia.org"}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * The two absences, worded apart.
 *
 * Nobody uploaded a picture and nobody could be asked are different facts, and
 * the second one is about HomeGround. Printing the first in place of the
 * second would be a claim about the commune drawn from a failed request.
 */
function NoPhotograph({ area, state }: { area: Area; state: "unknown" | "unavailable" }) {
  return (
    <p className="m-0 px-6 pt-4 text-caption leading-[1.5] text-ink-3">
      {state === "unknown"
        ? `No photograph of ${area.name} has been contributed to Wikimedia Commons. That is an absence of photographers, not of anything about the commune.`
        : `A photograph of ${area.name} could not be fetched from Wikimedia Commons. That is a failure to ask, not an absence.`}
    </p>
  );
}
