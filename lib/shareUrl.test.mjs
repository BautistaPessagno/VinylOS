import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadShareUrl() {
  const filename = fileURLToPath(new URL("./shareUrl.ts", import.meta.url));
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
    { exports: mod.exports, module: mod, require, URL },
    { filename },
  );
  return mod.exports;
}

function headers(values) {
  return {
    get(name) {
      return Object.hasOwn(values, name) ? values[name] : null;
    },
  };
}

test("shareUrlForPath uses the request host and forwarded proto", () => {
  const { shareUrlForPath } = loadShareUrl();
  assert.equal(
    shareUrlForPath("/album/42", headers({ host: "www.misvinilos.com", "x-forwarded-proto": "https" })),
    "https://www.misvinilos.com/album/42",
  );
});

test("shareUrlForPath defaults to http when proto is missing", () => {
  const { shareUrlForPath } = loadShareUrl();
  assert.equal(
    shareUrlForPath("/users/abc", headers({ host: "localhost:3000" })),
    "http://localhost:3000/users/abc",
  );
});

test("shareUrlForPath keeps query strings and falls back to the path without a host", () => {
  const { shareUrlForPath } = loadShareUrl();
  assert.equal(
    shareUrlForPath("/users/abc?view=wishlist", headers({ host: "example.test", "x-forwarded-proto": "https" })),
    "https://example.test/users/abc?view=wishlist",
  );
  assert.equal(shareUrlForPath("/artist/9", headers({})), "/artist/9");
});

test("shareUrlForPath honors the first trusted forwarded origin", () => {
  const { shareUrlForPath } = loadShareUrl();
  assert.equal(
    shareUrlForPath(
      "/album/42",
      headers({
        host: "internal:3000",
        "x-forwarded-host": "preview.example.test, internal:3000",
        "x-forwarded-proto": "https, http",
      }),
    ),
    "https://preview.example.test/album/42",
  );
});

test("shareUrlForPath rejects malformed origins instead of emitting broken links", () => {
  const { shareUrlForPath } = loadShareUrl();
  assert.equal(
    shareUrlForPath(
      "/album/42",
      headers({ host: "example.test/path", "x-forwarded-proto": "javascript" }),
    ),
    "/album/42",
  );
});
