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

test("member Discover tabs cross-link For You and public Explore", () => {
  const filename = fileURLToPath(new URL("./TabBar.tsx", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require(id) {
        if (id === "next/link") {
          return function Link({ href, children, ...props }) {
            return React.createElement("a", { href, ...props }, children);
          };
        }
        return require(id);
      },
    },
    { filename },
  );

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(mod.exports.TabBar, { active: "explore" }),
  );
  assert.match(html, /href="\/recommendations"/);
  assert.match(html, /href="\/explore"/);
  assert.match(html, /aria-current="page"[^>]*>Explorar/);
});
