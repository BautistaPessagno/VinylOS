import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadProxy() {
  const filename = fileURLToPath(new URL("./proxy.ts", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const localRequire = (id) => {
    if (id === "next/server") {
      return {
        NextResponse: {
          next: () => ({ type: "next" }),
          redirect: (url) => ({ type: "redirect", url: url.toString() }),
        },
      };
    }
    if (id === "better-auth/cookies") return { getSessionCookie: () => null };
    if (id === "@/lib/authRedirects") {
      return {
        buildLoginRedirectUrl: (url) =>
          new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url),
      };
    }
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire, URL },
    { filename },
  );
  return mod.exports.proxy;
}

test("legacy Explore URLs redirect publicly and preserve Explore filters", () => {
  const proxy = loadProxy();
  const result = proxy({
    nextUrl: new URL(
      "https://vinylos.test/recommendations?tab=explore&genre=rock&sort=artist&toast=collection-added",
    ),
  });

  assert.deepEqual(
    { ...result },
    {
      type: "redirect",
      url: "https://vinylos.test/explore?genre=rock&sort=artist&toast=collection-added",
    },
  );
});
