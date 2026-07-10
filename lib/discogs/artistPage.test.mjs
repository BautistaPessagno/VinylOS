import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadArtistPageHelpers() {
  const filename = fileURLToPath(new URL("./artistPage.ts", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require },
    { filename },
  );
  return mod.exports;
}

test("artist routes accept only positive integer identifiers", () => {
  const { parsePositiveInteger } = loadArtistPageHelpers();

  assert.equal(parsePositiveInteger("908651"), 908651);
  assert.equal(parsePositiveInteger("0"), null);
  assert.equal(parsePositiveInteger("2.5"), null);
  assert.equal(parsePositiveInteger("not-an-id"), null);
});

test("artist pages prefer the primary Discogs image", () => {
  const { getArtistImageUrl } = loadArtistPageHelpers();
  const artist = {
    id: 1,
    name: "Artist",
    images: [
      { type: "secondary", uri: "secondary.jpg" },
      { type: "primary", uri: "primary.jpg" },
    ],
  };

  assert.equal(getArtistImageUrl(artist), "primary.jpg");
  assert.equal(getArtistImageUrl({ id: 2, name: "No image" }), "");
});
