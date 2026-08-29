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

const STORE = {
  slug: "oui-oui-records-palermo",
  name: "Oui Oui Records",
  addressLine: "Soler 6090",
  neighborhood: "Palermo",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  lat: -34.5769646,
  lng: -58.4376601,
  phone: "+541147735875",
  website: "http://www.ouioui-records.com/",
  instagram: null,
  openingHours: null,
  tags: ["usados", "nuevos"],
};

function loadDetail(store) {
  const notFoundCalls = [];
  const filename = fileURLToPath(new URL("./page.tsx", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const localRequire = (id) => {
    if (id === "react") {
      return {
        ...React,
        cache: (fn) => fn,
      };
    }
    if (id === "next/link") {
      // esModuleInterop: default import wraps the whole export as .default
      return function MockLink({ href, children, ...props }) {
        return React.createElement("a", { href, ...props }, children);
      };
    }
    if (id === "next/navigation") {
      return {
        notFound: () => {
          notFoundCalls.push(true);
          throw new Error("NEXT_NOT_FOUND");
        },
      };
    }
    if (id === "@/lib/services/storeService") {
      return {
        getStoreBySlug: async () => store,
      };
    }
    if (id === "../StoresMap") {
      return {
        StoresMap({ stores }) {
          return React.createElement(
            "div",
            { "data-stores-map": String(stores.length) },
            "Mapa",
          );
        },
      };
    }
    return require(id);
  };

  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire, React },
    { filename },
  );

  return {
    Page: mod.exports.default,
    generateMetadata: mod.exports.generateMetadata,
    notFoundCalls,
  };
}

test("renders the store with a maps link and contact details", async () => {
  const { Page } = loadDetail(STORE);
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ params: Promise.resolve({ slug: STORE.slug }) }),
  );

  assert.match(html, /Oui Oui Records/);
  assert.match(html, /Soler 6090/);
  assert.match(html, /maps\/search/);
  assert.match(html, /\+541147735875/);
});

test("generateMetadata titles the store for share cards", async () => {
  const { generateMetadata } = loadDetail(STORE);
  const meta = await generateMetadata({ params: Promise.resolve({ slug: STORE.slug }) });
  assert.match(meta.title, /Oui Oui Records/);
  assert.match(meta.description, /Palermo/);
});

test("an unknown slug calls notFound", async () => {
  const { Page, notFoundCalls } = loadDetail(null);
  await assert.rejects(() => Page({ params: Promise.resolve({ slug: "nope" }) }));
  assert.equal(notFoundCalls.length, 1);
});
