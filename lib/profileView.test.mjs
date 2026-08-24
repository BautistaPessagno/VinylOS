import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadProfileView() {
  const filename = fileURLToPath(new URL("./profileView.ts", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  vm.runInNewContext(outputText, { exports: mod.exports, module: mod, require }, { filename });
  return mod.exports;
}

test("wishlist query selects the wishlist for owners and visitors", () => {
  const { resolveProfileView } = loadProfileView();

  assert.equal(resolveProfileView("wishlist", true), "wishlist");
  assert.equal(resolveProfileView("wishlist", false), "wishlist");
});

test("settings remain owner-only and all other views show the profile", () => {
  const { resolveProfileView } = loadProfileView();

  assert.equal(resolveProfileView("settings", true), "settings");
  assert.equal(resolveProfileView("settings", false), "profile");
  assert.equal(resolveProfileView(undefined, true), "profile");
  assert.equal(resolveProfileView("unknown", false), "profile");
});

test("publicProfilePath keeps wishlist and collection URLs distinct", () => {
  const { publicProfilePath } = loadProfileView();

  assert.equal(publicProfilePath("user-1", "profile"), "/users/user-1");
  assert.equal(publicProfilePath("user-1", "wishlist"), "/users/user-1?view=wishlist");
});
