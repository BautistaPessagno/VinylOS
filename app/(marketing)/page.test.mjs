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
    // Both are client components; the landing page only has to hand them data.
    if (id === "./Turntable") {
      return {
        Turntable: ({ covers }) =>
          React.createElement("div", { "data-covers": covers.length }),
      };
    }
    if (id === "./LandingSearch") {
      return {
        LandingSearch: ({ genres }) =>
          React.createElement("form", { action: "/explore" }, genres.join(",")),
      };
    }
    if (id === "@/lib/services/collectionService") {
      return { listRecentReleaseCovers: async () => [] };
    }
    if (id === "@/lib/services/exploreService") {
      return { listExploreGenres: () => ["rock", "jazz"] };
    }
    if (id === "@/app/JsonLd") {
      return { JsonLd: () => null };
    }
    if (id === "@/lib/site") {
      return {
        SITE_NAME: "VinylOS",
        SITE_URL: "https://www.misvinilos.com",
        SITE_DESCRIPTION: "desc",
        absoluteUrl: (path) => `https://www.misvinilos.com${path}`,
      };
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

async function renderLandingPage() {
  const LandingPage = loadLandingPage();
  return ReactDOMServer.renderToStaticMarkup(
    await LandingPage({ searchParams: Promise.resolve({}) }),
  );
}

test("the landing page keeps account actions in the header and leads to Explore", async () => {
  const html = await renderLandingPage();

  const headerStart = html.indexOf("<header");
  const headerEnd = html.indexOf("</header>");
  const signupIndex = html.indexOf('href="/login?mode=signup"');
  const loginIndex = html.indexOf('href="/login"');
  const exploreIndex = html.indexOf('href="/explore"');

  assert.ok(headerStart >= 0, "the landing page has a header");
  assert.ok(signupIndex > headerStart && signupIndex < headerEnd);
  assert.ok(loginIndex > headerStart && loginIndex < headerEnd);
  assert.ok(exploreIndex > headerEnd, "Explore is the hero action");
  assert.match(html, />Explorar discos<\/a>/);
});

test("the landing page hands genres to the search chips", async () => {
  const html = await renderLandingPage();
  assert.match(html, /rock,jazz/);
});

/*
 * The palette now lives on :root, so there is no ground class left to assert on.
 * What still matters is that the page names palette *roles* — a literal colour
 * here would be a shade that no longer flips with the scheme.
 */
test("the landing page paints in palette roles, not fixed shades", async () => {
  const html = await renderLandingPage();

  assert.match(html, /text-room-dim/);
  assert.match(html, /bg-room-accent/);
  assert.doesNotMatch(html, /zinc-|text-white\b/);
});
