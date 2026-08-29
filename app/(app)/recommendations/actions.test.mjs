import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadActions({
  addCollectionItem = async () => 1,
  dismissRecommendationForRelease = async () => {},
  resolveReleaseFromNames = async () => 10,
} = {}) {
  const filename = fileURLToPath(new URL("./actions.ts", import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
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
        requireSession: async () => ({ user: { id: "user-1" } }),
      };
    }
    if (id === "@/lib/services/collectionService") {
      return {
        addCollectionItem,
        getLibraryAlbumKeys: async () => ({
          collection: new Set(),
          wishlist: new Set(),
        }),
      };
    }
    if (id === "@/lib/services/albumKey") {
      return { albumMatchKey: (artist, title) => `${artist}::${title}` };
    }
    if (id === "@/lib/services/wishlistService") {
      return { addWishlistItem: async () => 1 };
    }
    if (id === "@/lib/discogs/client") return {};
    if (id === "@/lib/search/searchQuery") {
      return {
        isSearchQueryReady: () => false,
        normalizeSearchQuery: (value) => value,
      };
    }
    if (id === "@/lib/search/rankSearchResults") return { findBestTrack: () => null };
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
        dismissRecommendationForRelease,
        resolveReleaseFromNames,
      };
    }
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire, FormData },
    { filename },
  );
  return mod.exports;
}

function form(values) {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

test("a successful collection add stays successful if recommendation cleanup fails", async () => {
  const actions = loadActions({
    dismissRecommendationForRelease: async () => {
      throw new Error("cleanup failed");
    },
  });

  const result = await actions.addRecommendationToCollectionAction(
    null,
    form({ releaseId: "10" }),
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { toast: "collection-added", inList: true },
  );
});

test("Explore add rejects blank album identity before resolving a release", async () => {
  let calls = 0;
  const actions = loadActions({
    resolveReleaseFromNames: async () => {
      calls += 1;
      return 10;
    },
  });

  const result = await actions.addExploreAlbumAction(
    null,
    form({ artist: "   ", album: "Arrival" }),
  );

  assert.equal(calls, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { toast: "collection-add-failed", inList: false },
  );
});
