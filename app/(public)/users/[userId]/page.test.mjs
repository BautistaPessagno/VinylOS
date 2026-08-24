import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(new URL("./page.tsx", import.meta.url));

test("user profile page is publicly readable with optional session", () => {
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /getOptionalSession/);
  assert.doesNotMatch(source, /requireSession/);
  assert.match(source, /listPublicCollectionItems/);
  assert.match(source, /listWishlistItems/);
  assert.match(source, /ANONYMOUS_FOLLOW_STATUS|isFollowing: false/);
  // Settings and email only when viewing own profile while signed in.
  assert.match(source, /showSettings && session/);
  // Wishlist is public (no follow gate); action forms only for signed-in non-self.
  assert.match(source, /showWishlistAction/);
  assert.doesNotMatch(source, /Follow .* to see their wishlist/);
  assert.doesNotMatch(source, /Log in and follow .* to see their wishlist/);
});

test("user profile page shares collection or wishlist URLs and specializes metadata", () => {
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /ShareLinkButton/);
  assert.match(source, /shareUrlForPath/);
  assert.match(source, /`\/users\/\$\{profile\.id\}\?view=wishlist`/);
  assert.match(source, /Colección de \$\{profile\.name\} en VinylOS/);
  assert.match(source, /Lista de deseos de \$\{profile\.name\} en VinylOS/);
  assert.match(source, /generateMetadata\(\{[\s\S]*searchParams/);
  assert.match(source, /resolveProfileView\(view,/);
});
