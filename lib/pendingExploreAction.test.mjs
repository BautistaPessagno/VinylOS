import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadPendingExploreAction() {
  const filename = fileURLToPath(
    new URL("./pendingExploreAction.ts", import.meta.url),
  );
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require, Buffer, URL },
    { filename },
  );
  return mod.exports;
}

const SECRET = "test-secret-that-is-long-enough";
const NOW = 1_800_000_000_000;
const INPUT = {
  kind: "collection",
  artist: "Charly Garcia",
  album: "Clics Modernos",
  returnTo: "/explore?genre=rock&sort=artist",
};

test("signed Explore actions round-trip for ten minutes", () => {
  const { encodePendingExploreAction, decodePendingExploreAction } =
    loadPendingExploreAction();

  const token = encodePendingExploreAction(INPUT, SECRET, NOW);

  assert.deepEqual(
    { ...decodePendingExploreAction(token, SECRET, NOW + 599_999) },
    {
      version: 1,
      ...INPUT,
      expiresAt: NOW + 600_000,
    },
  );
});

test("tampered and expired Explore actions are rejected", () => {
  const { encodePendingExploreAction, decodePendingExploreAction } =
    loadPendingExploreAction();
  const token = encodePendingExploreAction(INPUT, SECRET, NOW);
  const last = token.at(-1);
  const tampered = `${token.slice(0, -1)}${last === "a" ? "b" : "a"}`;

  assert.equal(decodePendingExploreAction(tampered, SECRET, NOW), null);
  assert.equal(decodePendingExploreAction(token, SECRET, NOW + 600_000), null);
  assert.equal(decodePendingExploreAction(undefined, SECRET, NOW), null);
});

test("only collection or wishlist intents with an Explore return path can be signed", () => {
  const { encodePendingExploreAction } = loadPendingExploreAction();

  assert.throws(
    () => encodePendingExploreAction({ ...INPUT, kind: "delete" }, SECRET, NOW),
    /Invalid pending Explore action/,
  );
  assert.throws(
    () =>
      encodePendingExploreAction(
        { ...INPUT, returnTo: "https://example.com/explore" },
        SECRET,
        NOW,
      ),
    /Invalid pending Explore action/,
  );
  assert.throws(
    () =>
      encodePendingExploreAction(
        { ...INPUT, returnTo: "/explorer" },
        SECRET,
        NOW,
      ),
    /Invalid pending Explore action/,
  );
  assert.throws(
    () => encodePendingExploreAction({ ...INPUT, album: "" }, SECRET, NOW),
    /Invalid pending Explore action/,
  );
});
