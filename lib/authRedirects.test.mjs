import assert from "node:assert/strict";
import test from "node:test";

import authRedirects from "./authRedirects.js";

const {
  buildLoginRedirectUrl,
  getSafeAuthCallbackPath,
} = authRedirects;

test("buildLoginRedirectUrl preserves the invited profile path", () => {
  const url = buildLoginRedirectUrl(
    new URL("https://vinyl.test/users/inviter-123?view=collection"),
  );

  assert.equal(
    url.toString(),
    "https://vinyl.test/?next=%2Fusers%2Finviter-123%3Fview%3Dcollection",
  );
});

test("getSafeAuthCallbackPath accepts same-origin relative paths", () => {
  assert.equal(getSafeAuthCallbackPath("/users/inviter-123"), "/users/inviter-123");
});

test("getSafeAuthCallbackPath rejects external redirects", () => {
  assert.equal(getSafeAuthCallbackPath("https://example.com/users/1"), "/collection");
  assert.equal(getSafeAuthCallbackPath("//example.com/users/1"), "/collection");
});
