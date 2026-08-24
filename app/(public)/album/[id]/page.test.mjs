import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(new URL("./page.tsx", import.meta.url));

test("album detail page is publicly readable with optional session", () => {
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /getOptionalSession/);
  assert.doesNotMatch(source, /requireSession/);
  assert.match(source, /Inicia sesión para añadir o guardar/);
  assert.match(source, /addAlbumToCollectionAction/);
  assert.match(source, /from\.startsWith\("\/explore"\)/);
  assert.match(source, /Volver a Explorar/);
});

test("album detail page shares the canonical album URL", () => {
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /ShareLinkButton/);
  assert.match(source, /shareUrlForPath/);
  assert.match(source, /`\/album\/\$\{release\.releaseId\}`/);
  assert.doesNotMatch(source, /shareUrlForPath\(`\/album\/\$\{release\.releaseId\}\?/);
  assert.match(source, /label="Compartir"/);
});
