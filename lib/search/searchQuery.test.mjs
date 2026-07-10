import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadSearchQuery() {
  const filename = fileURLToPath(new URL("./searchQuery.ts", import.meta.url));
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
    {
      exports: mod.exports,
      module: mod,
      require,
    },
    { filename },
  );

  return mod.exports;
}

test("search queries normalize Unicode, case, and whitespace", () => {
  const { normalizeSearchQuery } = loadSearchQuery();

  assert.equal(normalizeSearchQuery("  CHARLY   García  "), "charly garcía");
  assert.equal(normalizeSearchQuery("ＣＤ"), "cd");
});

test("search requires two normalized characters", () => {
  const { isSearchQueryReady } = loadSearchQuery();

  assert.equal(isSearchQueryReady(" a "), false);
  assert.equal(isSearchQueryReady(" AB "), true);
});

test("only the latest search request may commit state", () => {
  const { isLatestSearchRequest } = loadSearchQuery();

  assert.equal(isLatestSearchRequest(4, 5), false);
  assert.equal(isLatestSearchRequest(5, 5), true);
});
