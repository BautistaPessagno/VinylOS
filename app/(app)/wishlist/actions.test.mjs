import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

/**
 * Loads the wishlist actions with the data layer and navigation stubbed, so the
 * in-place add can be exercised without a database. `redirect` throws here: leaving
 * the page is exactly what these actions must no longer do.
 */
function loadActions({ addWishlistItem }) {
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
    if (id === "@/lib/toast/flash") return { appendToast: (path) => path };
    if (id === "@/lib/discogs/client") return {};
    if (id === "@/lib/discogs/mapRelease") return { releaseInputFromDiscogs: (x) => x };
    if (id === "@/lib/services/collectionService") {
      return { upsertRelease: async () => 1, addCollectionItem: async () => 1 };
    }
    if (id === "@/lib/services/wishlistService") {
      return { addWishlistItem, removeWishlistItem: async () => {} };
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

function wishlistForm(releaseId) {
  const formData = new FormData();
  formData.set("releaseId", String(releaseId));
  return formData;
}

test("wishlisting a record confirms in place instead of navigating away", async () => {
  const { addReleaseToWishlistAction } = loadActions({
    addWishlistItem: async () => 42,
  });

  const result = await addReleaseToWishlistAction(null, wishlistForm(10));

  assert.deepEqual({ ...result }, { toast: "wishlist-added", inList: true });
});

test("a record already on the wishlist says so rather than claiming a new add", async () => {
  // The insert is a no-op on conflict and returns no id.
  const { addReleaseToWishlistAction } = loadActions({
    addWishlistItem: async () => null,
  });

  const result = await addReleaseToWishlistAction(null, wishlistForm(10));

  assert.deepEqual({ ...result }, { toast: "wishlist-already", inList: true });
});

test("a failed wishlist add leaves the button offering the action again", async () => {
  const { addReleaseToWishlistAction } = loadActions({
    addWishlistItem: async () => {
      throw new Error("connection lost");
    },
  });

  const result = await addReleaseToWishlistAction(null, wishlistForm(10));

  assert.deepEqual({ ...result }, { toast: "wishlist-add-failed", inList: false });
});

test("wishlisting rejects invalid release ids before touching the database", async () => {
  let calls = 0;
  const { addReleaseToWishlistAction } = loadActions({
    addWishlistItem: async () => {
      calls += 1;
      return 42;
    },
  });

  const result = await addReleaseToWishlistAction(null, wishlistForm("not-a-number"));

  assert.equal(calls, 0);
  assert.deepEqual({ ...result }, { toast: "wishlist-add-failed", inList: false });
});
