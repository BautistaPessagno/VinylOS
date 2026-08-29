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

function loadForm() {
  const filename = fileURLToPath(new URL("./LibraryActionForm.tsx", import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const localRequire = (id) => {
    if (id === "./toast/ToastProvider") {
      return { useToast: () => ({ showToast() {} }) };
    }
    if (id === "./SubmitButton") {
      return {
        SubmitButton({ children, className }) {
          return React.createElement("button", { type: "submit", className }, children);
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
  return mod.exports.LibraryActionForm;
}

const baseProps = {
  action: async () => ({ toast: "wishlist-added", inList: true }),
  fields: { releaseId: 10 },
  label: "Lista de deseos",
  inListLabel: "En tu lista de deseos",
  pendingText: "Añadiendo…",
};

function render(props) {
  const LibraryActionForm = loadForm();
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(LibraryActionForm, { ...baseProps, ...props }),
  );
}

test("an available action renders a submittable form carrying its payload", () => {
  const html = render({});

  assert.match(html, /<form/);
  assert.match(html, /name="releaseId" value="10"/);
  assert.match(html, />Lista de deseos</);
  assert.doesNotMatch(html, /En tu lista de deseos/);
});

test("an action already applied states the record's state and cannot be fired", () => {
  const html = render({ inList: true });

  assert.doesNotMatch(html, /<form/);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, />En tu lista de deseos</);
});

test("the retired slot can be styled apart from the button it replaces", () => {
  const html = render({
    inList: true,
    className: "underline",
    inListClassName: "text-room-dim",
  });

  assert.match(html, /class="text-room-dim"/);
  assert.doesNotMatch(html, /underline/);
});
