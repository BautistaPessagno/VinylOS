# TODO — Architecture: Vinyl Collection App

> **Target stack:** Next.js (App Router) · Vercel (hosting) · Neon (Postgres serverless)
> **Music data source:** Discogs API (primary) + Last.fm + MusicBrainz (supplementary)
> **Doc status:** architecture + implementation roadmap · **mobile UX/UI audit added July 2026 → see sections 12–13**
> **Last technical verification:** July 2026

---

## 0. Context and scope

The app lets you track your vinyl collection, view it with stats like a "Vinyl Wrapped", and get recommendations for your next albums.
Users should be able to enter records manually with a search connected to Discogs and Last.fm, or via photos where the app recognizes artists and records.

Of the three original features, this document covers only what's being built **now**:

| Feature                               | Description                              | Status in this roadmap          |
| -------------------------------------- | ----------------------------------------- | -------------------------------- |
| **F1 — Collection + Wrapped**          | Show the collection + aggregated stats    | ✅ In scope (MVP)                |
| **F2 — Recommendations**               | Suggest albums based on the collection    | ✅ In scope (v2, no Spotify)     |
| **F3 — Map / Marketplace / Pokédex**   | Record store map, trading, catalog        | ⏸️ **Deferred** (future phase)   |
| **Spotify login**                      | Use top artists/tracks as a seed          | ⏸️ **Deferred** (future phase)   |

**Deliberate scope decisions:**

- F2 recommendations are built **without Spotify**: using co-occurrence of Discogs metadata + Last.fm's `artist.getSimilar`. Spotify is added later as an optional seed.
- F3 is deferred entirely (it's essentially 3 distinct products: map, marketplace, and global catalog).

---

## 1. Technical stack (verified)

| Layer                        | Choice                                                     | Notes                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                     | **Next.js 16 (App Router)**                                   | Server Components + Server Actions + Route Handlers. In v16, `middleware.ts` was renamed to `proxy.ts` and Turbopack is the default.                                                                                                                        |
| Hosting                       | **Vercel**                                                     | Native Next.js deploy. Preview deploys per PR.                                                                                                                                                                                                              |
| DB                             | **Neon (Postgres serverless)**                                 | Scale-to-zero, branching, pay-per-use. Installed as a native Vercel Marketplace integration (auto-provisions `DATABASE_URL` and `DATABASE_URL_UNPOOLED`).                                                                                                  |
| ORM                            | **Drizzle ORM**                                                | Type-safe, first-class with Neon and migrations. (Prisma also works via adapter; Drizzle is lighter for serverless.)                                                                                                                                       |
| DB connection                 | **`node-postgres` (`pg`) + Pool + `attachDatabasePool`**       | With Vercel Fluid, the recommended method today is TCP + connection pooling. `@neondatabase/serverless` (HTTP/WebSocket) remains an alternative for edge or high-cold-start workloads. **Don't use `@vercel/postgres`** (deprecated after the Neon migration). |
| Auth                           | **Better Auth**                                                 | See section 6 — there's an important gotcha with Discogs.                                                                                                                                                                                                    |
| Validation                     | **Zod**                                                        | Validate payloads from external APIs and forms/Server Actions.                                                                                                                                                                                              |
| UI                             | Tailwind + (shadcn/ui optional)                                | TBD.                                                                                                                                                                                                                                                          |
| External data fetching/caching | `fetch` with Next's `revalidate` + cache table in Neon         | See section 7.                                                                                                                                                                                                                                                |

> ⚠️ **Infrastructure note:** Vercel discontinued "Vercel Postgres" and migrated all stores to Neon between Q4 2024 and Q1 2025. The `@vercel/postgres` SDK "still works" but is no longer maintained. For a new project, provision Postgres from the Marketplace (Neon) and use the Neon driver or `pg`.

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Client (browser)                    │
│   React Server Components + Client Components (Next 16)   │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│                    Next.js on Vercel                       │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Server       │  │ Server        │  │ Route Handlers  │  │
│  │ Components   │  │ Actions       │  │ (/api/*)        │  │
│  │ (reads)      │  │ (mutations)   │  │ (webhooks/cron) │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                 │                    │          │
│  ┌──────▼─────────────────▼────────────────────▼───────┐ │
│  │              Service / data layer                    │ │
│  │  - collectionService   - recommendationService       │ │
│  │  - wrappedService      - discogsClient / lastfmClient │ │
│  └──────┬───────────────────────────────┬───────────────┘ │
│         │                               │                 │
└─────────┼───────────────────────────────┼─────────────────┘
          │                               │
   ┌──────▼──────┐                 ┌──────▼──────────────────┐
   │  Neon        │                 │  External APIs          │
   │  (Postgres)  │                 │  - Discogs (primary)    │
   │  Drizzle ORM │                 │  - Last.fm (similar)    │
   │              │                 │  - MusicBrainz (meta)   │
   └──────────────┘                 └─────────────────────────┘
```

**Principles:**

- **Reads** in Server Components (RSC), directly against Neon.
- **Mutations** via Server Actions (add/remove a record, sync, etc.).
- **Sync jobs** with external APIs: preferably in Route Handlers / Vercel Cron, not during render.
- **Cache in Neon** whatever comes from Discogs/Last.fm so we don't depend on rate limits on every request.

---

## 3. Data model (Neon Postgres)

Proposed schema. Split into three blocks: **auth**, **cached catalog**, and **user data**.

### 3.1 Auth

- Use Better Auth for the implementation
- No need to implement it directly, but leave room for Google OAuth

### 3.2 Catalog (Discogs/MusicBrainz cache — shared across users)

- `releases` — `discogs_release_id` (PK/unique), `master_id`, `title`, `year`, `country`, `thumb_url`, `cover_url`, `formats` (jsonb), `data_quality`, `fetched_at`
- `artists` — `discogs_artist_id`, `name`, `profile`, `image_url`, `fetched_at`
- `release_artists` — join (`release_id`, `artist_id`, `role`, `join_order`)
- `labels` — `discogs_label_id`, `name`
- `release_labels` — join (`release_id`, `label_id`, `catno`)
- `genres` / `styles` — normalized or stored as `text[]`/jsonb in `releases` (for the MVP, arrays in `releases` are enough)

### 3.3 User data

- `user_profiles` — `user_id` (FK), `discogs_username`, `lastfm_username`, `preferences` (jsonb)
- `collection_items` — `id`, `user_id`, `release_id`, `added_at`, `rating`, `notes`, `folder`, `media_condition`, `sleeve_condition`, `purchase_price`, `purchase_date`, `purchase_location`, `source` (`manual` | `discogs_sync`)
- `wantlist_items` — `id`, `user_id`, `release_id`, `added_at`, `notes`
- `recommendations` — `id`, `user_id`, `release_id` (or `master_id`), `score`, `source` (`discogs_cooccurrence` | `lastfm_similar` | `spotify_seed`), `reason`, `generated_at`, `dismissed`
- `artist_similarity` — Last.fm cache: `artist_id`, `similar_artist_name`, `match_score`, `fetched_at`
- `sync_logs` — `id`, `user_id`, `source`, `status`, `started_at`, `finished_at`, `items_synced`, `error`

**Design notes:**

- The "Wrapped" is pure aggregation over `collection_items` + `releases` (favorite decade, most-collected label, top artist, etc.). No ML required. Can be computed on-the-fly or materialized into a `wrapped_snapshots` table if it gets heavy.
- Always store `fetched_at` in the catalog to allow revalidating against Discogs with a TTL.
- Minimum indexes: `collection_items(user_id)`, `releases(master_id)`, `recommendations(user_id, dismissed)`.

> **Note:** `discogs_token_encrypted` was removed from `user_profiles` and `TOKEN_ENCRYPTION_KEY` from env vars — see section 6b, the Discogs API key is now project-wide, not per-user.

---

## 4. External data sources (verified)

| Source                               | Use                                                                                                  | Auth                                                                       | Rate limit / notes                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Discogs API** (REST v2, JSON)        | Primary catalog (16M+ releases), user collection and wantlist, community "have/want" stats            | Basic search without auth; a **project-wide** token/consumer key covers all calls (see 6b) | Requires a unique `User-Agent` on every request. Rate limit per token/IP — cache in Neon. Monthly CC0 dumps exist if a local base is ever needed.                    |
| **Last.fm API**                        | `artist.getSimilar` for recommendations; bios/tags                                                     | Free API key                                                                   | Free tier up to ~5 req/s.                                                                                                                                          |
| **MusicBrainz + Cover Art Archive**    | Enrich metadata / cover fallback                                                                       | No auth for basic queries                                                      | ~1 req/s per IP — supplementary only, not a high-volume source.                                                                                                    |
| **Spotify**                            | (taste seed: top artists/tracks)                                                                       | OAuth 2.0                                                                       | ⏸️ **Deferred.** Reminder: Spotify deprecated the Recommendations endpoint and audio-features for new apps; only usable to read top tracks/artists as a seed. |

---

## 5. Recommendation engine (F2, no Spotify)

No-heavy-ML strategy for the MVP:

1. **Discogs metadata co-occurrence** — from genre/style/label/era in your collection, find releases with a similar profile.
2. **Last.fm's `artist.getSimilar`** — for each artist in your collection, fetch similar artists and look up their releases on Discogs. Cache in `artist_similarity`.
3. **Discogs "community have/want" stats** — free proxy for collaborative filtering (what people with similar collections have/want).
4. **(Future)** Add Spotify top artists/tracks as an additional seed.

Output → `recommendations` table with a combined `score` and human-readable `reason` ("because you have records from label X / artists similar to Y").

---

## 6. Authentication architecture ⚠️

There are two distinct "logins" that shouldn't be mixed:

**a) App login (user identity)**

- Use **Auth.js v5** with a modern OAuth 2.0 provider (Google or GitHub).
- Unified config: a single `NextAuth()`, `auth()` function, `AUTH_*` env prefix, route handler at `app/api/auth/[...nextauth]/route.ts`.
- Drizzle adapter → sessions/users in Neon.
- **Alternative:** _Better Auth_ — currently the most recommended option for new projects that want sessions in their own DB and full data ownership. Auth.js works fine too; it's a matter of preference.

**b) Discogs connection (to read catalog/collection data) — IMPORTANT GOTCHA**

- Discogs uses **OAuth 1.0a** to act on behalf of a user.
- **Auth.js v5 dropped OAuth 1.0 support** → "Login with Discogs" **cannot** be used as a native Auth.js provider.
- **Decision:** users should **not** have to enter their own Discogs API key/token. Use a **single project-wide Discogs consumer key/secret** (or personal access token) stored server-side as env vars (`DISCOGS_CONSUMER_KEY` / `DISCOGS_CONSUMER_SECRET`), used for all catalog search/lookup calls regardless of which user is browsing. This covers search and read-only catalog data, which is all F1/F2 need for the search-and-match flow.
- **Scope note:** a project-wide token can search/read the public catalog, but it **cannot** read or write an individual user's *own* Discogs collection/wantlist (that still requires that user's personal OAuth grant). Since this app manages the collection in its own DB rather than mirroring the user's Discogs account, this is not a blocker for F1/F2 — just don't build a "sync my Discogs collection" feature on top of the shared key.
- **Future:** if per-user Discogs collection sync is ever wanted, implement full 3-legged OAuth 1.0a per user at that point — not needed for the MVP.

**Security (CVE-2025-29927):** don't rely solely on `proxy.ts`/middleware to protect routes — it's bypassable by spoofing headers. Validate the session inside protected Server Components, Server Actions, and Route Handlers too.

---

## 6b. Adding records: search + photo recognition

Two entry paths for adding a record to the collection, both feeding the same manual-entry form as a prefill/confirm step (user always gets to review/edit before saving):

1. **Discogs/Last.fm search** — a search box (title/artist/catalog number) that queries the Discogs API (via the shared project key from 6b) and optionally Last.fm for artist metadata. User picks a result from a list of matches, the app prefills release/artist/label/year/cover, and the user confirms or edits before saving to `collection_items`.
2. **Photo recognition** — user takes/uploads a photo of a record (cover or label). The app should:
   - Try Discogs' image search first if/when available, otherwise fall back to a general image-recognition step (e.g. OCR on the label/spine text or a vision API) to extract candidate title/artist text.
   - Feed extracted text into the same Discogs search used in (1) to get a ranked list of candidate matches.
   - Let the user pick the correct match (or fall back to manual entry if nothing matches).

**Open question:** which vision/OCR provider to use for photo recognition (see section 11).

---

## 7. Caching, rate limits and sync

- **Cache in Neon** everything coming from Discogs/Last.fm (catalog tables with `fetched_at` + TTL).
- Use Next's `revalidate` for read-only responses where applicable.
- **Discogs catalog sync:** do it in a Route Handler / Server Action with pagination, tracking progress in `sync_logs`. Don't sync during page render.
- Respect Discogs' mandatory `User-Agent` and limit concurrency to avoid hitting the shared project key's rate limit.
- Consider **Vercel Cron** to periodically revalidate recommendations / metadata.

---

## 8. Proposed folder structure

```
/app
  /(marketing)          # public landing page
  /(app)                # authenticated routes
    /collection         # F1 - collection grid
    /wrapped            # F1 - stats
    /recommendations    # F2
    /settings           # connect Last.fm, preferences
  /api
    /auth/[...nextauth]/route.ts
    /search/discogs/route.ts      # catalog search (shared key)
    /recognize/route.ts           # photo recognition
    /cron/refresh/route.ts        # Vercel Cron
/lib
  /db
    schema.ts           # Drizzle schema
    client.ts           # Pool + attachDatabasePool
    queries/            # reusable queries
  /discogs              # Discogs client + types (shared project key)
  /lastfm               # Last.fm client
  /vision                # photo recognition client
  /auth.ts              # Auth.js config
  /services             # collection / wrapped / recommendation
proxy.ts                # route protection (Next 16)
drizzle.config.ts
```

---

## 9. Roadmap / Checklist

### Phase 1 — Feature 1: Collection + Wrapped (MVP)

- [ ] **Photo recognition**: capture/upload flow → OCR/vision extraction → feed into Discogs search → user confirms match — deferred out of this MVP pass (see open decisions)

### Phase 2 — Feature 2: Recommendations (no Spotify)

- [ ] Add Discogs "community have/want" signal
- [ ] (Optional) Vercel Cron to refresh recommendations

### ⏸️ Deferred — Spotify login (future phase)

- [ ] OAuth 2.0 with Spotify via Auth.js (native provider, this one is OAuth 2.0)
- [ ] Read top artists/tracks (3 time ranges) as a taste seed
- [ ] Integrate Spotify seed into `recommendationService` (`source = spotify_seed`)

### ⏸️ Deferred — Feature 3 (future phase)

- [ ] **Record store map**: Google Places API + hand-curated listing (Ragged Music Discos, Black Records, Eureka, etc.)
- [ ] **Marketplace/trading**: **don't** build from scratch — link out to Discogs Marketplace / MercadoLibre
- [ ] **"Pokédex"**: keep scoped (discography of your top artists or a curated "essentials" list), not the full 16M global catalog

---

## 10. Environment variables

```
# Neon (auto-provisioned by the Vercel integration)
DATABASE_URL=              # pooled (app queries)
DATABASE_URL_UNPOOLED=     # direct (migrations)

# Auth.js v5
AUTH_SECRET=
AUTH_URL=
AUTH_GITHUB_ID=            # or AUTH_GOOGLE_ID
AUTH_GITHUB_SECRET=        # or AUTH_GOOGLE_SECRET

# External APIs — project-wide, not per-user
DISCOGS_CONSUMER_KEY=      # from the app registered on Discogs
DISCOGS_CONSUMER_SECRET=
DISCOGS_USER_AGENT=        # e.g. "VinylApp/1.0 +https://yourapp.com"
LASTFM_API_KEY=

# Photo recognition (vision/OCR provider — TBD, see section 11)
VISION_API_KEY=
```

---

## 11. Open decisions / TBD

- [x] Auth.js v5 or Better Auth? → **Better Auth**, Drizzle adapter, Google OAuth
- [x] Wrapped computed on-the-fly or materialized in `wrapped_snapshots`? → **on-the-fly**, revisit if it gets slow
- [ ] Normalize genres/styles into tables or keep them as arrays in `releases`? → **MVP: arrays**
- [x] Connection driver: `pg` + pool (new default) or `@neondatabase/serverless` HTTP? → **`pg` + Pool + `attachDatabasePool`**, per section 1
- [ ] Which vision/OCR provider for photo recognition (Google Cloud Vision, AWS Rekognition, a multimodal LLM, Discogs image search if it becomes available)? — moot until photo recognition is picked back up

---

## 12. Mobile UX/UI improvements (audit — July 2026)

Findings from a code audit of every route. Ordered by priority; file references point at the code to change.

### P0 — broken or unusable on touch devices

- [x] **Sign out is unreachable on mobile.** The account menu in `app/(app)/AppNav.tsx` opens only via `onMouseEnter`/`onMouseLeave`; on touch there is no hover, and tapping the avatar navigates straight to the profile. The mobile hamburger menu only lists the four nav links + Search — no Profile, Settings, or Sign out. Fix both:
  - Make the account menu click-toggled (with outside-tap + Escape dismiss), not hover-only.
  - Add Profile / Settings / Sign out entries to the mobile drawer.
- [x] **iOS auto-zoom on form fields.** Any input rendering below 16px makes iOS Safari zoom the viewport on focus. Affected: collection filter inputs (`CollectionFiltersForm.tsx`, `text-sm` form), the `Field` components in `collection/add/AddReleaseForm.tsx` and `collection/[itemId]/edit/page.tsx` (inputs inherit `text-sm` from the label wrapper), and the friends search input. Fix: ensure all inputs/selects are ≥16px (`text-base`) at mobile widths. (`ExploreSearch.tsx` already does this correctly with `text-base`.)

### P1 — high-friction on mobile

- [x] **Touch targets below ~44px** throughout:
  - Hamburger button is `h-8 w-8` (32px) — `AppNav.tsx`.
  - Card actions are small underlined text links: Edit/Remove (`collection/page.tsx`), Move to collection/Remove (`wishlist/page.tsx`), Add/Wishlist/Details (`DiscoveryAlbumCard.tsx`), Wishlist (`users/[userId]/page.tsx`).
  - Genre chips `px-3 py-1` (~28px tall) in `ExploreTab.tsx`; selection checkbox `h-4 w-4` (16px) in `AddReleaseForm.tsx`; toast dismiss `×` in `ToastProvider.tsx`.
  - Fix: give interactive elements `min-h-11`-equivalent hit areas (padding or invisible expanded hit area), keep visual size if desired.
- [x] **Destructive "Remove" has no confirmation or undo** (`collection/page.tsx`, `wishlist/page.tsx`). One stray tap deletes a record. Add a confirm step, or better on mobile: perform the action with an "Undo" toast (toast infra already exists).
- [x] **No pending/disabled state on server-action forms.** Album page Add to collection / Wishlist / Dismiss (`album/[id]/page.tsx`), Follow/Unfollow (`friends/page.tsx`, `users/[userId]/page.tsx`), Remove/Move on collection & wishlist. On slow mobile networks nothing visibly happens, inviting double-taps and duplicate submissions. Add a shared `useFormStatus` submit-button component (spinner + `disabled`) and use it in all action forms.
- [x] **Missing route-level loading states.** Only `artist/[id]/loading.tsx` exists. `album/[id]` fetches Discogs + Last.fm during render — on mobile this is a multi-second blank screen. Add `loading.tsx` skeletons for `album/[id]`, `collection`, `wishlist`, `friends`, and `users/[userId]`.
- [x] **Consider a fixed bottom tab bar on mobile** (Collection · Wishlist · Discover · Friends, avatar for profile) replacing the hamburger: one-tap section switching is the standard pattern for a 4-section app. Include `env(safe-area-inset-bottom)` padding. Also add safe-area padding to the sticky selection bar in `AddReleaseForm.tsx` (`bottom-4`) and the toast container (`bottom-4`) so they clear the iOS home indicator.
- [x] **Collection filters stack awkwardly on small screens.** Four inputs + Filter button wrap into a tall multi-row block pushing the grid below the fold (`CollectionFiltersForm.tsx`). Collapse behind a "Filters" disclosure (or bottom sheet) on mobile, show active-filter count on the trigger, and auto-submit the sort `<select>` on change so the separate Filter/Apply button isn't needed.
- [x] **Explore genre chips wrap into many rows** on narrow screens and the sort form (`ml-auto`) drops unpredictably (`ExploreTab.tsx`). Make the chip row horizontally scrollable (`overflow-x-auto` + scroll snap, no visible scrollbar) on mobile; same trick for profile/discover tab bars if labels grow.

### P2 — polish & consistency

- [x] **Dark-mode gaps.** Many surfaces have no `dark:` variant and render light-on-dark artifacts: collection/wishlist/profile card borders (`border-zinc-200`) and cover placeholders (`bg-zinc-100`), profile record-count & "Follows you" badges, follower "Following" pill, `WrappedSection` stat cards & bars. Inactive nav/tab links use `text-zinc-600` with no dark variant (`AppNav.tsx` NavLinks, `TabBar.tsx`, ProfileTabs) → poor contrast on dark backgrounds. Sweep once, add variants everywhere.
- [x] **Font inconsistency.** `globals.css` sets `body { font-family: Arial, Helvetica, sans-serif }` while `app/layout.tsx` loads Geist and wires it into `--font-sans`. Geist is effectively unused. Decide (probably Geist) and remove the override.
- [x] **Images are raw `<img>` with no lazy-loading, `sizes`, or srcset** — heavy on mobile data for cover grids. Minimum: `loading="lazy"` + `decoding="async"` on grid covers. Better: `next/image` with `images.remotePatterns` for Discogs/Last.fm image hosts in `next.config.ts`.
- [x] **Tap feedback.** All interaction styling is `hover:`-only, which does nothing on touch. Add `active:` states (e.g. `active:scale-[0.98]` / `active:opacity-70`) to buttons, cards, and chips.
- [x] **Menu a11y.** Hamburger and account menus need `aria-expanded`/`aria-controls`, Escape-to-close, and outside-tap dismiss (`AppNav.tsx`).
- [x] **Friends rows cram at 375px.** Identity + "View collection" + Follow/Unfollow compete on one line (`friends/page.tsx` rows). Let actions wrap below the identity block on small screens (`flex-wrap` or `sm:` split).
- [x] **`autoFocus` on the add-record search** (`AddReleaseForm.tsx`) pops the keyboard and can scroll-jump on mobile page load. Intentional? Consider only focusing on desktop widths. Also `text-center` on that input is odd once you type a long query.
- [x] **Landing CTAs are visually identical** solid-black "Log in" and "Sign up" (`(marketing)/page.tsx`) — differentiate primary vs secondary.
- [x] **Album page action row** (`album/[id]/page.tsx`): on mobile consider full-width stacked primary/secondary buttons instead of a wrapping inline row; "Dismiss" always sends `returnTo=/recommendations` even when you arrived from collection/wishlist — align it with the origin-aware `returnTo` used by the other two actions.

---

## 13. Overall project gaps (beyond mobile)

- [x] **No error boundaries.** No `error.tsx`, `global-error.tsx`, or custom `not-found.tsx` anywhere — a failed Discogs/Last.fm call or server-action error shows Next's default screen. Add friendly error pages with a retry affordance.
- [x] **Metadata is a stub.** Title and description are both "VinylOS" (`app/layout.tsx`); no per-page titles (`generateMetadata` for album/artist/profile pages), no Open Graph/Twitter cards (matters for the "Invite friends" share link), no `apple-touch-icon`, `theme-color`, or web app manifest. A minimal PWA manifest would suit the "check my collection at the record store" use case.
- [x] **Tests exist but nothing runs them.** `*.test.mjs` files sit next to components, but `package.json` has no `test` script and there's no CI. Add `"test": "node --test"` (or equivalent) and a GitHub Actions workflow running lint + test + build on PRs.
- [x] **Can't search your own collection.** Filters cover genre/year/label, but there's no free-text search by title/artist — the #1 in-store mobile question is "do I already own this?". Add a search input to `/collection` (and consider including owned records in the global search with an "In collection" badge).
- [x] **Ratings are collected but never shown.** `rating` is editable (`collection/[itemId]/edit`) but doesn't appear on collection cards, the album page, or as a sort/filter. Surface it or drop the field.
- [x] **No pagination/virtualization on the collection grid** — every record renders at once; will degrade with large collections, especially on mobile.
- [x] **`proxy.ts` matcher is incomplete.** It fast-redirects `/collection`, `/friends`, `/users` only — `/wishlist`, `/recommendations`, `/album`, `/artist`, `/settings` fall through to the server-side session check (still secure via `requireSession`, but a slower, inconsistent bounce). Add the missing paths.
- [x] **Shared profile links dead-end at login.** "Invite friends" shares `/users/:id`, but that page requires a session — a non-user lands on the login form with zero context. Consider a public read-only profile (or a teaser + sign-up pitch) for shared links.
- [x] **README is still create-next-app boilerplate.** Document actual setup: pnpm, required env vars (Discogs/Last.fm keys, `DATABASE_URL`), `pnpm db:push` workflow, and the auth setup.
- [ ] **Open roadmap items** (carried from section 9): photo-recognition add flow, Discogs have/want signal for recommendations, optional Vercel Cron refresh.
