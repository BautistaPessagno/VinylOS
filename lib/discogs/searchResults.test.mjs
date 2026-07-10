import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadSearchResults() {
  const filename = fileURLToPath(new URL("./searchResults.ts", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require,
    },
    { filename },
  );

  return mod.exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Discogs titles split into artist and record names", () => {
  const { splitDiscogsTitle } = loadSearchResults();

  assert.deepEqual(plain(splitDiscogsTitle("Charly García - Clics Modernos")), {
    artist: "Charly García",
    title: "Clics Modernos",
  });
  assert.deepEqual(plain(splitDiscogsTitle("Unknown title")), {
    artist: "Unknown artist",
    title: "Unknown title",
  });
});

test("vinyl editions group by master and preserve the first representative release", () => {
  const { groupDiscogsAlbums } = loadSearchResults();

  const grouped = groupDiscogsAlbums([
    {
      id: 10,
      type: "release",
      title: "Artist - Album",
      master_id: 7,
      year: "1983",
      cover_image: "cover.jpg",
      genre: ["Rock"],
    },
    {
      id: 11,
      type: "release",
      title: "Artist - Album",
      master_id: 7,
      year: "1984",
    },
    {
      id: 12,
      type: "release",
      title: "Artist - Standalone",
      master_id: null,
      cover_image: null,
      year: null,
    },
  ]);

  assert.deepEqual(plain(grouped), [
    {
      key: "m:7",
      masterId: 7,
      releaseId: 10,
      artist: "Artist",
      title: "Album",
      coverImage: "cover.jpg",
      year: "1983",
      genres: ["Rock"],
      editionCount: 2,
    },
    {
      key: "r:12",
      releaseId: 12,
      artist: "Artist",
      title: "Standalone",
      genres: [],
      editionCount: 1,
    },
  ]);
});

test("artist search results and album pages retain identity and pagination", () => {
  const { mapDiscogsArtists, toDiscogsAlbumPage } = loadSearchResults();
  const artists = mapDiscogsArtists([
    {
      id: 908651,
      type: "artist",
      title: "Charly Garcia",
      thumb: "thumb.jpg",
      cover_image: "cover.jpg",
    },
  ]);
  const page = toDiscogsAlbumPage(
    [{ id: 10, type: "release", title: "Charly Garcia - Piano Bar" }],
    { page: 2, pages: 4, per_page: 50, items: 175 },
  );

  assert.deepEqual(plain(artists), [
    {
      id: 908651,
      name: "Charly Garcia",
      imageUrl: "cover.jpg",
      thumbUrl: "thumb.jpg",
    },
  ]);
  assert.deepEqual(plain(page), {
    albums: [
      {
        key: "r:10",
        releaseId: 10,
        artist: "Charly Garcia",
        title: "Piano Bar",
        genres: [],
        editionCount: 1,
      },
    ],
    page: 2,
    pages: 4,
    totalItems: 175,
  });
});
