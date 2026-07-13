import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function transpile(url) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return { outputText, filename };
}

function runModule({ outputText, filename }, localRequire) {
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire ?? require },
    { filename },
  );
  return mod.exports;
}

function loadFlash() {
  const messages = runModule(transpile(new URL("./messages.ts", import.meta.url)));
  return runModule(transpile(new URL("./flash.ts", import.meta.url)), (id) =>
    id === "./messages" ? messages : require(id),
  );
}

test("appendToast adds the flash param when there is no query", () => {
  const { appendToast } = loadFlash();
  assert.equal(appendToast("/collection", "item-removed"), "/collection?toast=item-removed");
});

test("appendToast preserves an existing query string", () => {
  const { appendToast } = loadFlash();
  assert.equal(
    appendToast("/recommendations?tab=explore", "collection-added"),
    "/recommendations?tab=explore&toast=collection-added",
  );
});

test("appendToast keeps the param before a hash fragment", () => {
  const { appendToast } = loadFlash();
  assert.equal(appendToast("/album/5#tracklist", "dismissed"), "/album/5?toast=dismissed#tracklist");
});

test("appendToast leaves unsafe or empty paths unchanged", () => {
  const { appendToast } = loadFlash();
  assert.equal(appendToast("", "action-failed"), "");
  assert.equal(appendToast("//evil.com", "action-failed"), "//evil.com");
  assert.equal(appendToast("https://evil.com", "action-failed"), "https://evil.com");
});
