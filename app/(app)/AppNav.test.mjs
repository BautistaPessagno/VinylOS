import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(new URL("./AppNav.tsx", import.meta.url));

test("navigation uses an accessible Explore search magnifier instead of Add", () => {
  const source = readFileSync(filename, "utf8");

  assert.match(
    source,
    /const SEARCH_HREF = "\/explore\?focus=search"/,
  );
  assert.ok((source.match(/href=\{SEARCH_HREF\}/g) ?? []).length >= 1);
  assert.match(source, /aria-label="Buscar discos y artistas"/);
  assert.match(source, /<svg/);
  assert.doesNotMatch(source, />\s*\+ Add\s*</);
  assert.match(source, /pathname === "\/explore"/);
});

test("mobile navigation is a fixed bottom tab bar, not a hover-only hamburger", () => {
  const source = readFileSync(filename, "utf8");

  // Bottom tab bar with safe-area padding replaces the hamburger drawer.
  assert.match(source, /fixed inset-x-0 bottom-0/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(source, /onMouseEnter/);

  // Account menu is click-toggled with proper disclosure semantics.
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=\{menuId\}/);
  assert.match(source, /Escape/);

  // Profile, Settings, and Sign out are reachable from the account menu.
  assert.match(source, /Profile/);
  assert.match(source, /Settings/);
  assert.match(source, /SignOutButton/);
});

test("member navigation keeps Spanish labels and the stores destination", () => {
  const source = readFileSync(filename, "utf8");

  assert.doesNotMatch(source, /<<<<<<<|=======|>>>>>>>/);
  assert.match(source, /href: "\/collection", label: "Colección"/);
  assert.match(source, /href: "\/wishlist", label: "Lista de deseos"/);
  assert.match(source, /href: "\/friends", label: "Amigos"/);
  assert.match(source, /href: "\/recommendations", label: "Descubrir"/);
  assert.match(source, /href: "\/stores", label: "Disquerías"/);
});
