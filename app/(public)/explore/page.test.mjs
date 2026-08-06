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

function loadPage(session) {
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
    if (id === "@/lib/auth-session") {
      return { getOptionalSession: async () => session };
    }
    if (id === "@/app/(app)/recommendations/ExploreTab") {
      return {
        ExploreTab({ userId }) {
          return React.createElement(
            "div",
            { "data-user-id": userId ?? "guest" },
            "Explore catalog",
          );
        },
      };
    }
    if (id === "@/app/(app)/recommendations/TabBar") {
      return {
        TabBar() {
          return React.createElement("nav", null, "For You", "Explore");
        },
      };
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

test("guests can render Explore without a For You tab", async () => {
  const Page = loadPage(null);
  const element = await Page({
    searchParams: Promise.resolve({ genre: "rock", sort: "artist" }),
  });
  const html = ReactDOMServer.renderToStaticMarkup(element);

  assert.match(html, />Explore</);
  assert.match(html, /Explore catalog/);
  assert.match(html, /data-user-id="guest"/);
  assert.doesNotMatch(html, /For You/);
});

test("members see Discover tabs and pass their identity into Explore", async () => {
  const Page = loadPage({ user: { id: "user-1" } });
  const element = await Page({ searchParams: Promise.resolve({ focus: "search" }) });
  const html = ReactDOMServer.renderToStaticMarkup(element);

  assert.match(html, /For You/);
  assert.match(html, /data-user-id="user-1"/);
});
