import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const layoutPath = fileURLToPath(new URL("./layout.tsx", import.meta.url));
const guestNavPath = fileURLToPath(new URL("./PublicGuestNav.tsx", import.meta.url));
const proxyPath = fileURLToPath(new URL("../../proxy.ts", import.meta.url));

test("public layout is session-optional with guest chrome", () => {
  const source = readFileSync(layoutPath, "utf8");
  assert.match(source, /getOptionalSession/);
  assert.match(source, /PublicGuestNav/);
  assert.match(source, /AppNav/);
  assert.doesNotMatch(source, /redirect\("\/login"\)/);
});

test("guest nav exposes Explore, login, and signup without member controls", () => {
  const source = readFileSync(guestNavPath, "utf8");
  assert.match(source, /href="\/explore"/);
  assert.match(source, />\s*Explorar\s*</);
  assert.match(source, /Iniciar sesión/);
  assert.match(source, /Crear cuenta/);
  assert.doesNotMatch(source, /SignOutButton/);
  assert.doesNotMatch(source, /BottomTabBar/);
});

test("proxy matcher drops public read paths but keeps private ones", () => {
  const source = readFileSync(proxyPath, "utf8");
  assert.doesNotMatch(source, /"\/users\/:path\*"/);
  assert.doesNotMatch(source, /"\/album\/:path\*"/);
  assert.doesNotMatch(source, /"\/artist\/:path\*"/);
  assert.doesNotMatch(source, /"\/explore\/:path\*"/);
  assert.match(source, /"\/collection\/:path\*"/);
  assert.match(source, /"\/wishlist\/:path\*"/);
  assert.match(source, /"\/settings\/:path\*"/);
  assert.match(source, /"\/friends\/:path\*"/);
  assert.match(source, /"\/recommendations\/:path\*"/);
});
