import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const ts = require("typescript");

function loadLandingPage() {
  const filename = fileURLToPath(new URL("./page.tsx", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const localRequire = (id) => {
    if (id === "next/link") {
      return function Link({ href, children, ...props }) {
        return React.createElement("a", { href, ...props }, children);
      };
    }
    if (id === "./VinylCarousel") {
      return { VinylCarousel: () => React.createElement("div") };
    }
    if (id === "@/lib/services/collectionService") {
      return { listRecentReleaseCovers: async () => [] };
    }
    if (id === "@/lib/authRedirects") {
      return { getSafeAuthCallbackPath: () => "/collection" };
    }
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename },
  );
  return mod.exports.default;
}

test("the guest landing page leads with Explore before account actions", async () => {
  const LandingPage = loadLandingPage();
  const html = ReactDOMServer.renderToStaticMarkup(
    await LandingPage({ searchParams: Promise.resolve({}) }),
  );

  const exploreIndex = html.indexOf('href="/explore"');
  const signupIndex = html.indexOf('href="/login?mode=signup"');
  const loginIndex = html.indexOf('href="/login"');
  assert.ok(exploreIndex >= 0, "Explore is linked from the landing page");
  assert.ok(exploreIndex < signupIndex, "Explore appears before Sign up");
  assert.ok(signupIndex < loginIndex, "Log in is the quietest final action");
  assert.match(html, /Explore records/);
});
