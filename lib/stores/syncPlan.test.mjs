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

function loadSyncPlan() {
  const normalize = loadTypeScript(new URL("./normalize.ts", import.meta.url));
  const storeFile = loadTypeScript(new URL("./storeFile.ts", import.meta.url));
  return loadTypeScript(new URL("./syncPlan.ts", import.meta.url), {
    "./normalize": normalize,
    "./storeFile": storeFile,
  });
}

const ENTRY = {
  name: "Oui Oui Records",
  addressLine: "Soler 6090",
  neighborhood: "Palermo",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  postalCode: "1425",
  lat: -34.5769646,
  lng: -58.4376601,
  phone: "+54 11 4773-5875",
  website: "http://www.ouioui-records.com/",
  instagram: null,
  email: null,
  openingHours: null,
  tags: ["usados"],
  osmId: "node/4944505488",
};

test("toStoreRows assigns slugs and normalizes contact fields", () => {
  const { toStoreRows } = loadSyncPlan();
  const [row] = toStoreRows([ENTRY]);
  assert.equal(row.slug, "oui-oui-records-palermo");
  assert.equal(row.phone, "+541147735875");
  assert.deepEqual(row.tags, ["usados"]);
});

test("toStoreRows disambiguates two shops with the same name and neighbourhood", () => {
  const { toStoreRows } = loadSyncPlan();
  const rows = toStoreRows([ENTRY, { ...ENTRY, addressLine: "Soler 6100" }]);
  assert.deepEqual(rows.map((r) => r.slug), [
    "oui-oui-records-palermo",
    "oui-oui-records-palermo-2",
  ]);
});

test("buildSyncPlan inserts unknown slugs", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const plan = buildSyncPlan(rows, []);
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.updates.length, 0);
  assert.deepEqual(plan.deactivations, []);
});

test("buildSyncPlan reports nothing when data is unchanged", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  // Array.from: vm-context arrays fail deepEqual against host [] without copying.
  const rows = Array.from(toStoreRows([ENTRY]));
  const plan = buildSyncPlan(rows, rows.map((r) => ({ ...r, active: true })));
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.deactivations.length, 0);
});

test("buildSyncPlan updates a changed field and reactivates a dormant row", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const existing = rows.map((r) => ({ ...r, addressLine: "Soler 6000", active: false }));
  const plan = buildSyncPlan(rows, existing);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].addressLine, "Soler 6090");
});

test("buildSyncPlan deactivates active rows dropped from the file", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const existing = [
    ...rows.map((r) => ({ ...r, active: true })),
    { ...rows[0], slug: "closed-shop-belgrano", active: true },
  ];
  const plan = buildSyncPlan(rows, existing);
  assert.deepEqual(plan.deactivations, ["closed-shop-belgrano"]);
});
