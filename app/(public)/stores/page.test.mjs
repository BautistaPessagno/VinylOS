import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const ts = require("typescript");

const STORES = [
  {
    slug: "oui-oui-records-palermo",
    name: "Oui Oui Records",
    addressLine: "Soler 6090",
    neighborhood: "Palermo",
    city: "Ciudad Autónoma de Buenos Aires",
    province: "CABA",
    lat: -34.5769646,
    lng: -58.4376601,
    phone: null,
    website: null,
    instagram: null,
    openingHours: null,
    tags: ["usados"],
  },
];

function loadTypeScript(url, localModules = {}) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  const localRequire = (id) => localModules[id] ?? require(id);
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire, React },
    { filename },
  );
  return mod.exports;
}

// esModuleInterop default import expects the module itself (or { __esModule, default }).
function MockLink({ href, children, ...props }) {
  return React.createElement("a", { href, ...props }, children);
}

function loadPage({ stores, neighborhoods }) {
  const storeService = {
    listStores: async () => stores,
    listNeighborhoods: async () => neighborhoods,
  };
  const storeCardMod = loadTypeScript(new URL("./StoreCard.tsx", import.meta.url), {
    "next/link": MockLink,
    "@/lib/services/storeService": storeService,
  });

  return loadTypeScript(new URL("./page.tsx", import.meta.url), {
    "next/link": MockLink,
    "@/lib/services/storeService": storeService,
    "./StoreCard": storeCardMod,
    // Client map is a no-op in SSR tests; assert via data attribute.
    "./StoresMap": {
      StoresMap({ stores }) {
        return React.createElement(
          "div",
          { "data-stores-map": String(stores.length), role: "region" },
          "Mapa",
        );
      },
    },
  }).default;
}

test("guests see the store list with OSM attribution", async () => {
  const Page = loadPage({ stores: STORES, neighborhoods: ["Palermo"] });
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({}) }),
  );

  assert.match(html, /Oui Oui Records/);
  assert.match(html, /Soler 6090/);
  assert.match(html, /OpenStreetMap/);
  assert.match(html, /openstreetmap\.org\/copyright/);
  assert.match(html, /data-stores-map="1"/);
  assert.match(html, /OpenFreeMap/);
});

test("a store with no hours renders without an empty hours row", async () => {
  const Page = loadPage({ stores: STORES, neighborhoods: ["Palermo"] });
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({}) }),
  );
  assert.doesNotMatch(html, /Horarios/);
});

test("the empty state explains how to suggest a shop", async () => {
  const Page = loadPage({ stores: [], neighborhoods: [] });
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({ q: "nada" }) }),
  );
  assert.match(html, /No encontramos/);
});
