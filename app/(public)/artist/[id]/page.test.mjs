import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(new URL("./page.tsx", import.meta.url));
const loadingPath = fileURLToPath(new URL("./loading.tsx", import.meta.url));
const dirPath = fileURLToPath(new URL(".", import.meta.url));

test("artist page loads Discogs identity and paginated vinyl records", () => {
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /params:\s*Promise<\{ id: string \}>/);
  assert.match(source, /searchParams:\s*Promise<\{ page\?: string \}>/);
  assert.match(source, /getOptionalSession\(\)/);
  assert.doesNotMatch(source, /await requireSession\(\)/);
  assert.match(source, /await Promise\.all\(\[params, searchParams\]\)/);
  assert.match(source, /getArtistCached\(artistId\)/);
  assert.match(source, /searchArtistVinylAlbums\(artist\.name, requestedPage\)/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, />\s*Discos\s*</);
  assert.match(source, /DiscoveryAlbumCard/);
  assert.match(source, /"\/explore\?focus=search"/);
  assert.match(source, /page=\$\{catalog\.page - 1\}/);
  assert.match(source, /page=\$\{catalog\.page \+ 1\}/);
});

test("artist page shares the canonical artist URL without pagination", () => {
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /ShareLinkButton/);
  assert.match(source, /shareUrlForPath/);
  assert.match(source, /`\/artist\/\$\{artistId\}`/);
  assert.doesNotMatch(source, /shareUrlForPath\(`\/artist\/\$\{artistId\}\?/);
  assert.match(source, /label="Compartir"/);
});

test("artist route has no loading.tsx, so a missing artist is a real 404", () => {
  // A loading.tsx wraps the page in a Suspense boundary, which flushes the shell
  // — and a 200 — before the page can call notFound(). Every unknown artist id
  // then answers 200 with an empty body, which Google reads as a soft 404.
  assert.equal(
    readdirSync(dirPath).includes("loading.tsx"),
    false,
    "loading.tsx here would turn missing artists back into soft 404s",
  );
  assert.equal(existsSync(loadingPath), false);
});
