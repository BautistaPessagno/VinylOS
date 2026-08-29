import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const componentPath = fileURLToPath(new URL("./ExploreSearch.tsx", import.meta.url));
const actionsPath = fileURLToPath(new URL("./actions.ts", import.meta.url));

function loadSearchAction() {
  const source = readFileSync(actionsPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const localRequire = (id) => {
    if (id === "next/cache") return { revalidatePath() {} };
    if (id === "next/navigation") return { redirect() {} };
    if (id === "next/headers") return { cookies: async () => ({}) };
    if (id === "@/lib/auth-session") {
      return {
        getOptionalSession: async () => null,
        requireSession: async () => {
          throw new Error("session required");
        },
      };
    }
    if (id === "@/lib/services/collectionService") {
      return {
        addCollectionItem: async () => null,
        getLibraryAlbumKeys: async () => {
          throw new Error("guest library lookup");
        },
      };
    }
    if (id === "@/lib/services/albumKey") {
      return { albumMatchKey: (artist, title) => `${artist}::${title}` };
    }
    if (id === "@/lib/services/wishlistService") {
      return { addWishlistItem: async () => null };
    }
    if (id === "@/lib/discogs/client") {
      return {
        searchArtists: async () => [{ id: 1, name: "ABBA" }],
        searchVinylAlbums: async () => [
          {
            key: "m:1",
            releaseId: 10,
            artist: "ABBA",
            title: "Arrival",
            genres: ["Pop"],
            editionCount: 2,
          },
        ],
        searchVinylAlbumsByTrack: async () => [],
      };
    }
    if (id === "@/lib/search/searchQuery") {
      return {
        isSearchQueryReady: (value) => value.length >= 2,
        normalizeSearchQuery: (value) => value.trim().toLocaleLowerCase("en-US"),
      };
    }
    if (id === "@/lib/search/rankSearchResults") {
      return { findBestTrack: () => null };
    }
    if (id === "@/lib/toast/flash") return { appendToast: (path) => path };
    if (id === "@/lib/pendingExploreAction") {
      return {
        decodePendingExploreAction: () => null,
        encodePendingExploreAction: () => "token",
        PENDING_EXPLORE_ACTION_COOKIE: "pending",
        PENDING_EXPLORE_ACTION_MAX_AGE_SECONDS: 600,
      };
    }
    if (id === "@/lib/services/recommendationService") {
      return {
        generateRecommendations: async () => {},
        dismissRecommendation: async () => {},
        dismissRecommendationForRelease: async () => {},
        resolveReleaseFromNames: async () => null,
      };
    }
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename: actionsPath },
  );
  return mod.exports.searchExploreAction;
}

test("Explore search uses normalized cached latest-only requests", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /normalizeSearchQuery/);
  assert.match(source, /isSearchQueryReady/);
  assert.match(source, /isLatestSearchRequest/);
  assert.match(source, /resultCache\s*=\s*useRef/);
  assert.match(source, /pendingSearches\s*=\s*useRef/);
  assert.match(source, /latestSearchRequestId\s*=\s*useRef/);
  assert.match(source, /focusOnMount/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /searchErrorMessage\(caught\)/);
  assert.match(source, /Se encontraron \{result\.artists\.length\} artistas, \{result\.albums\.length\} discos/);
  assert.match(source, /\{result\.songs\.length\} canciones/);
});

test("Explore server action searches Discogs artists, vinyl, and tracks concurrently", () => {
  const source = readFileSync(actionsPath, "utf8");
  const action = source.slice(source.indexOf("export async function searchExploreAction"));

  assert.match(action, /normalizeSearchQuery/);
  assert.match(action, /isSearchQueryReady/);
  assert.match(action, /Promise\.all/);
  assert.match(action, /discogs\.searchArtists\(normalizedQuery\)/);
  assert.match(action, /discogs\.searchVinylAlbums\(normalizedQuery\)/);
  assert.match(action, /discogs\.searchVinylAlbumsByTrack\(normalizedQuery\)/);
  assert.match(action, /resolveSongResults\(normalizedQuery, trackAlbums\)/);
});

test("song resolution drops releases without a matching track", () => {
  const source = readFileSync(actionsPath, "utf8");

  assert.match(source, /async function resolveSongResults/);
  assert.match(source, /findBestTrack\(query, entry\.release\.tracklist \?\? \[\]\)/);
  assert.match(source, /MAX_SONG_RESULTS = 4/);
  // Individual tracklist fetch failures must not break the whole search.
  assert.match(source, /catch \{\s*return null;/);
});

test("Explore search returns public catalog results without a session", async () => {
  const searchExploreAction = loadSearchAction();

  const result = await searchExploreAction("  ABBA  ");

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    {
      query: "abba",
      artists: [{ id: 1, name: "ABBA" }],
      albums: [
        {
          key: "m:1",
          releaseId: 10,
          artist: "ABBA",
          title: "Arrival",
          genres: ["Pop"],
          editionCount: 2,
        },
      ],
      songs: [],
      library: { collection: [], wishlist: [] },
    },
  );
});
