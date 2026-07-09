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

function loadCollectionFiltersForm() {
  const filename = fileURLToPath(new URL("./CollectionFiltersForm.tsx", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const mod = { exports: {} };
  function localRequire(id) {
    if (id === "next/link") {
      return function Link({ href, children, ...props }) {
        return React.createElement("a", { href, ...props }, children);
      };
    }
    return require(id);
  }

  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require: localRequire,
    },
    { filename },
  );

  return mod.exports.CollectionFiltersForm;
}

test("collection filters render typeable selectors with owned options", () => {
  const CollectionFiltersForm = loadCollectionFiltersForm();

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CollectionFiltersForm, {
      selected: { genre: "Jazz", label: "Blue", year: "1959" },
      options: {
        genres: ["Ambient", "Jazz"],
        labels: ["Blue Note", "Columbia"],
        years: [1971, 1959],
      },
    }),
  );

  assert.doesNotMatch(html, /<select\b/);
  assert.match(
    html,
    /<input(?=[^>]+name="genre")(?=[^>]+list="collection-genre-options")[^>]+>/,
  );
  assert.match(
    html,
    /<input(?=[^>]+name="label")(?=[^>]+list="collection-label-options")[^>]+>/,
  );
  assert.match(
    html,
    /<input(?=[^>]+name="year")(?=[^>]+list="collection-year-options")[^>]+>/,
  );
  assert.match(html, /<datalist id="collection-genre-options">/);
  assert.match(html, /<option value="Ambient">/);
  assert.match(html, /<option value="Blue Note">/);
  assert.match(html, /<option value="1971">/);
  assert.match(html, /value="Jazz"/);
  assert.match(html, /href="\/collection"[^>]*>Clear filters<\/a>/);
});
