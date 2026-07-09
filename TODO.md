# TODO — Architecture: Vinyl Collection App

> **Target stack:** Next.js (App Router) · Vercel (hosting) · Neon (Postgres serverless)
> **Music data source:** Discogs API (primary) + Last.fm + MusicBrainz (supplementary)
> **Doc status:** architecture + implementation roadmap
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
