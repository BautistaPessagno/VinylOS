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
  assert.match(source, /Found \{result\.artists\.length\} artists and \{result\.albums\.length\} records/);
});

test("Explore server action searches Discogs artists and vinyl concurrently", () => {
  const source = readFileSync(actionsPath, "utf8");
  const action = source.slice(source.indexOf("export async function searchExploreAction"));

  assert.match(action, /normalizeSearchQuery/);
  assert.match(action, /isSearchQueryReady/);
  assert.match(action, /Promise\.all/);
  assert.match(action, /discogs\.searchArtists\(normalizedQuery\)/);
  assert.match(action, /discogs\.searchVinylAlbums\(normalizedQuery\)/);
});
