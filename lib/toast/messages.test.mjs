import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadMessages() {
  const filename = fileURLToPath(new URL("./messages.ts", import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require },
    { filename },
  );
  // Round-tripped out of the vm realm, whose Object prototype would fail deepEqual.
  return JSON.parse(JSON.stringify(mod.exports.TOAST_MESSAGES));
}

test("every add confirmation offers the way to the list it landed in", () => {
  const TOAST_MESSAGES = loadMessages();

  for (const code of ["collection-added", "collection-already", "moved-to-collection"]) {
    assert.deepEqual(
      TOAST_MESSAGES[code].action,
      { href: "/collection", label: "Ver colección" },
      `${code} should link to the collection`,
    );
  }
  for (const code of ["wishlist-added", "wishlist-already"]) {
    assert.deepEqual(
      TOAST_MESSAGES[code].action,
      { href: "/wishlist", label: "Ver lista de deseos" },
      `${code} should link to the wishlist`,
    );
  }
});

test("failures and removals leave the user nowhere to be sent", () => {
  const TOAST_MESSAGES = loadMessages();

  for (const code of [
    "collection-add-failed",
    "wishlist-add-failed",
    "wishlist-removed",
    "item-removed",
    "not-found",
    "action-failed",
  ]) {
    assert.equal(TOAST_MESSAGES[code].action, undefined, `${code} should carry no link`);
  }
});

test("a record already in a list gets its own message, not the added one", () => {
  const TOAST_MESSAGES = loadMessages();

  assert.notEqual(
    TOAST_MESSAGES["collection-already"].message,
    TOAST_MESSAGES["collection-added"].message,
  );
  assert.notEqual(
    TOAST_MESSAGES["wishlist-already"].message,
    TOAST_MESSAGES["wishlist-added"].message,
  );
});
