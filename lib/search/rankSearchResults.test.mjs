import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function transpile(url) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return { outputText, filename };
}

function loadRankSearchResults() {
  const searchQuery = transpile(new URL("./searchQuery.ts", import.meta.url));
  const searchQueryMod = { exports: {} };
  vm.runInNewContext(
    searchQuery.outputText,
    { exports: searchQueryMod.exports, module: searchQueryMod, require },
    { filename: searchQuery.filename },
  );

  const rank = transpile(new URL("./rankSearchResults.ts", import.meta.url));
  const mod = { exports: {} };
  const localRequire = (id) =>
    id === "./searchQuery" ? searchQueryMod.exports : require(id);
  vm.runInNewContext(
    rank.outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename: rank.filename },
  );
  return mod.exports;
}

const { matchScore, findBestTrack, rankSections } = loadRankSearchResults();

test("matchScore grades exact, prefix, contains, and no match", () => {
  assert.equal(matchScore("abbey road", "Abbey Road"), 3);
  assert.equal(matchScore("abbey", "Abbey Road"), 2);
  assert.equal(matchScore("road", "Abbey Road"), 1);
  assert.equal(matchScore("nevermind", "Abbey Road"), 0);
});

test("matchScore normalizes whitespace and unicode like the search box", () => {
  assert.equal(matchScore("  Clics   Modernos ", "clics modernos"), 3);
  assert.equal(matchScore("ｃａｆé", "Café"), 3); // NFKC folds fullwidth forms
  assert.equal(matchScore("", "Abbey Road"), 0);
});

test("findBestTrack picks the best-scoring track and skips headings", () => {
  const track = findBestTrack("stairway to heaven", [
    { type_: "heading", title: "Stairway To Heaven" },
    { type_: "track", title: "Stairway To Heaven (Live)" },
    { type_: "track", title: "Stairway To Heaven" },
    { title: "Black Dog" },
  ]);
  assert.equal(track.title, "Stairway To Heaven");
});

test("findBestTrack returns null when nothing matches", () => {
  assert.equal(findBestTrack("stairway to heaven", [{ title: "Black Dog" }]), null);
  assert.equal(findBestTrack("stairway to heaven", []), null);
});

test("rankSections favors an exact record over an equally exact artist", () => {
  // "stairway to heaven" matches an obscure band exactly, but the record leads.
  assert.deepEqual(
    Array.from(rankSections({ artistScore: 3, albumScore: 3, songScore: 2 })),
    ["albums", "artists", "songs"],
  );
});

test("rankSections favors an exact song over an equally exact artist", () => {
  assert.deepEqual(
    Array.from(rankSections({ artistScore: 3, albumScore: 0, songScore: 3 })),
    ["songs", "artists", "albums"],
  );
});

test("rankSections favors an exact album over a partial artist", () => {
  assert.deepEqual(
    Array.from(rankSections({ artistScore: 1, albumScore: 3, songScore: 0 })),
    ["albums", "artists", "songs"],
  );
});

test("rankSections favors an exact song over partial albums and artists", () => {
  assert.deepEqual(
    Array.from(rankSections({ artistScore: 0, albumScore: 1, songScore: 3 })),
    ["songs", "albums", "artists"],
  );
});

test("rankSections keeps the fixed order on ties", () => {
  assert.deepEqual(
    Array.from(rankSections({ artistScore: 0, albumScore: 0, songScore: 0 })),
    ["albums", "songs", "artists"],
  );
  // A title track ties album vs song and resolves in favor of the album.
  assert.deepEqual(
    Array.from(rankSections({ artistScore: 0, albumScore: 3, songScore: 3 })),
    ["albums", "songs", "artists"],
  );
});
