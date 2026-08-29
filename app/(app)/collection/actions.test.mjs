import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadActions({
  searchVinylAlbums = async () => [],
  getLibraryDiscogsReleaseIds = async () => ({ collection: new Set(), wishlist: new Set() }),
  getRelease = async (id) => ({ id }),
  addCollectionItem = async () => 1,
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
    if (id === "next/navigation") {
      return {
        redirect(path) {
          throw new Error(`unexpected redirect to ${path}`);
        },
      };
    }
    if (id === "@/lib/auth-session") {
      return { requireSession: async () => ({ user: { id: "user-1" } }) };
    }
    if (id === "@/lib/discogs/client") {
      return { searchVinylAlbums, getRelease, getMasterVersions: async () => [] };
    }
    if (id === "@/lib/discogs/mapRelease") {
      return { releaseInputFromDiscogs: (release) => release };
    }
    if (id === "@/lib/search/searchQuery") {
      return {
        isSearchQueryReady: (value) => value.length >= 2 && value.length <= 100,
        normalizeSearchQuery: (value) => value.trim().toLocaleLowerCase("en-US"),
      };
    }
    if (id === "@/lib/toast/flash") return { appendToast: (path) => path };
    if (id === "@/lib/services/collectionService") {
      return {
        upsertRelease: async (release) => release.id,
        addCollectionItem,
        getLibraryDiscogsReleaseIds,
        updateCollectionItem: async () => {},
        updateCollectionItemRelease: async () => {},
        removeCollectionItem: async () => {},
        getCollectionItem: async () => null,
      };
    }
    if (id === "@/lib/validation/collectionItem") {
      return {
        releaseFormSchema: { parse: (value) => value },
        collectionItemFormSchema: { parse: (value) => value },
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

test("Discogs search reports which visible releases are already in each list", async () => {
  const albums = [
    { releaseId: 10, title: "Arrival" },
    { releaseId: 20, title: "Voulez-Vous" },
  ];
  const actions = loadActions({
    searchVinylAlbums: async () => albums,
    getLibraryDiscogsReleaseIds: async () => ({
      collection: new Set([10]),
      wishlist: new Set([20]),
    }),
  });

  const result = await actions.searchDiscogsAction("  ABBA  ");

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    albums,
    library: { collection: [10], wishlist: [20] },
  });
});

test("multi-select add confirms in place and marks every selected release collected", async () => {
  const actions = loadActions();

  const result = await actions.addAlbumsFromDiscogsAction([10, 20]);

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { toast: "collection-added", inList: true },
  );
});

test("one-click add rejects invalid release ids before calling Discogs", async () => {
  let calls = 0;
  const actions = loadActions({
    getRelease: async () => {
      calls += 1;
      return { id: 10 };
    },
  });

  const result = await actions.addAlbumFromDiscogsAction(Number.NaN);

  assert.equal(calls, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { toast: "collection-add-failed", inList: false },
  );
});

test("multi-select add rejects oversized forged batches before calling Discogs", async () => {
  let calls = 0;
  const actions = loadActions({
    getRelease: async (id) => {
      calls += 1;
      return { id };
    },
  });

  const result = await actions.addAlbumsFromDiscogsAction(
    Array.from({ length: 51 }, (_, index) => index + 1),
  );

  assert.equal(calls, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { toast: "collection-add-failed", inList: false },
  );
});
