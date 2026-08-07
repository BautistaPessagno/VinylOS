import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScript(url, localModules = {}) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const mod = { exports: {} };
  const localRequire = (id) => localModules[id] ?? require(id);

  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require: localRequire,
    },
    { filename },
  );

  return mod.exports;
}

function loadMatch() {
  const storeFile = loadTypeScript(new URL("./storeFile.ts", import.meta.url));
  const normalize = loadTypeScript(new URL("./normalize.ts", import.meta.url));
  return loadTypeScript(new URL("./match.ts", import.meta.url), {
    "./normalize": normalize,
    "./storeFile": storeFile,
  });
}

const OUI_OUI = {
  name: "Oui Oui Records",
  addressLine: "Soler 6090",
  neighborhood: "Palermo",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  lat: -34.5769646,
  lng: -58.4376601,
  osmId: "node/4944505488",
};
const BVM = {
  name: "BVM Records",
  addressLine: "Blanco Encalada 2300",
  neighborhood: "Belgrano",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  lat: -34.5620761,
  lng: -58.4577683,
  osmId: "node/5353274192",
};

test("haversineMeters measures the real BVM/Liverpool gap", () => {
  const { haversineMeters } = loadMatch();
  const d = haversineMeters(
    { lat: -34.5620761, lng: -58.4577683 },
    { lat: -34.5620046, lng: -58.4575964 },
  );
  assert.ok(d > 10 && d < 30, `expected ~18m, got ${d}`);
});

test("diceCoefficient scores identical and unrelated names", () => {
  const { diceCoefficient } = loadMatch();
  assert.equal(diceCoefficient("oui oui records", "oui oui records"), 1);
  assert.ok(diceCoefficient("bvm records", "liverpool discos") < 0.3);
  assert.ok(diceCoefficient("exile records", "exile record") > 0.8);
});

test("findExistingStore matches on osmId regardless of drift", () => {
  const { findExistingStore } = loadMatch();
  const hit = findExistingStore(
    { name: "Oui Oui", lat: -34.6, lng: -58.5, osmId: "node/4944505488" },
    [OUI_OUI],
  );
  assert.equal(hit?.name, "Oui Oui Records");
});

test("findExistingStore matches a nearby same-named shop with no osmId", () => {
  const { findExistingStore } = loadMatch();
  const hit = findExistingStore(
    { name: "Oui Oui Records", lat: -34.577, lng: -58.4377, osmId: null },
    [OUI_OUI],
  );
  assert.equal(hit?.name, "Oui Oui Records");
});

test("findExistingStore keeps two distinct shops 18m apart separate", () => {
  const { findExistingStore } = loadMatch();
  // Liverpool Discos is ~18m from BVM Records in the same Belgrano gallery.
  const hit = findExistingStore(
    {
      name: "Liverpool Discos",
      lat: -34.5620046,
      lng: -58.4575964,
      osmId: "node/5353274195",
    },
    [BVM],
  );
  assert.equal(hit, null);
});

test("findExistingStore does not match the same name far away", () => {
  const { findExistingStore } = loadMatch();
  const hit = findExistingStore(
    { name: "Oui Oui Records", lat: -34.6046, lng: -58.392, osmId: null },
    [OUI_OUI],
  );
  assert.equal(hit, null);
});
