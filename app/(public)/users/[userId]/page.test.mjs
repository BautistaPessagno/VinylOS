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
  assert.match(source, /ANONYMOUS_FOLLOW_STATUS|isFollowing: false/);
  // Settings and email only when viewing own profile while signed in.
  assert.match(source, /showSettings && session/);
  // Wishlist action forms only for signed-in non-self viewers.
  assert.match(source, /showWishlistAction/);
});
