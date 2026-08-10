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
      target: ts.ScriptTarget.ES2022,
    },
  });
  return { filename, outputText };
}

function loadModule({ filename, outputText }, localRequire) {
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire, URLSearchParams },
    { filename },
  );
  return mod.exports;
}

function loadExploreTab({ libraryKeys, throwOnLibraryLookup = false }) {
  const exploreSort = loadModule(
    transpile(new URL("../../../lib/services/exploreSort.ts", import.meta.url)),
    require,
  );
  const localRequire = (id) => {
    if (id === "next/link") {
      return function Link({ href, children, ...props }) {
        return React.createElement("a", { href, ...props }, children);
      };
    }
    if (id === "@/lib/services/exploreService") {
      return {
        listExploreGenres: () => ["rock"],
        genreLabel: (genre) => genre,
        listExploreAlbums: async () => [
          { artist: "Charly Garcia", album: "Clics Modernos", imageUrl: "" },
        ],
      };
    }
    if (id === "@/lib/services/catalogService") {
      return { getReleaseIdsByAlbumKey: async () => new Map() };
    }
    if (id === "@/lib/services/collectionService") {
      return {
        albumMatchKey: (artist, album) => `${artist}::${album}`,
        getLibraryAlbumKeys: async () => {
          if (throwOnLibraryLookup) throw new Error("guest library lookup");
          return libraryKeys;
        },
      };
    }
    if (id === "@/lib/services/exploreSort") return exploreSort;
    if (id === "./ExploreSearch") {
      return {
        ExploreSearch({ children }) {
          return React.createElement("section", null, children);
        },
      };
    }
    if (id === "./DiscoveryAlbumCard") {
      return {
        DiscoveryAlbumCard({ album }) {
          return React.createElement("article", null, album.title);
        },
      };
    }
    return require(id);
  };
  return loadModule(transpile(new URL("./ExploreTab.tsx", import.meta.url)), localRequire)
    .ExploreTab;
}

test("guest Explore renders the full chart without loading a user library", async () => {
  const ExploreTab = loadExploreTab({
    libraryKeys: new Set(),
    throwOnLibraryLookup: true,
  });
  const element = await ExploreTab({ focusSearch: false });
  const html = ReactDOMServer.renderToStaticMarkup(element);

  assert.match(html, /Clics Modernos/);
  assert.match(html, /href="\/explore\?genre=rock"/);
});

test("member Explore hides albums already in the member library", async () => {
  const ExploreTab = loadExploreTab({
    libraryKeys: new Set(["Charly Garcia::Clics Modernos"]),
  });
  const element = await ExploreTab({ userId: "user-1", focusSearch: false });
  const html = ReactDOMServer.renderToStaticMarkup(element);

  assert.doesNotMatch(html, /Clics Modernos/);
});
