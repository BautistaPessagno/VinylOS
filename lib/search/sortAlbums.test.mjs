import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadSortAlbums() {
  const filename = fileURLToPath(new URL("./sortAlbums.ts", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const mod = { exports: {} };
  vm.runInNewContext(outputText, { exports: mod.exports, module: mod, require }, { filename });
  return mod.exports;
}

function album(overrides) {
  return {
    key: overrides.key ?? overrides.title,
    releaseId: 1,
    artist: "Artist",
    title: "Title",
    genres: [],
    editionCount: 1,
    ...overrides,
  };
}

const SAMPLE = [
  album({ title: "Beta", artist: "Zebra", year: "1990", country: "UK" }),
  album({ title: "alpha", artist: "apple", year: "1985", country: "US" }),
  album({ title: "Gamma", artist: "Mango", year: undefined, country: undefined }),
];

// sortAlbumGroups returns arrays from the vm realm; pluck fields into a test-realm array
// so deepStrictEqual doesn't trip on cross-realm prototypes.
function pluck(albums, field) {
  return Array.from(albums, (a) => a[field] ?? "—");
}

test("relevance keeps the original order and returns a new array", () => {
  const { sortAlbumGroups } = loadSortAlbums();
  const result = sortAlbumGroups(SAMPLE, "relevance");
  assert.deepEqual(pluck(result, "title"), ["Beta", "alpha", "Gamma"]);
  assert.notEqual(result, SAMPLE);
});

test("year-desc sorts newest first with missing years last", () => {
  const { sortAlbumGroups } = loadSortAlbums();
  assert.deepEqual(pluck(sortAlbumGroups(SAMPLE, "year-desc"), "title"), [
    "Beta",
    "alpha",
    "Gamma",
  ]);
});

test("year-asc sorts oldest first with missing years last", () => {
  const { sortAlbumGroups } = loadSortAlbums();
  assert.deepEqual(pluck(sortAlbumGroups(SAMPLE, "year-asc"), "title"), [
    "alpha",
    "Beta",
    "Gamma",
  ]);
});

test("artist sorts case-insensitively A–Z", () => {
  const { sortAlbumGroups } = loadSortAlbums();
  assert.deepEqual(pluck(sortAlbumGroups(SAMPLE, "artist"), "artist"), [
    "apple",
    "Mango",
    "Zebra",
  ]);
});

test("title sorts case-insensitively A–Z", () => {
  const { sortAlbumGroups } = loadSortAlbums();
  assert.deepEqual(pluck(sortAlbumGroups(SAMPLE, "title"), "title"), [
    "alpha",
    "Beta",
    "Gamma",
  ]);
});

test("country sorts A–Z with missing country last", () => {
  const { sortAlbumGroups } = loadSortAlbums();
  assert.deepEqual(pluck(sortAlbumGroups(SAMPLE, "country"), "country"), ["UK", "US", "—"]);
});

test("isAlbumSortKey guards known keys", () => {
  const { isAlbumSortKey } = loadSortAlbums();
  assert.equal(isAlbumSortKey("country"), true);
  assert.equal(isAlbumSortKey("nonsense"), false);
});
