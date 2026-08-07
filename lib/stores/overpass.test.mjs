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
      process,
    },
    { filename },
  );

  return mod.exports;
}

function loadOverpass() {
  const storeFile = loadTypeScript(new URL("./storeFile.ts", import.meta.url));
  return loadTypeScript(new URL("./overpass.ts", import.meta.url), {
    "./storeFile": storeFile,
  });
}

test("buildMusicShopQuery targets shop=music over the bbox", () => {
  const { buildMusicShopQuery } = loadOverpass();
  const query = buildMusicShopQuery({
    south: -34.95,
    west: -58.9,
    north: -34.32,
    east: -58.15,
  });
  assert.match(query, /\[out:json\]/);
  assert.match(query, /node\["shop"="music"\]\(-34\.95,-58\.9,-34\.32,-58\.15\);/);
  assert.match(query, /way\["shop"="music"\]\(-34\.95,-58\.9,-34\.32,-58\.15\);/);
  assert.match(query, /out tags center;/);
});

test("buildNameProbeQuery matches record-shop names across all shop types", () => {
  const { buildNameProbeQuery } = loadOverpass();
  const query = buildNameProbeQuery({
    south: -34.95,
    west: -58.9,
    north: -34.32,
    east: -58.15,
  });
  assert.match(query, /nwr\["shop"\]\["name"~"disco\|disquer\|vinil\|vinyl\|record",i\]/);
  assert.doesNotMatch(query, /"shop"="music"/);
});

test("toRawStores maps nodes and ways and drops unnamed elements", () => {
  const { toRawStores } = loadOverpass();
  const fixture = JSON.parse(
    readFileSync(fileURLToPath(new URL("./fixtures/overpass-amba.json", import.meta.url)), "utf8"),
  );
  const stores = toRawStores(fixture);

  // The unnamed node is dropped; the other three survive.
  assert.equal(stores.length, 3);

  const ouiOui = stores.find((s) => s.osmId === "node/4944505488");
  // Spread: object comes from a vm context and fails deepEqual across realms.
  assert.deepEqual({ ...ouiOui }, {
    osmId: "node/4944505488",
    name: "Oui Oui Records",
    lat: -34.5769646,
    lng: -58.4376601,
    street: "Soler",
    houseNumber: "6090",
    suburb: "Palermo",
    city: "Ciudad Autónoma de Buenos Aires",
    postcode: "1425",
    phone: "+54 11 4773-5875",
    website: "http://www.ouioui-records.com/",
    openingHours: null,
  });

  // A way carries `center` instead of lat/lon.
  const zivals = stores.find((s) => s.osmId === "way/473162796");
  assert.equal(zivals.lat, -34.6046054);
  assert.equal(zivals.lng, -58.3920697);
});
