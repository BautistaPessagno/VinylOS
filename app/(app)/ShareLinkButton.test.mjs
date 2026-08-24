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

function loadShare() {
  const filename = fileURLToPath(new URL("./ShareLinkButton.tsx", import.meta.url));
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
    { exports: mod.exports, module: mod, require: (id) => (id === "react" ? React : require(id)) },
    { filename },
  );
  return mod.exports;
}

function abortError() {
  const error = new Error("Share canceled");
  error.name = "AbortError";
  return error;
}

test("shareOrCopyLink returns cancelled and does not copy when the share sheet is dismissed", async () => {
  const { shareOrCopyLink } = loadShare();
  let copied = "";
  const result = await shareOrCopyLink("https://example.test/album/1", "Álbum", {
    share: async () => {
      throw abortError();
    },
    writeText: async (text) => {
      copied = text;
    },
  });
  assert.equal(result, "cancelled");
  assert.equal(copied, "");
});

test("shareOrCopyLink copies when Web Share is unavailable", async () => {
  const { shareOrCopyLink } = loadShare();
  let copied = "";
  const result = await shareOrCopyLink("/artist/9", undefined, {
    writeText: async (text) => {
      copied = text;
    },
  });
  assert.equal(result, "copied");
  assert.equal(copied, "/artist/9");
});

test("shareOrCopyLink copies when share throws a non-abort error", async () => {
  const { shareOrCopyLink } = loadShare();
  let copied = "";
  const result = await shareOrCopyLink("https://example.test/users/1", "Perfil", {
    share: async () => {
      throw new Error("unsupported payload");
    },
    writeText: async (text) => {
      copied = text;
    },
  });
  assert.equal(result, "copied");
  assert.equal(copied, "https://example.test/users/1");
});

test("shareOrCopyLink returns shared without copying when the share sheet succeeds", async () => {
  const { shareOrCopyLink } = loadShare();
  let copied = "";
  let shared;
  const result = await shareOrCopyLink("https://example.test/album/1", "Clics Modernos", {
    share: async (data) => {
      shared = data;
    },
    writeText: async (text) => {
      copied = text;
    },
  });
  assert.equal(result, "shared");
  assert.equal(shared?.url, "https://example.test/album/1");
  assert.equal(shared?.title, "Clics Modernos");
  assert.equal(copied, "");
});

test("shareOrCopyLink uses the legacy copy fallback when Clipboard API fails", async () => {
  const { shareOrCopyLink } = loadShare();
  let legacyText = "";
  const result = await shareOrCopyLink("https://example.test/artist/9", "Artista", {
    writeText: async () => {
      throw new Error("clipboard permission denied");
    },
    legacyCopy: (text) => {
      legacyText = text;
      return true;
    },
  });

  assert.equal(result, "copied");
  assert.equal(legacyText, "https://example.test/artist/9");
});

test("shareOrCopyLink reports failure when no copy mechanism succeeds", async () => {
  const { shareOrCopyLink } = loadShare();
  const result = await shareOrCopyLink("https://example.test/album/1", undefined, {
    legacyCopy: () => false,
  });

  assert.equal(result, "failed");
});

test("copyTextWithSelection selects, copies, and removes its temporary field", () => {
  const { copyTextWithSelection } = loadShare();
  const events = [];
  const field = {
    style: {},
    setAttribute(name, value) {
      events.push(["attribute", name, value]);
    },
    select() {
      events.push(["select"]);
    },
    remove() {
      events.push(["remove"]);
    },
  };
  const fakeDocument = {
    createElement(tag) {
      events.push(["create", tag]);
      return field;
    },
    body: {
      appendChild(element) {
        events.push(["append", element]);
      },
    },
    execCommand(command) {
      events.push(["command", command]);
      return true;
    },
  };

  assert.equal(copyTextWithSelection("https://example.test/album/1", fakeDocument), true);
  assert.equal(field.value, "https://example.test/album/1");
  assert.deepEqual(events, [
    ["create", "textarea"],
    ["attribute", "readonly", ""],
    ["append", field],
    ["select"],
    ["command", "copy"],
    ["remove"],
  ]);
});

test("copyTextWithSelection removes its temporary field when selection fails", () => {
  const { copyTextWithSelection } = loadShare();
  let removed = false;
  const field = {
    style: {},
    setAttribute() {},
    select() {
      throw new Error("selection unavailable");
    },
    remove() {
      removed = true;
    },
  };
  const fakeDocument = {
    createElement: () => field,
    body: { appendChild() {} },
    execCommand: () => true,
  };

  assert.throws(() => copyTextWithSelection("https://example.test", fakeDocument));
  assert.equal(removed, true);
});

test("runShareOnce ignores overlapping attempts and unlocks after completion", async () => {
  const { runShareOnce } = loadShare();
  const lock = { current: false };
  let finishFirst;
  let calls = 0;
  const operation = () => {
    calls += 1;
    return new Promise((resolve) => {
      finishFirst = resolve;
    });
  };

  const first = runShareOnce(lock, operation);
  assert.equal(await runShareOnce(lock, operation), "ignored");
  assert.equal(calls, 1);
  finishFirst("cancelled");
  assert.equal(await first, "cancelled");
  assert.equal(lock.current, false);
});

test("share button exposes a persistent status region for copy feedback", () => {
  const { ShareLinkButton } = loadShare();
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ShareLinkButton, { url: "/album/1", label: "Compartir" }),
  );

  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="status"/);
});
