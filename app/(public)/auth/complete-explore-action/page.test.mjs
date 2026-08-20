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

class RedirectSignal extends Error {
  constructor(path) {
    super(`redirect:${path}`);
    this.path = path;
  }
}

function transpile(url) {
  const filename = fileURLToPath(url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return { filename, outputText, source };
}

function loadModule({ filename, outputText }, localRequire) {
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename },
  );
  return mod.exports;
}

function loadPage(session) {
  return loadModule(
    transpile(new URL("./page.tsx", import.meta.url)),
    (id) => {
      if (id === "next/navigation") {
        return {
          redirect(path) {
            throw new RedirectSignal(path);
          },
        };
      }
      if (id === "@/lib/auth-session") {
        return { getOptionalSession: async () => session };
      }
      if (id === "./CompleteExploreActionForm") {
        return {
          CompleteExploreActionForm() {
            return React.createElement("form", null, "Finish action");
          },
        };
      }
      return require(id);
    },
  ).default;
}

test("the completion page sends anonymous requests through login", async () => {
  const Page = loadPage(null);

  await assert.rejects(
    Page(),
    (error) =>
      error instanceof RedirectSignal &&
      error.path === "/login?next=%2Fauth%2Fcomplete-explore-action",
  );
});

test("the completion page presents the authenticated action fallback", async () => {
  const Page = loadPage({ user: { id: "user-1" } });
  const html = ReactDOMServer.renderToStaticMarkup(await Page());

  assert.match(html, /Completando tu acción/);
  assert.match(html, /Finish action/);
});

test("the completion form posts automatically and retains a manual submit button", () => {
  const compiled = transpile(new URL("./CompleteExploreActionForm.tsx", import.meta.url));
  const CompleteExploreActionForm = loadModule(compiled, (id) => {
    if (id === "react") return React;
    if (id === "@/app/(app)/recommendations/actions") {
      return { completePendingExploreAction: "/complete-action" };
    }
    if (id === "@/app/(app)/SubmitButton") {
      return {
        SubmitButton({ children, ...props }) {
          delete props.pendingText;
          return React.createElement("button", props, children);
        },
      };
    }
    return require(id);
  }).CompleteExploreActionForm;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CompleteExploreActionForm),
  );
  assert.match(html, /action="\/complete-action"/);
  assert.match(html, />Finish action</);
  assert.match(compiled.source, /if \(submitted\.current\) return/);
  assert.match(compiled.source, /requestSubmit\(\)/);
});
