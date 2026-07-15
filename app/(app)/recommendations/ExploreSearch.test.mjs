import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentPath = fileURLToPath(new URL("./ExploreSearch.tsx", import.meta.url));
const actionsPath = fileURLToPath(new URL("./actions.ts", import.meta.url));

test("Explore search uses normalized cached latest-only requests", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /normalizeSearchQuery/);
  assert.match(source, /isSearchQueryReady/);
  assert.match(source, /isLatestSearchRequest/);
  assert.match(source, /resultCache\s*=\s*useRef/);
  assert.match(source, /pendingSearches\s*=\s*useRef/);
  assert.match(source, /latestSearchRequestId\s*=\s*useRef/);
  assert.match(source, /focusOnMount/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /searchErrorMessage\(caught\)/);
  assert.match(source, /Found \{result\.artists\.length\} artists, \{result\.albums\.length\} records/);
  assert.match(source, /\{result\.songs\.length\} songs/);
});

test("Explore server action searches Discogs artists, vinyl, and tracks concurrently", () => {
  const source = readFileSync(actionsPath, "utf8");
  const action = source.slice(source.indexOf("export async function searchExploreAction"));

  assert.match(action, /normalizeSearchQuery/);
  assert.match(action, /isSearchQueryReady/);
  assert.match(action, /Promise\.all/);
  assert.match(action, /discogs\.searchArtists\(normalizedQuery\)/);
  assert.match(action, /discogs\.searchVinylAlbums\(normalizedQuery\)/);
  assert.match(action, /discogs\.searchVinylAlbumsByTrack\(normalizedQuery\)/);
  assert.match(action, /resolveSongResults\(normalizedQuery, trackAlbums\)/);
});

test("song resolution drops releases without a matching track", () => {
  const source = readFileSync(actionsPath, "utf8");

  assert.match(source, /async function resolveSongResults/);
  assert.match(source, /findBestTrack\(query, entry\.release\.tracklist \?\? \[\]\)/);
  assert.match(source, /MAX_SONG_RESULTS = 4/);
  // Individual tracklist fetch failures must not break the whole search.
  assert.match(source, /catch \{\s*return null;/);
});
