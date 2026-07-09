import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadCollectionFilterOptions() {
  const filename = fileURLToPath(new URL("./collectionFilterOptions.ts", import.meta.url));
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

test("buildCollectionFilterOptions derives sorted distinct values from owned releases", () => {
  const { buildCollectionFilterOptions } = loadCollectionFilterOptions();

  const options = buildCollectionFilterOptions([
    {
      genres: ["Jazz", "Soul", ""],
      year: 1959,
      labelName: "Columbia",
    },
    {
      genres: ["jazz", "Ambient"],
      year: 1971,
      labelName: "  Blue Note  ",
    },
    {
      genres: null,
      year: null,
      labelName: "",
    },
    {
      genres: ["Soul"],
      year: 2024,
      labelName: "Columbia",
    },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(options)), {
    genres: ["Ambient", "Jazz", "jazz", "Soul"],
    labels: ["Blue Note", "Columbia"],
    years: [2024, 1971, 1959],
  });
});
