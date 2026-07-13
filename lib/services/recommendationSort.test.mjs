import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadModule() {
  const filename = fileURLToPath(new URL("./recommendationSort.ts", import.meta.url));
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

function rec(overrides) {
  return {
    title: "Title",
    year: null,
    artistNames: ["Artist"],
    genres: [],
    ...overrides,
  };
}

const ITEMS = [
  rec({ title: "Beta", artistNames: ["Zebra"], year: 1990, genres: ["Rock"] }),
  rec({ title: "alpha", artistNames: ["apple"], year: 1985, genres: ["Jazz", "Rock"] }),
  rec({ title: "Gamma", artistNames: ["Mango"], year: null, genres: ["Jazz"] }),
];

function pluck(items, field) {
  return Array.from(items, (i) => i[field] ?? "—");
}

test("relevance keeps the incoming order and copies the array", () => {
  const { sortRecommendations } = loadModule();
  const result = sortRecommendations(ITEMS, "relevance");
  assert.deepEqual(pluck(result, "title"), ["Beta", "alpha", "Gamma"]);
  assert.notEqual(result, ITEMS);
});

test("year sorts with missing years last in both directions", () => {
  const { sortRecommendations } = loadModule();
  assert.deepEqual(pluck(sortRecommendations(ITEMS, "year-desc"), "title"), [
    "Beta",
    "alpha",
    "Gamma",
  ]);
  assert.deepEqual(pluck(sortRecommendations(ITEMS, "year-asc"), "title"), [
    "alpha",
    "Beta",
    "Gamma",
  ]);
});

test("artist and title sort case-insensitively", () => {
  const { sortRecommendations } = loadModule();
  assert.deepEqual(
    Array.from(sortRecommendations(ITEMS, "artist"), (i) => i.artistNames[0]),
    ["apple", "Mango", "Zebra"],
  );
  assert.deepEqual(pluck(sortRecommendations(ITEMS, "title"), "title"), [
    "alpha",
    "Beta",
    "Gamma",
  ]);
});

test("genre filter matches case-insensitively and passes through when empty", () => {
  const { filterRecommendationsByGenre } = loadModule();
  assert.deepEqual(pluck(filterRecommendationsByGenre(ITEMS, "jazz"), "title"), [
    "alpha",
    "Gamma",
  ]);
  assert.equal(filterRecommendationsByGenre(ITEMS, undefined).length, 3);
  assert.equal(filterRecommendationsByGenre(ITEMS, "  ").length, 3);
});

test("collectRecommendationGenres returns distinct sorted genres", () => {
  const { collectRecommendationGenres } = loadModule();
  assert.deepEqual(Array.from(collectRecommendationGenres(ITEMS)), ["Jazz", "Rock"]);
});

test("parseRecommendationSort guards unknown values", () => {
  const { parseRecommendationSort } = loadModule();
  assert.equal(parseRecommendationSort("year-asc"), "year-asc");
  assert.equal(parseRecommendationSort("nope"), "relevance");
  assert.equal(parseRecommendationSort(undefined), "relevance");
});
