import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadModule() {
  const filename = fileURLToPath(new URL("./exploreSort.ts", import.meta.url));
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

const ALBUMS = [
  { artist: "Zebra", album: "Beta" },
  { artist: "apple", album: "alpha" },
  { artist: "Mango", album: "Gamma" },
];

function pluck(albums, field) {
  return Array.from(albums, (a) => a[field]);
}

test("relevance keeps the incoming chart order and copies the array", () => {
  const { sortExploreAlbums } = loadModule();
  const result = sortExploreAlbums(ALBUMS, "relevance");
  assert.deepEqual(pluck(result, "album"), ["Beta", "alpha", "Gamma"]);
  assert.notEqual(result, ALBUMS);
});

test("artist sorts case-insensitively A–Z", () => {
  const { sortExploreAlbums } = loadModule();
  assert.deepEqual(pluck(sortExploreAlbums(ALBUMS, "artist"), "artist"), [
    "apple",
    "Mango",
    "Zebra",
  ]);
});

test("title sorts case-insensitively A–Z", () => {
  const { sortExploreAlbums } = loadModule();
  assert.deepEqual(pluck(sortExploreAlbums(ALBUMS, "title"), "album"), [
    "alpha",
    "Beta",
    "Gamma",
  ]);
});

test("parseExploreSort guards unknown values", () => {
  const { parseExploreSort } = loadModule();
  assert.equal(parseExploreSort("artist"), "artist");
  assert.equal(parseExploreSort("nope"), "relevance");
  assert.equal(parseExploreSort(undefined), "relevance");
});
