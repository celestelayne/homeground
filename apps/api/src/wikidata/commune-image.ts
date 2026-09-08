import type { FetchLike } from "../geocoding/ign.js";

/**
 * A photograph of the commune, from Wikidata and Wikimedia Commons.
 *
 * Wikidata links a commune to a picture through the identifier HomeGround
 * already holds: P374 is the INSEE code, P18 the image. Around six communes in
 * seven in the Aude have one.
 *
 * This is the first source that constrains how HomeGround displays rather than
 * only what it may say. The licences are attribution and share-alike, so the
 * photographer and the licence travel with the photograph — they are part of
 * the picture, not a footnote that can be dropped when space is short.
 *
 * The lookup goes through Wikidata's ordinary MediaWiki API rather than its
 * SPARQL endpoint, which would express the same question in one query. The
 * query service sheds load hard — it was answering "1 request per minute" the
 * day this was written — and a commune is fetched once and held, so a request
 * refused there is a photograph the reader never sees.
 */
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT_MS = 8000;
/** Wikimedia asks callers to identify themselves, and throttles those who do not. */
const AGENT = "HomeGround/0.1 (https://github.com/celestelayne/homeground)";
/** Wide enough for a panel at 2x, small enough not to ship a 20 MB original. */
const WIDTH = 1200;
/** Long enough for a shedding endpoint to have moved on. */
const RETRY_MS = 400;

export interface CommuneImage {
  state: "known";
  url: string;
  /** Who took it. Required by the licence, so it is never dropped. */
  artist: string | null;
  licence: string | null;
  /** The file's own page, where the full terms live. */
  descriptionUrl: string | null;
}

/** Corsica writes 2A and 2B, so this is not simply digits. */
const INSEE_CODE = /^[0-9AB]{2,5}$/;

/**
 * What Wikimedia has for this commune, or why it has nothing.
 *
 * The two absences are not the same fact. `unknown` is Wikidata answering and
 * holding no picture — a statement about photographers rather than about the
 * place. `unavailable` is Wikidata not answering, which says nothing at all.
 * Collapsing the second into the first would print "nobody has photographed
 * this commune" on the strength of a 502.
 */
export type CommuneImageResult = CommuneImage | { state: "unknown" } | { state: "unavailable" };

export async function fetchCommuneImage(
  code: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<CommuneImageResult> {
  if (!INSEE_CODE.test(code)) {
    return { state: "unavailable" };
  }

  const found = await askTwice(searchUrl(code), fetchImpl);

  if (!found.ok) {
    return { state: "unavailable" };
  }

  const item = toItemId(found.body);

  if (!item) {
    // Nothing in Wikidata carries this INSEE code. An answer, not a failure.
    return { state: "unknown" };
  }

  const claims = await askTwice(claimsUrl(item), fetchImpl);

  if (!claims.ok) {
    return { state: "unavailable" };
  }

  const file = toImageFile(claims.body);

  if (!file) {
    return { state: "unknown" };
  }

  // The URL is known from the filename alone. Commons is asked only for the
  // credit, so a failure there costs the attribution, not the photograph —
  // and an image whose artist could not be read says so rather than implying
  // there is nobody to credit.
  const credit = await ask(commonsUrl(file), fetchImpl);

  return toImage(file, credit.ok ? credit.body : null);
}

/** The Wikidata item whose P374 is this INSEE code. */
function searchUrl(code: string): URL {
  const url = new URL(WIKIDATA);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  // Asks for the statement itself, not for the digits appearing in the text.
  url.searchParams.set("srsearch", `haswbstatement:P374=${code}`);
  url.searchParams.set("srlimit", "1");
  url.searchParams.set("format", "json");

  return url;
}

/**
 * That item's P18.
 *
 * Read as the claim rather than taken from the page's `pageprops`, which holds
 * a picture MediaWiki chose by its own rules. P18 is the one a Wikidata editor
 * chose as the image of this commune.
 */
function claimsUrl(item: string): URL {
  const url = new URL(WIKIDATA);
  url.searchParams.set("action", "wbgetclaims");
  url.searchParams.set("entity", item);
  url.searchParams.set("property", "P18");
  url.searchParams.set("format", "json");

  return url;
}

function commonsUrl(file: string): URL {
  const url = new URL(COMMONS);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", `File:${file}`);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "extmetadata|url");
  url.searchParams.set("format", "json");

  return url;
}

/**
 * An answer, or the fact that there was not one.
 *
 * A body of null is a legitimate answer to parse; a refusal is not. Keeping
 * them apart here is what lets the caller tell an absent photograph from an
 * absent Wikimedia.
 */
type Answer = { ok: true; body: unknown } | { ok: false };

async function ask(url: URL, fetchImpl: FetchLike): Promise<Answer> {
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return response.ok ? { ok: true, body: await response.json() } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** One retry, because a commune is stored once and asked again for never. */
async function askTwice(url: URL, fetchImpl: FetchLike): Promise<Answer> {
  const first = await ask(url, fetchImpl);

  if (first.ok) {
    return first;
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_MS));

  return await ask(url, fetchImpl);
}

/** Pure. The Wikidata item id in a search result — "Q628489". */
export function toItemId(payload: unknown): string | null {
  const results = (payload as { query?: { search?: unknown } } | null)?.query?.search;

  if (!Array.isArray(results)) {
    return null;
  }

  const title = (results[0] as { title?: unknown } | undefined)?.title;

  return typeof title === "string" && /^Q\d+$/.test(title) ? title : null;
}

/** Pure. The Commons filename P18 names, if the item carries one. */
export function toImageFile(payload: unknown): string | null {
  const claims = (payload as { claims?: { P18?: unknown } } | null)?.claims?.P18;

  if (!Array.isArray(claims)) {
    return null;
  }

  const value = (claims[0] as { mainsnak?: { datavalue?: { value?: unknown } } } | undefined)
    ?.mainsnak?.datavalue?.value;

  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Pure. The image and whatever credit Commons carries for it.
 *
 * Commons gives the artist as a fragment of HTML, usually a link to a user
 * page. The name inside it is what the licence obliges, so the markup is
 * stripped and the text kept.
 */
export function toImage(file: string, payload: unknown): CommuneImage {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${WIDTH}`;
  const pages = (payload as { query?: { pages?: unknown } } | null)?.query?.pages;
  const info =
    pages && typeof pages === "object"
      ? (
          Object.values(pages as Record<string, { imageinfo?: unknown }>)[0]?.imageinfo as
            | { descriptionurl?: unknown; extmetadata?: Record<string, { value?: unknown }> }[]
            | undefined
        )?.[0]
      : undefined;
  const meta = info?.extmetadata ?? {};

  return {
    state: "known",
    url,
    artist: plainText(meta.Artist?.value),
    licence: plainText(meta.LicenseShortName?.value),
    descriptionUrl: typeof info?.descriptionurl === "string" ? info.descriptionurl : null,
  };
}

function plainText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0 ? text : null;
}
