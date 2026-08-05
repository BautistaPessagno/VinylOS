# TODO — Share links + public read-only browsing

**Goal:** anyone with a link — signed in or not, account or no account — can view a user's profile, collection, and wishlist. Only _actions_ (follow, add to collection, add to wishlist, edit, remove) require an account; attempting one sends the visitor to login/signup and then **completes the intended action** on return instead of just dumping them on the page.

Suggested order: **2 → 3 → 5 → 4**. Public read access (§2) is the foundation; the visibility decision (§3) must land before anything is exposed anonymously; sign-in-then-apply (§5) is what makes a public page useful; the share button + OG cards (§4) are the last mile and are safe to ship after.

## 1. Current state (what has to change)

Read access is gated in **three** independent places, all of which must be relaxed together — loosening only one leaves the route still blocked:

1. `app/(app)/layout.tsx` — `if (!session) redirect("/login")` for the entire `(app)` group.
2. `proxy.ts` — matcher covers `/users/:path*`, `/album/:path*`, `/artist/:path*` (fast no-JS bounce).
3. The pages themselves — `requireSession()` in `users/[userId]/page.tsx`, `album/[id]/page.tsx`, `artist/[id]/page.tsx`.

Also relevant:

- `lib/authRedirects.js` already round-trips the destination as `?next=<path+search>` (validated same-origin, `//` rejected). It carries a **path only** — no notion of a pending action.
- Wishlist visibility is currently gated on the _follow_ relationship (`users/[userId]/page.tsx:199-201`) — an anonymous viewer has no follow relationship, so this gate has to be resolved (see §3).
- The only sharing that exists is `friends/InviteFriendsButton.tsx`, which `navigator.share`s your own profile URL. There is no share affordance for a wishlist or collection.

## 2. Public read routes

- [ ] Decide the route shape and stick to it: either **(a)** move the publicly-viewable pages into a new `app/(public)/` group with its own layout, or **(b)** keep them in `(app)` and make the layout session-optional. (b) is fewer moved files but means the `(app)` layout stops being the auth boundary — every remaining page in the group must then be verified to call `requireSession()` itself. Prefer (a) if the list of public pages stays small.
- [ ] Public: `/users/[userId]` (profile · collection · wishlist tabs), `/album/[id]`, `/artist/[id]`. Private (unchanged): `/collection`, `/wishlist`, `/recommendations`, `/friends`, `/settings`, `/collection/add`, `/collection/[itemId]/edit`.
- [ ] Replace `requireSession()` with an optional-session helper (e.g. `getOptionalSession()` alongside the existing `requireSession` in `lib/auth-session.ts`) on the public pages, and make every session-derived branch tolerate `null` — `getFollowStatus`, `isSelf`, the settings tab, `wrapped`, `showWishlistAction`.
- [ ] Drop the public paths from the `proxy.ts` matcher. Keep the private ones. **`proxy.ts` is not the security boundary** — it is bypassable by header spoofing (CVE-2025-29927), so the per-page `requireSession()` checks on the private routes must stay regardless of what the matcher covers.
- [ ] Public-viewer chrome: a signed-out visitor must not see the account menu / bottom tab bar / Sign out (`AppNav.tsx` requires `name`/`userId`). Render a minimal header with a "Sign up" / "Log in" CTA instead.
- [ ] Verify nothing leaks on a public page: no email, no settings, no private notes / purchase price / purchase location from `collection_items`. Audit what `listPublicCollectionItems` actually selects before exposing it anonymously.

## 3. Wishlist & collection visibility

- [ ] **Open decision:** the follow gate on wishlists is incompatible with "anyone with the link can see it". Pick one:
  - **Fully public** — drop the follow gate entirely; simplest, matches the stated goal.
  - **Per-user visibility setting** — `user_profiles.preferences` gains e.g. `wishlistVisibility: 'public' | 'followers' | 'private'` (plus the same for collection), surfaced in `/settings`. More work, but a shareable wishlist that _can't_ be made private is a privacy regression for existing users who assumed the follow gate.
  - Recommendation: ship **fully public for collection** (already effectively public to any signed-in user) and a **visibility setting for wishlist**, defaulting existing users to `followers` so nothing they already have becomes newly visible.
- [ ] Whatever is chosen, enforce it in the **service layer** (`wishlistService.listWishlistItems` / `collectionService.listPublicCollectionItems`) — not only in the page — so a future API route or share endpoint can't bypass it.

## 4. Share affordance

- [ ] A reusable share button (generalize `InviteFriendsButton.tsx`: `navigator.share` when available, clipboard-copy fallback, "Copied" toast via the existing toast infra) taking an explicit URL + title.
- [ ] Place it on: own profile, `/collection`, `/wishlist`, and another user's profile. The wishlist share link is `/users/:id?view=wishlist` — confirm the `view` param survives the round trip.
- [ ] Per-page `generateMetadata` with Open Graph / Twitter card (title = "{name}'s wishlist on VinylOS", description = record count, image = a cover from the list or a static fallback) — a shared link with no preview card is the main thing that makes sharing feel broken. Base per-page metadata already shipped; this is the share-card follow-through.
- [ ] Decide whether share URLs stay guessable-by-user-id or move to an opaque token. User ids are already exposed in the current `/users/:id` links, so plain ids are consistent — only revisit if §3 lands a `private` visibility level, which would need a token to be shareable at all.

## 5. Sign-in-then-apply-the-action

- [ ] Every action form on a public page must, for an anonymous visitor, redirect to login instead of throwing `Unauthorized` (today `requireSession()` throws — see `wishlist/actions.ts`, `collection/actions.ts`, `friends/actions.ts`, `album/[id]/actions.ts`).
- [ ] Extend the `?next=` contract in `lib/authRedirects.js` to carry a **pending action**, then replay it after a successful login/signup. Two options:
  - Encode the action in the `next` path as a dedicated route (e.g. `next=/collection/add?release=123`) — no new state, reuses the existing validated path allowlist, but only works for actions that have a URL equivalent.
  - A short-lived signed `pendingAction` cookie (action name + target id) consumed once by the post-login redirect handler — works for every action, but needs signing and expiry, and must re-authorize the action against the _newly created_ session rather than trusting the cookie.
  - Recommendation: start with the path-encoded form for add-to-collection / add-to-wishlist / follow (covers the realistic share-link flows) and only add the cookie if an action can't be expressed as a URL.
- [ ] Keep `getSafeAuthCallbackPath`'s same-origin validation intact — it's the open-redirect guard. Any new param that feeds a redirect needs the same treatment, and `lib/authRedirects.test.mjs` should gain cases for the new shapes.
- [ ] The signup path needs the same replay as login — a brand-new account arriving from a shared wishlist is the primary case this whole section exists for.

## 6. Verification

- [ ] Signed-out, in a fresh browser profile: open a shared `/users/:id?view=wishlist` link → wishlist renders, no console errors, no auth redirect.
- [ ] Signed-out: tap "Wishlist" on a record → lands on login → after signup the record is actually in the new account's wishlist.
- [ ] Signed-out: `/collection`, `/wishlist`, `/settings`, `/recommendations`, `/friends` still redirect to login.
- [ ] Extend `lib/authRedirects.test.mjs` for the pending-action encoding, including hostile inputs (`//evil.com`, absolute URLs, unknown action names).
- [ ] `pnpm lint` + `pnpm build` clean; `curl -s` a public profile URL with no cookies and confirm the HTML contains the records (i.e. it's genuinely server-rendered for anonymous visitors, not client-gated).
