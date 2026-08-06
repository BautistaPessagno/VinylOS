import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const SECRET = "test-secret-that-is-long-enough";
const COOKIE_NAME = "vinylos.pending-explore-action";

class RedirectSignal extends Error {
  constructor(path) {
    super(`redirect:${path}`);
    this.path = path;
  }
}

function transpile(url) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return { filename, outputText };
}

function loadModule({ filename, outputText }, localRequire, context = {}) {
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require: localRequire,
      Buffer,
      URL,
      ...context,
    },
    { filename },
  );
  return mod.exports;
}

function loadPendingExploreAction() {
  return loadModule(
    transpile(new URL("../../../lib/pendingExploreAction.ts", import.meta.url)),
    require,
  );
}

function loadActions({
  initialToken,
  resolveError,
  session = { user: { id: "user-1" } },
} = {}) {
  const pending = loadPendingExploreAction();
  const state = {
    token: initialToken,
    setOptions: null,
    redirects: [],
    events: [],
  };
  const cookieStore = {
    get(name) {
      return name === COOKIE_NAME && state.token
        ? { name, value: state.token }
        : undefined;
    },
    set(name, value, options) {
      if (name === COOKIE_NAME) state.token = value;
      state.setOptions = options;
    },
    delete(name) {
      state.events.push(`delete:${name}`);
      if (name === COOKIE_NAME) state.token = undefined;
    },
  };
  const localRequire = (id) => {
    if (id === "next/cache") {
      return { revalidatePath: (path) => state.events.push(`revalidate:${path}`) };
    }
    if (id === "next/navigation") {
      return {
        redirect(path) {
          state.redirects.push(path);
          throw new RedirectSignal(path);
        },
      };
    }
    if (id === "next/headers") return { cookies: async () => cookieStore };
    if (id === "@/lib/auth-session") {
      return {
        requireSession: async () => {
          if (!session) throw new Error("Unauthorized");
          return session;
        },
      };
    }
    if (id === "@/lib/services/collectionService") {
      return {
        addCollectionItem: async (userId, releaseId) => {
          state.events.push(`collection:${userId}:${releaseId}`);
          return 1;
        },
      };
    }
    if (id === "@/lib/services/wishlistService") {
      return {
        addWishlistItem: async (userId, releaseId) => {
          state.events.push(`wishlist:${userId}:${releaseId}`);
          return 1;
        },
      };
    }
    if (id === "@/lib/discogs/client") {
      return {
        searchArtists: async () => [],
        searchVinylAlbums: async () => [],
        searchVinylAlbumsByTrack: async () => [],
      };
    }
    if (id === "@/lib/search/searchQuery") {
      return {
        isSearchQueryReady: () => false,
        normalizeSearchQuery: (value) => value,
      };
    }
    if (id === "@/lib/search/rankSearchResults") {
      return { findBestTrack: () => null };
    }
    if (id === "@/lib/toast/flash") {
      return {
        appendToast(path, code) {
          return `${path}${path.includes("?") ? "&" : "?"}toast=${code}`;
        },
      };
    }
    if (id === "@/lib/services/recommendationService") {
      return {
        generateRecommendations: async () => {},
        dismissRecommendation: async () => {},
        dismissRecommendationForRelease: async () => {},
        resolveReleaseFromNames: async (artist, album) => {
          state.events.push(`resolve:${artist}:${album}`);
          if (resolveError) throw resolveError;
          return 42;
        },
      };
    }
    if (id === "@/lib/pendingExploreAction") return pending;
    return require(id);
  };
  const actions = loadModule(
    transpile(new URL("./actions.ts", import.meta.url)),
    localRequire,
    { process: { env: { BETTER_AUTH_SECRET: SECRET, NODE_ENV: "test" } } },
  );
  return { actions, pending, state };
}

function pendingToken(kind) {
  const pending = loadPendingExploreAction();
  return pending.encodePendingExploreAction(
    {
      kind,
      artist: "Charly Garcia",
      album: "Clics Modernos",
      returnTo: "/explore?genre=rock",
    },
    SECRET,
  );
}

test("guest Explore actions create a secure short-lived login handoff", async () => {
  const { actions, pending, state } = loadActions();
  const formData = new FormData();
  formData.set("kind", "collection");
  formData.set("artist", "Charly Garcia");
  formData.set("album", "Clics Modernos");
  formData.set("returnTo", "/explore?genre=rock");

  await assert.rejects(
    actions.beginExploreAuthAction(formData),
    (error) =>
      error instanceof RedirectSignal &&
      error.path === "/login?next=%2Fauth%2Fcomplete-explore-action",
  );

  assert.deepEqual(
    { ...pending.decodePendingExploreAction(state.token, SECRET) },
    {
      version: 1,
      kind: "collection",
      artist: "Charly Garcia",
      album: "Clics Modernos",
      returnTo: "/explore?genre=rock",
      expiresAt: pending.decodePendingExploreAction(state.token, SECRET).expiresAt,
    },
  );
  assert.deepEqual(
    { ...state.setOptions },
    {
      httpOnly: true,
      maxAge: 600,
      path: "/",
      sameSite: "lax",
      secure: false,
    },
  );
});

test("collection completion consumes the intent before adding the record", async () => {
  const { actions, state } = loadActions({ initialToken: pendingToken("collection") });

  await assert.rejects(
    actions.completePendingExploreAction(),
    (error) =>
      error instanceof RedirectSignal &&
      error.path === "/explore?genre=rock&toast=collection-added",
  );

  assert.deepEqual(state.events.slice(0, 3), [
    `delete:${COOKIE_NAME}`,
    "resolve:Charly Garcia:Clics Modernos",
    "collection:user-1:42",
  ]);
  assert.equal(state.token, undefined);
});

test("wishlist completion adds the record to the authenticated wishlist", async () => {
  const { actions, state } = loadActions({ initialToken: pendingToken("wishlist") });

  await assert.rejects(
    actions.completePendingExploreAction(),
    (error) =>
      error instanceof RedirectSignal &&
      error.path === "/explore?genre=rock&toast=wishlist-added",
  );

  assert.ok(state.events.includes("wishlist:user-1:42"));
  assert.ok(!state.events.some((event) => event.startsWith("collection:")));
});

test("invalid pending intents expire without resolving or mutating a record", async () => {
  const { actions, state } = loadActions({ initialToken: "tampered.intent" });

  await assert.rejects(
    actions.completePendingExploreAction(),
    (error) =>
      error instanceof RedirectSignal &&
      error.path === "/explore?toast=pending-action-expired",
  );

  assert.deepEqual(state.events, [`delete:${COOKIE_NAME}`]);
});

test("pending completion handles release lookup failures after consuming the intent", async () => {
  const { actions, state } = loadActions({
    initialToken: pendingToken("collection"),
    resolveError: new Error("Discogs unavailable"),
  });

  await assert.rejects(
    actions.completePendingExploreAction(),
    (error) =>
      error instanceof RedirectSignal &&
      error.path === "/explore?genre=rock&toast=action-failed",
  );

  assert.deepEqual(state.events, [
    `delete:${COOKIE_NAME}`,
    "resolve:Charly Garcia:Clics Modernos",
  ]);
  assert.equal(state.token, undefined);
});

test("pending completion still requires a real session", async () => {
  const token = pendingToken("collection");
  const { actions, state } = loadActions({
    initialToken: token,
    session: null,
  });

  await assert.rejects(actions.completePendingExploreAction(), /Unauthorized/);
  assert.equal(state.token, token);
  assert.deepEqual(state.events, []);
});
