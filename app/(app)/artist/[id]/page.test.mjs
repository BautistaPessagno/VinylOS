import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(new URL("./page.tsx", import.meta.url));
const loadingPath = fileURLToPath(new URL("./loading.tsx", import.meta.url));

test("artist page loads Discogs identity and paginated vinyl records", () => {
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /params:\s*Promise<\{ id: string \}>/);
  assert.match(source, /searchParams:\s*Promise<\{ page\?: string \}>/);
  assert.match(source, /await requireSession\(\)/);
  assert.match(source, /await Promise\.all\(\[params, searchParams\]\)/);
  assert.match(source, /getArtistCached\(artistId\)/);
  assert.match(source, /searchArtistVinylAlbums\(artist\.name, requestedPage\)/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, />\s*Records\s*</);
  assert.match(source, /DiscoveryAlbumCard/);
  assert.match(source, /page=\$\{catalog\.page - 1\}/);
  assert.match(source, /page=\$\{catalog\.page \+ 1\}/);
});

test("artist route has immediate loading feedback", () => {
  const source = readFileSync(loadingPath, "utf8");

  assert.match(source, /animate-pulse/);
  assert.match(source, /grid-cols-2/);
});
