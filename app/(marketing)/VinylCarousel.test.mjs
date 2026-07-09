import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ReactDOMServer = require("react-dom/server");
const ts = require("typescript");

function loadVinylCarousel() {
  const filename = fileURLToPath(new URL("./VinylCarousel.tsx", import.meta.url));
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
  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require,
    },
    { filename },
  );

  return mod.exports.VinylCarousel;
}

function renderCarousel(covers) {
  const VinylCarousel = loadVinylCarousel();
  return ReactDOMServer.renderToStaticMarkup(VinylCarousel({ covers }));
}

test("placeholder carousel uses the animated infinite marquee", () => {
  const html = renderCarousel([]);

  assert.match(html, /animate-marquee/);
  assert.ok((html.match(/rounded-full bg-zinc-900/g) ?? []).length >= 24);
});

test("small cover sets are repeated enough to keep the marquee filled", () => {
  const html = renderCarousel([
    { releaseId: 1, title: "Kind of Blue", coverUrl: "https://example.com/cover.jpg" },
  ]);

  assert.ok((html.match(/<img /g) ?? []).length >= 24);
});
