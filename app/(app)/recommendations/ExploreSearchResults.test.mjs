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

function loadResults() {
  const filename = fileURLToPath(new URL("./ExploreSearchResults.tsx", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const mod = { exports: {} };
  const localRequire = (id) => {
    if (id === "next/link") {
      return function Link({ href, children, ...props }) {
        return React.createElement("a", { href, ...props }, children);
      };
    }
    if (id === "./DiscoveryAlbumCard") {
      return {
        DiscoveryAlbumCard({ album }) {
          return React.createElement("article", null, `${album.title} — ${album.artist}`);
        },
      };
    }
    return require(id);
  };

  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename },
  );
  return mod.exports.ExploreSearchResults;
}

test("mixed search renders top result, artists, and records", () => {
  const ExploreSearchResults = loadResults();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ExploreSearchResults, {
      result: {
        query: "charly garcia",
        artists: [
          { id: 908651, name: "Charly Garcia", imageUrl: "charly.jpg" },
          { id: 100, name: "Charly Garcia Tribute" },
        ],
        albums: [
          {
            key: "m:1",
            releaseId: 10,
            artist: "Charly Garcia",
            title: "Clics Modernos",
            genres: ["Rock"],
            editionCount: 3,
          },
        ],
      },
      returnTo: "/recommendations?tab=explore&focus=search",
    }),
  );

  assert.match(html, />Top result</);
  assert.match(html, />Artists</);
  assert.match(html, />Records</);
  assert.match(html, /href="\/artist\/908651"/);
  assert.match(html, /Charly Garcia Tribute/);
  assert.match(html, /Clics Modernos/);
});

test("mixed search explains when Discogs finds nothing", () => {
  const ExploreSearchResults = loadResults();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ExploreSearchResults, {
      result: { query: "missing", artists: [], albums: [] },
      returnTo: "/recommendations?tab=explore&focus=search",
    }),
  );

  assert.match(html, /No artists or records found for “missing”/);
});
