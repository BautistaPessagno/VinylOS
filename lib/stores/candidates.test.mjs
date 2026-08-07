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

function loadCandidates() {
  const normalize = loadTypeScript(new URL("./normalize.ts", import.meta.url));
  const storeFile = loadTypeScript(new URL("./storeFile.ts", import.meta.url));
  const match = loadTypeScript(new URL("./match.ts", import.meta.url), {
    "./normalize": normalize,
    "./storeFile": storeFile,
  });
  return loadTypeScript(new URL("./candidates.ts", import.meta.url), {
    "./match": match,
    "./normalize": normalize,
    "./overpass": {},
    "./storeFile": storeFile,
  });
}

const CURATED = [
  {
    name: "Oui Oui Records",
    addressLine: "Soler 6090",
    neighborhood: "Palermo",
    city: "Ciudad Autónoma de Buenos Aires",
    province: "CABA",
    lat: -34.5769646,
    lng: -58.4376601,
    tags: [],
    osmId: "node/4944505488",
  },
];

const RAW = [
  {
    osmId: "node/4944505488",
    name: "Oui Oui Records",
    lat: -34.5769646,
    lng: -58.4376601,
    street: "Soler",
    houseNumber: "6090",
    suburb: "Palermo",
    city: null,
    postcode: null,
    phone: "+54 11 4773-5875",
    website: null,
    openingHours: null,
  },
  {
    osmId: "node/5353274195",
    name: "Liverpool Discos",
    lat: -34.5620046,
    lng: -58.4575964,
    street: null,
    houseNumber: null,
    suburb: null,
    city: null,
    postcode: null,
    phone: null,
    website: null,
    openingHours: null,
  },
  {
    osmId: "node/5307657985",
    name: "Magical Mystery Records",
    lat: -34.5590483,
    lng: -58.4586381,
    street: "Blanco Encalada",
    houseNumber: "2370",
    suburb: "Belgrano",
    city: null,
    postcode: null,
    phone: null,
    website: null,
    openingHours: null,
  },
];

const PROBED = [
  // Overlaps the shop=music query — must not be duplicated.
  RAW[2],
  // A genuine record shop mistagged shop=electronics. This is why the probe exists.
  {
    osmId: "node/9999000001",
    name: "Pappo Records",
    lat: -34.61,
    lng: -58.42,
    street: null,
    houseNumber: null,
    suburb: null,
    city: null,
    postcode: null,
    phone: null,
    website: null,
    openingHours: null,
  },
];

test("buildCandidateList omits shops already in the curated file", () => {
  const { buildCandidateList } = loadCandidates();
  // Array.from: results come from a vm context whose Array is not the host Array.
  const candidates = Array.from(buildCandidateList(RAW, [], CURATED));
  assert.deepEqual(
    candidates.map((c) => c.osmId).sort(),
    ["node/5307657985", "node/5353274195"],
  );
});

test("buildCandidateList composes an address only when street and number exist", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, [], CURATED);

  const magical = candidates.find((c) => c.osmId === "node/5307657985");
  assert.equal(magical.suggestedAddress, "Blanco Encalada 2370");
  assert.equal(magical.hasFullAddress, true);

  const liverpool = candidates.find((c) => c.osmId === "node/5353274195");
  assert.equal(liverpool.suggestedAddress, null);
  assert.equal(liverpool.hasFullAddress, false);
});

test("buildCandidateList sorts complete addresses first", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, [], CURATED);
  assert.equal(candidates[0].osmId, "node/5307657985");
});

test("buildCandidateList adds probe-only hits as low-confidence, without duplicating", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, PROBED, CURATED);

  // Magical Mystery appears in both queries but only once in the output.
  assert.equal(candidates.filter((c) => c.osmId === "node/5307657985").length, 1);

  const pappo = candidates.find((c) => c.osmId === "node/9999000001");
  assert.equal(pappo.lowConfidence, true);
  // Low-confidence hits sort last, behind even the addressless tagged shops.
  assert.equal(candidates.at(-1).osmId, "node/9999000001");
});
