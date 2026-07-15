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

function transpile(url) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return { outputText, filename };
}

function loadModule({ outputText, filename }, localRequire) {
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename },
  );
  return mod.exports;
}

function loadResults() {
  const searchQuery = loadModule(
    transpile(new URL("../../../lib/search/searchQuery.ts", import.meta.url)),
    require,
  );
  const rankSearchResults = loadModule(
    transpile(new URL("../../../lib/search/rankSearchResults.ts", import.meta.url)),
    (id) => (id === "./searchQuery" ? searchQuery : require(id)),
  );

  const localRequire = (id) => {
    if (id === "next/link") {
      return function Link({ href, children, ...props }) {
        return React.createElement("a", { href, ...props }, children);
      };
    }
    if (id === "@/lib/search/rankSearchResults") {
      return rankSearchResults;
    }
    if (id === "./actions") {
      return { openExploreAlbumAction: "/mock-open-action" };
    }
    if (id === "./DiscoveryAlbumCard") {
      return {
        DiscoveryAlbumCard({ album }) {
          const label = album.containsTrack
            ? `Contains ${album.containsTrack}: ${album.title} — ${album.artist}`
            : `${album.title} — ${album.artist}`;
          return React.createElement("article", null, label);
        },
      };
    }
    return require(id);
  };

  return loadModule(
    transpile(new URL("./ExploreSearchResults.tsx", import.meta.url)),
    localRequire,
  ).ExploreSearchResults;
}

const returnTo = "/recommendations?tab=explore&focus=search";

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
        songs: [],
      },
      returnTo,
    }),
  );

  assert.match(html, />Top result</);
  assert.match(html, />Artists</);
  assert.match(html, />Records</);
  assert.match(html, /href="\/artist\/908651"/);
  assert.match(html, /Charly Garcia Tribute/);
  assert.match(html, /Clics Modernos/);
});

test("an exact album match outranks a partial artist as top result", () => {
  const ExploreSearchResults = loadResults();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ExploreSearchResults, {
      result: {
        query: "clics modernos",
        artists: [{ id: 908651, name: "Charly Garcia" }],
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
        songs: [],
      },
      returnTo,
    }),
  );

  // The album hero renders before the artist link.
  const heroIndex = html.indexOf("Record · Charly Garcia");
  const artistIndex = html.indexOf('href="/artist/908651"');
  assert.ok(heroIndex !== -1, "album hero card is rendered");
  assert.ok(artistIndex !== -1, "artist section still renders");
  assert.ok(heroIndex < artistIndex, "album hero comes before the artists section");
});

test("an exact song match leads as a 'contains' record and lists remaining records", () => {
  const ExploreSearchResults = loadResults();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ExploreSearchResults, {
      result: {
        query: "stairway to heaven",
        artists: [{ id: 1, name: "Led Zeppelin" }],
        albums: [],
        songs: [
          {
            key: "m:2",
            trackTitle: "Stairway To Heaven",
            artist: "Led Zeppelin",
            albumTitle: "Led Zeppelin IV",
            year: "1971",
          },
          {
            key: "m:3",
            trackTitle: "Stairway To Heaven (Live)",
            artist: "Led Zeppelin",
            albumTitle: "The Song Remains The Same",
          },
        ],
      },
      returnTo,
    }),
  );

  // Top result reframes the song hit as the record that contains it.
  assert.match(html, /Contains “Stairway To Heaven”/);
  assert.match(html, /Record · Led Zeppelin/);
  assert.match(html, /Records with this song/);
  // The hero record is excluded from the section; the second one appears with its badge.
  assert.match(html, /Contains Stairway To Heaven \(Live\): The Song Remains The Same/);
});

test("mixed search explains when Discogs finds nothing", () => {
  const ExploreSearchResults = loadResults();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ExploreSearchResults, {
      result: { query: "missing", artists: [], albums: [], songs: [] },
      returnTo,
    }),
  );

  assert.match(html, /No artists, records or songs found for “missing”/);
});
