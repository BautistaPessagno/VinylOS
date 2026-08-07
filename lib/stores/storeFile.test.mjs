import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadStoreFile() {
  const filename = fileURLToPath(new URL("./storeFile.ts", import.meta.url));
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

test("storeFileSchema accepts a well-formed entry", () => {
  const { storeFileSchema } = loadStoreFile();
  const parsed = storeFileSchema.parse([
    {
      name: "Oui Oui Records",
      addressLine: "Soler 6090",
      neighborhood: "Palermo",
      city: "Ciudad Autónoma de Buenos Aires",
      province: "CABA",
      lat: -34.5769646,
      lng: -58.4376601,
      website: "http://www.ouioui-records.com/",
      osmId: "node/4944505488",
    },
  ]);
  assert.equal(parsed[0].name, "Oui Oui Records");
  assert.deepEqual(parsed[0].tags, []);
});

test("storeFileSchema rejects coordinates outside AMBA", () => {
  const { storeFileSchema } = loadStoreFile();
  // Swapped lat/lng is the realistic typo this guard exists to catch.
  assert.throws(() =>
    storeFileSchema.parse([
      {
        name: "Wrong Way",
        addressLine: "Soler 6090",
        neighborhood: "Palermo",
        city: "Ciudad Autónoma de Buenos Aires",
        province: "CABA",
        lat: -58.4376601,
        lng: -34.5769646,
      },
    ]),
  );
});

test("the real curated file parses", () => {
  const { storeFileSchema } = loadStoreFile();
  const raw = readFileSync(
    fileURLToPath(new URL("../../data/stores-amba.json", import.meta.url)),
    "utf8",
  );
  const entries = storeFileSchema.parse(JSON.parse(raw));
  assert.ok(entries.length > 0);
});

test("the real curated file has no duplicate osmIds", () => {
  const { storeFileSchema } = loadStoreFile();
  const raw = readFileSync(
    fileURLToPath(new URL("../../data/stores-amba.json", import.meta.url)),
    "utf8",
  );
  const ids = storeFileSchema
    .parse(JSON.parse(raw))
    .map((e) => e.osmId)
    .filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
});
