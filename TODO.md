# TODO — Share links + public read-only browsing

**Goal:** anyone with a link — signed in or not, account or no account — can view a user's profile, collection, and wishlist. Only _actions_ (follow, add to collection, add to wishlist, edit, remove) require an account; attempting one sends the visitor to login/signup and then **completes the intended action** on return instead of just dumping them on the page.

Suggested remaining order: **5 → 4 leftovers → 6**. Public read access (§2) and wishlist visibility (§3) are done; sign-in-then-apply (§5) is the main gap that still makes public pages less useful; share polish (§4) and verification (§6) follow.

## 1. Current state (what's left)

**Done (merged):**

- Public read routes live under `app/(public)/` (`/users/[userId]`, `/album/[id]`, `/artist/[id]`) with session-optional layout + `PublicGuestNav`. Shipped in [PR #15](https://github.com/BautistaPessagno/VinylOS/pull/15).
- `(app)` layout still gates private routes with `if (!session) redirect("/login")`.
- `proxy.ts` matcher no longer covers public paths; private paths still bounce unauthenticated visitors. Per-page `requireSession()` remains the real security boundary.
- Public pages use `getOptionalSession()`; session-derived branches tolerate `null`.
- Wishlists on profiles are fully public (follow gate dropped) — same model as collection.
- Share affordance shipped for own collection + wishlist via `ShareLinkButton` ([PR #17](https://github.com/BautistaPessagno/VinylOS/pull/17)); `InviteFriendsButton` reuses it.

**Still open:**

- Sign-in-then-apply (§5): guests get "Log in to …" CTAs with `?next=` back to the page, but login/signup only returns them to the page — it does **not** complete follow / add-to-collection / add-to-wishlist.
- Share button missing on profile pages (own + another user); OG share cards are thin (no cover/image, wishlist view not specialized).
- Manual verification (§6) and pending-action tests once §5 lands.

## 2. Public read routes — **done**

Shipped in [PR #15](https://github.com/BautistaPessagno/VinylOS/pull/15) (`feat/public-read-routes`), merged via improvements stack.

- [x] Route shape **(a):** `app/(public)/` holds `/users/[userId]`, `/album/[id]`, `/artist/[id]` with a session-optional layout; `(app)` remains the auth boundary for private routes.
- [x] Public: `/users/[userId]` (profile · collection · wishlist tabs), `/album/[id]`, `/artist/[id]`. Private (unchanged): `/collection`, `/wishlist`, `/recommendations`, `/friends`, `/settings`, `/collection/add`, `/collection/[itemId]/edit`.
- [x] `getOptionalSession()` in `lib/auth-session.ts`; public pages use it and tolerate `null` for `getFollowStatus`, `isSelf`, settings, `wrapped`, `showWishlistAction`.
- [x] Public paths dropped from `proxy.ts` matcher. Private ones kept. **`proxy.ts` is not the security boundary** — per-page `requireSession()` on private routes stays.
- [x] Public-viewer chrome: `PublicGuestNav` with Log in / Sign up (round-trips via `?next=`). No account menu / bottom tabs / Sign out for guests.
- [x] No private field leaks: `listPublicCollectionItems` selects only public release fields (title, year, cover, genres, label, artists) — not `notes` / `purchasePrice` / `purchaseLocation`. Settings/email only when `showSettings && session` (self).

## 3. Wishlist & collection visibility — **done** (fully public)

- [x] **Decision taken:** fully public for both collection and wishlist. Follow gate on profile wishlists removed (`Make public profile wishlists viewable without login`). Matches the share-link goal; no per-user visibility setting for now.
- [x] Reads go through the service layer (`listPublicCollectionItems` / `listWishlistItems`) with public release fields only. No separate privacy policy to enforce while everything is fully public — revisit if a `private` / `followers` mode is added later.

## 4. Share affordance — **partial**

- [x] Reusable `ShareLinkButton` (`app/(app)/ShareLinkButton.tsx`): `navigator.share` when available, clipboard-copy fallback, "Link copied!" label. `InviteFriendsButton` wraps it.
- [x] Placed on: `/collection`, `/wishlist` (share URL = `/users/:id` and `/users/:id?view=wishlist`).
- [ ] Also place on: own profile and another user's profile (collection + wishlist views). Confirm `view=wishlist` still survives the share round trip from those surfaces.
- [ ] Richer per-page Open Graph / Twitter cards for share previews: e.g. title `"{name}'s wishlist on VinylOS"`, description with record count, image = a cover from the list or a static fallback. Base `generateMetadata` + basic `openGraph` title/description already exists on profile/album/artist; album includes cover image. Wishlist/collection profile views still need the share-card follow-through.
- [x] Share URLs stay guessable-by-user-id (consistent with existing `/users/:id` links). Only revisit if a `private` visibility level is introduced.

## 5. Sign-in-then-apply-the-action — **open**

Guest UI already avoids throwing: action forms are hidden for anonymous visitors; CTAs link to `/login?next=<current page>` (profile follow, album "Log in to add or wishlist"). After auth they land back on the page only — the action is not applied.

- [ ] Every action form on a public page must, for an anonymous visitor, either redirect to login **and replay the action** after auth, or keep the current "Log in to …" link pattern but complete the intent on return. Today `requireSession()` in server actions still throws `Unauthorized` if hit without a session (`wishlist/actions.ts`, `collection/actions.ts`, `friends/actions.ts`, `album/[id]/actions.ts`).
- [ ] Extend the `?next=` contract in `lib/authRedirects.js` to carry a **pending action**, then replay it after a successful login/signup. Two options:
  - Encode the action in the `next` path as a dedicated route (e.g. `next=/collection/add?release=123`) — no new state, reuses the existing validated path allowlist, but only works for actions that have a URL equivalent.
  - A short-lived signed `pendingAction` cookie (action name + target id) consumed once by the post-login redirect handler — works for every action, but needs signing and expiry, and must re-authorize the action against the _newly created_ session rather than trusting the cookie.
  - Recommendation: start with the path-encoded form for add-to-collection / add-to-wishlist / follow (covers the realistic share-link flows) and only add the cookie if an action can't be expressed as a URL.
- [ ] Keep `getSafeAuthCallbackPath`'s same-origin validation intact — it's the open-redirect guard. Any new param that feeds a redirect needs the same treatment, and `lib/authRedirects.test.mjs` should gain cases for the new shapes.
- [ ] The signup path needs the same replay as login — a brand-new account arriving from a shared wishlist is the primary case this whole section exists for.

## 6. Verification

- [ ] Signed-out, in a fresh browser profile: open a shared `/users/:id?view=wishlist` link → wishlist renders, no console errors, no auth redirect. _(Expected to pass after §2–3; reconfirm.)_
- [ ] Signed-out: tap "Wishlist" / "Add to collection" / "Follow" on a public surface → lands on login → after signup the intended action actually completes (depends on §5).
- [ ] Signed-out: `/collection`, `/wishlist`, `/settings`, `/recommendations`, `/friends` still redirect to login.
- [ ] Extend `lib/authRedirects.test.mjs` for the pending-action encoding, including hostile inputs (`//evil.com`, absolute URLs, unknown action names).
- [ ] `pnpm lint` + `pnpm build` clean; `curl -s` a public profile URL with no cookies and confirm the HTML contains the records (i.e. it's genuinely server-rendered for anonymous visitors, not client-gated).
