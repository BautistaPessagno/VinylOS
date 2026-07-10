import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScript(url, localModules = {}, globals = {}) {
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
      URL,
      process,
      ...globals,
    },
    { filename },
  );

  return mod.exports;
}

function loadDiscogsClient(fetch) {
  const types = loadTypeScript(new URL("./types.ts", import.meta.url));
  const searchResults = loadTypeScript(new URL("./searchResults.ts", import.meta.url));
  const searchQuery = loadTypeScript(new URL("../search/searchQuery.ts", import.meta.url));

  return loadTypeScript(
    new URL("./client.ts", import.meta.url),
    {
      "./types": types,
      "./searchResults": searchResults,
      "@/lib/search/searchQuery": searchQuery,
    },
    { fetch },
  );
}

function response(data) {
  return {
    ok: true,
    status: 200,
    async json() {
      return data;
    },
    async text() {
      return JSON.stringify(data);
    },
  };
}

test("Discogs client normalizes artist search and maps artist identity", async () => {
  const requests = [];
  const client = loadDiscogsClient(async (url) => {
    requests.push(url);
    if (url.pathname.startsWith("/artists/")) {
      return response({
        id: 908651,
        name: "Charly Garcia",
        profile: "Argentine musician",
        images: [{ type: "primary", uri: "artist.jpg" }],
      });
    }
    return response({
      pagination: { page: 1, pages: 1, per_page: 8, items: 1 },
      results: [
        {
          id: 908651,
          type: "artist",
          title: "Charly Garcia",
          cover_image: "artist.jpg",
          master_id: null,
          master_url: null,
        },
      ],
    });
  });

  const artists = await client.searchArtists("  CHARLY   Garcia ");
  const artist = await client.getArtist(908651);

  assert.equal(requests[0].searchParams.get("q"), "charly garcia");
  assert.equal(requests[0].searchParams.get("type"), "artist");
  assert.equal(artists[0].id, 908651);
  assert.equal(artists[0].name, "Charly Garcia");
  assert.equal(artist.profile, "Argentine musician");
});

test("Discogs client requests an exact artist vinyl catalog page", async () => {
  let requestedUrl;
  const client = loadDiscogsClient(async (url) => {
    requestedUrl = url;
    return response({
      pagination: { page: 2, pages: 3, per_page: 50, items: 120 },
      results: [
        { id: 10, type: "release", title: "Charly Garcia - Piano Bar", master_id: 4 },
      ],
    });
  });

  const page = await client.searchArtistVinylAlbums("Charly Garcia", 2);

  assert.equal(requestedUrl.searchParams.get("artist"), "charly garcia");
  assert.equal(requestedUrl.searchParams.get("format"), "Vinyl");
  assert.equal(requestedUrl.searchParams.get("type"), "release");
  assert.equal(requestedUrl.searchParams.get("page"), "2");
  assert.equal(page.page, 2);
  assert.equal(page.pages, 3);
  assert.equal(page.albums[0].releaseId, 10);
});
