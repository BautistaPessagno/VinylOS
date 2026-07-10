import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentPath = fileURLToPath(new URL("./AddReleaseForm.tsx", import.meta.url));
const actionsPath = fileURLToPath(new URL("../actions.ts", import.meta.url));

test("Add Record search normalizes, caches, and rejects stale responses", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /normalizeSearchQuery/);
  assert.match(source, /isSearchQueryReady/);
  assert.match(source, /isLatestSearchRequest/);
  assert.match(source, /resultCache\s*=\s*useRef/);
  assert.match(source, /pendingSearches\s*=\s*useRef/);
  assert.match(source, /latestSearchRequestId\s*=\s*useRef/);
  assert.match(source, /Enter at least 2 characters/);

  const queryHandler = source.slice(
    source.indexOf("function handleQueryChange"),
    source.indexOf("function toggleSelect"),
  );
  const searchEffect = source.slice(
    source.indexOf("useEffect(() =>"),
    source.indexOf("function handleAdd"),
  );
  assert.match(queryHandler, /isSearchQueryReady/);
  assert.match(queryHandler, /latestSearchRequestId\.current/);
  assert.doesNotMatch(
    searchEffect,
    /if \(!isSearchQueryReady\([^)]*\)\)\s*\{[^}]*setResults/s,
  );
});

test("Add Record server search enforces normalized ready queries", () => {
  const source = readFileSync(actionsPath, "utf8");
  const action = source.slice(
    source.indexOf("export async function searchDiscogsAction"),
    source.indexOf("export async function getAlbumEditionsAction"),
  );

  assert.match(action, /normalizeSearchQuery/);
  assert.match(action, /isSearchQueryReady/);
  assert.match(action, /searchVinylAlbums\(normalizedQuery\)/);
});
