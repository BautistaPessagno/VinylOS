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

function loadCard() {
  const filename = fileURLToPath(new URL("./DiscoveryAlbumCard.tsx", import.meta.url));
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
    if (id === "./actions") {
      return {
        addExploreAlbumAction: "/direct-add",
        beginExploreAuthAction: "/begin-auth",
        openExploreAlbumAction: "/open",
        wishlistExploreAlbumAction: "/direct-wishlist",
      };
    }
    if (id === "../LibraryActionForm") {
      // Mirrors the real component's one branch: an applied action states itself
      // instead of rendering a form.
      return {
        LibraryActionForm({ action, fields, label, inListLabel, inList }) {
          if (inList) return React.createElement("span", null, inListLabel);
          return React.createElement(
            "form",
            { action },
            Object.entries(fields).map(([name, value]) =>
              React.createElement("input", {
                key: name,
                type: "hidden",
                name,
                value,
              }),
            ),
            React.createElement("button", { type: "submit" }, label),
          );
        },
      };
    }
    if (id === "../SubmitButton") {
      return {
        SubmitButton({ children, ...props }) {
          delete props.pendingText;
          return React.createElement("button", props, children);
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
  return mod.exports.DiscoveryAlbumCard;
}

const album = { artist: "Charly Garcia", title: "Clics Modernos" };
const returnTo = "/explore?genre=rock";

function render(props) {
  const DiscoveryAlbumCard = loadCard();
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(DiscoveryAlbumCard, { album, returnTo, ...props }),
  );
}

test("public Explore cards preserve separate Add and Wishlist intents", () => {
  const html = render({ signedIn: false, guestActionMode: "pending" });

  assert.match(html, /action="\/begin-auth"/);
  assert.match(html, /name="kind" value="collection"/);
  assert.match(html, /name="kind" value="wishlist"/);
  assert.match(html, />Añadir</);
  assert.match(html, />Lista de deseos</);
  assert.doesNotMatch(html, /Inicia sesión para añadir/);
});

test("other public record cards retain their combined login link", () => {
  const html = render({ signedIn: false });

  assert.match(html, /href="\/login\?next=%2Fexplore%3Fgenre%3Drock"/);
  assert.match(html, /Inicia sesión para añadir/);
  assert.doesNotMatch(html, /action="\/begin-auth"/);
});

test("member cards submit directly without creating a pending intent", () => {
  const html = render({ signedIn: true, guestActionMode: "pending" });

  assert.match(html, /action="\/direct-add"/);
  assert.match(html, /action="\/direct-wishlist"/);
  assert.doesNotMatch(html, /action="\/begin-auth"/);
});

test("a record already in the collection offers only the wishlist action", () => {
  const html = render({ signedIn: true, inCollection: true });

  assert.doesNotMatch(html, /action="\/direct-add"/);
  assert.match(html, />En tu colección</);
  assert.match(html, /action="\/direct-wishlist"/);
});

test("a record already wishlisted offers only the collection action", () => {
  const html = render({ signedIn: true, inWishlist: true });

  assert.doesNotMatch(html, /action="\/direct-wishlist"/);
  assert.match(html, />En tu lista de deseos</);
  assert.match(html, /action="\/direct-add"/);
});
