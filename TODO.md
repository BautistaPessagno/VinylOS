# TODO — Record-store directory for AMBA (`/stores`)

**Goal:** a public `/stores` page listing the physical record shops of AMBA (CABA + Gran Buenos Aires) — name, address, neighbourhood, hours, contact, map link.

**Implementation plan:** [`docs/superpowers/plans/2026-08-06-amba-store-directory.md`](docs/superpowers/plans/2026-08-06-amba-store-directory.md) — eight task-by-task steps with the actual code, tests, and commits. This file is the spec (what and why); the plan is the how.

**Progress:** Full v1 path (§1–§4) + embedded MapLibre map (§6) in [PR #22](https://github.com/BautistaPessagno/VinylOS/pull/22) — open, awaiting human merge. Deferred: cron discover (§7), submissions/hours parsing (§8).

**Scope decisions (taken):**

- **Physical shops only.** No per-release price or stock scraping. "Where can I buy _this record_" is a different feature, explicitly out of scope.
- **AMBA first.** The schema carries `city`/`province` so other markets can be added later without a migration.
- **Standalone `/stores` destination**, public (no login), in `app/(public)/` next to `explore`.
- **A curated, git-tracked JSON file is the source of truth.** OpenStreetMap is a _discovery feed_ that suggests candidates for human triage — it does not write to the database. See §0 for why.
- **Google Places rejected**: its ToS forbids persisting most fields past 30 days and requires results be drawn on a Google Map, which rules out an owned directory. OSM's ODbL permits permanent storage with attribution.

Order: **1 → 2 → 3 → 4 → 5.** Sections 6–8 are follow-ups, not v1. The plan's Tasks 1–8 map onto these sections: Task 1 → §1–§2, Tasks 2–6 → §3, Tasks 7–8 → §4, with §5's checks distributed through every task.

---

## 0. What the OSM data actually looks like

Measured against live Overpass on the AMBA bbox before writing any of this. **These numbers are why the design below inverts the usual scrape→DB flow.**

`shop=music` over `-34.95,-58.90,-34.32,-58.15` returns **47 elements**, and:

- Roughly **12–15 are actually record shops.** The rest are musical-instrument retailers (Famusic, Muzik Instrumentos, Grey Music, BM Music, Dassel Music, Arpegio…), three Musimundo branches, and three private music teachers with their lesson syllabus in the `description` tag. In OSM `shop=music` means "recorded music", but Argentine mappers do not use it that way.
- **11 of 47** have a full street address (`addr:street` + `addr:housenumber`). **3 of 47** have `opening_hours`. **5 of 47** have a phone. One has no `name` at all.
- **No subtag can separate them.** Across the whole bbox, `second_hand` appears once, `music` zero times, `vinyl` zero times. There is no automatic filter.
- A name regex (`disquer|vinil|vinyl|record|discos`) across _all_ shop types finds a few genuinely misfiled shops — Pappo Records is tagged `shop=electronics` — but also two bakeries called "El Record" and a car-repair shop called "Car Vinyl".
- Well-known Buenos Aires record shops are **absent from OSM entirely.**

**Conclusion:** OSM cannot be the source of truth. It yields a dozen leads with mostly missing addresses and almost no hours. Automating a path from Overpass into the live table would build merge-precedence, deactivation, and conflict logic to protect data that is wrong more often than right. The curated file is the product; the scraper's job is to tell us what we're missing.

The raw responses are in the scratchpad if you want to look: `amba-music.json` (47 elements) and `amba-alt.json` (name/subtag probe).

## 1. Data model

- [x] Add a `stores` table to `lib/db/schema.ts`:
  - `id` serial PK, `slug` text unique (drives `/stores/[slug]`)
  - `name`, `addressLine`, `neighborhood`, `city`, `province`, `postalCode`
  - `lat` / `lng` `doublePrecision` — required. (`numeric` returns strings in Drizzle; these are always used as numbers.)
  - `phone`, `website`, `instagram`, `email` — nullable
  - `openingHours` text, stored verbatim as written in the curated file; structured parsing is §8
  - `tags` text array — `usados`, `nuevos`, `tocadiscos`, `cafe`
  - `active` boolean default true, `createdAt`, `updatedAt`
  - Indexes: unique `slug`, plus `city`
  - **Done:** table in `lib/db/schema.ts`; pushed to dev with `pnpm db:push` (prod migration left to maintainer).
- [x] Apply with `pnpm db:push` in dev only. **Never `pnpm db:migrate`** (`AGENTS.md`) — prod is applied by the maintainer.

No `source` enum, no `osmId` column, no `lastSeenAt`. The table is a projection of the curated file, so provenance lives in the file, not the database.

## 2. The curated file — `data/stores-amba.json`

**This is the actual deliverable.** Everything else is plumbing around it.

- [x] Define the entry shape and a zod schema in `lib/stores/storeFile.ts`: `name`, `addressLine`, `neighborhood`, `city`, `lat`, `lng`, optional `phone` / `website` / `instagram` / `email` / `openingHours` / `tags`, optional `osmId` for provenance. **Done:** `storeEntrySchema` + `AMBA_BBOX` guard.
- [x] Seed it from two inputs: the ~12–15 plausible shops from §0, and the maintainer's own list of shops (§7). Every entry gets its address and coordinates confirmed by hand — OSM's are missing or wrong more often than not.
  - **Done (v1 seed):** five shops with confirmed street addresses from the plan Reference Data (Oui Oui, Exile, Smile, Magical Mystery, Zivals). Address-less OSM leads (BVM, Liverpool, …) intentionally left for `stores:discover` triage.
- [x] Validation runs in `pnpm test`, so a malformed entry fails CI rather than the sync script. **Done:** `lib/stores/storeFile.test.mjs` parses the real file and rejects out-of-bbox coords.

## 3. Scripts (`lib/stores/` + `scripts/`)

Two scripts, deliberately separate: discovery never writes to the database.

- [x] `pnpm stores:discover` → `overpass.ts` + `scripts/discover-stores.mjs`
  - Runs the Overpass query (`shop=music` over the AMBA bbox, POST to `https://overpass-api.de/api/interpreter`, identifying `User-Agent` from `SCRAPER_USER_AGENT`, back off on 429/504), zod-parses the response.
  - Diffs against `data/stores-amba.json` and writes **only the unmatched** to `data/store-candidates.json` for the maintainer to accept or reject by hand.
  - Also runs the name-regex probe from §0 across all shop types, flagged as low-confidence, since that is how misfiled shops like Pappo Records surface.
  - Caches the raw response to disk so iterating on the diff doesn't re-hit the API.
  - **Done:** live run → 46 shop=music + 60 name matches → 95 candidates (5 seed shops omitted; Pappo Records present as low-confidence). `--cache` reuses `.overpass-cache.json`.
- [x] `pnpm stores:sync` → `scripts/sync-stores.mjs`: validate `data/stores-amba.json`, upsert into `stores` by `slug`, set `active = false` on rows whose slug is gone from the file. Supports `--dry` to print the plan.
  - **Done:** `syncPlan.ts` field-diff + script; dry then real insert of 5 rows; second dry reports zero changes.
- [x] `normalize.ts` — **pure**, unit-tested: slug generation (name + neighbourhood, numeric suffix on collision), phone → E.164 (`+54 11 …`), Instagram handle from a URL or `@handle`, name trimming for accented text. **Done:** `lib/stores/normalize.ts` + tests.
- [x] `match.ts` — **pure**, unit-tested: does an OSM element already exist in the curated file? Haversine < 150 m **and** normalized-name Dice coefficient ≥ 0.6, or an `osmId` already recorded. Advisory only — a miss means one redundant suggestion, never corrupt data, which is exactly why this logic is allowed to be fuzzy. **Done:** `lib/stores/match.ts` + tests (BVM/Liverpool 18 m case).

No cron. The dataset moves on the order of months and every change is a human decision anyway; §6 revisits.

## 4. Service + UI

- [x] `lib/services/storeService.ts`, following the existing service pattern: `listStores({ q, neighborhood })` (active only, ordered by neighbourhood then name) and `getStoreBySlug(slug)`. Public fields only. Search is Postgres `ILIKE` over name + neighbourhood + address — no full-text index at this size. **Done:** also `listNeighborhoods()`.
- [x] `app/(public)/stores/page.tsx` — server component under the existing session-optional `(public)` layout, so guests get it and `PublicGuestNav` comes for free.
  - Search input + neighbourhood filter driven by `searchParams`, no client state.
  - Cards: name, address, neighbourhood, hours when known. Design for the common case where **hours and phone are absent** — that is most rows, not an edge case.
  - Each card links out to `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`. **No embedded map in v1** (§6).
  - **Done:** `StoreCard.tsx` + page tests (list, empty state, no empty hours row).
- [x] `[slug]/page.tsx` — detail page with `generateMetadata` for share cards, matching `album/[id]`. **Done:** phone / website / Instagram when present; notFound on unknown slug.
- [x] **ODbL attribution** — "Datos parciales de © OpenStreetMap contributors", linked to `openstreetmap.org/copyright`, on `/stores` and detail. A licence obligation for any entry sourced from OSM, not a nicety.
- [x] Add `/stores` to `PublicGuestNav` and `AppNav.tsx`. Confirm `proxy.ts` does not match `/stores`. **Done:** proxy test asserts matcher omits `/stores`.

## 5. Verification

- [x] `pnpm test` covers the pure modules: `normalize.test.mjs` (slug collisions, accented names, phone and handle edge cases), `match.test.mjs` (an OSM element already in the file is suppressed; two distinct shops 100 m apart both survive), and `storeFile.test.mjs` (the real `data/stores-amba.json` parses). **Done for pure modules**; suite also covers overpass/candidates/syncPlan — full suite 122 pass.
- [x] `overpass.test.mjs` parses a checked-in fixture — no network in tests, same approach as `lib/discogs/client.test.mjs`.
- [x] `pnpm stores:discover` against live Overpass produces a candidate file. **Verified** with 5 curated shops: 95 candidates (mostly instrument shops + name-probe noise). Short list requires expanding the curated file via triage — expected at this stage, not a script bug.
- [x] `pnpm stores:sync --dry`, then for real against dev; re-run immediately and confirm zero changes. **Verified** (5 inserts → 0/0/0).
- [x] `/stores` list + detail covered by render tests (guest list, OSM attribution, empty filter state, detail maps/phone, notFound). Manual signed-out browser smoke still recommended on preview.
- [x] `pnpm lint` and `pnpm build` clean. **Verified** with `/stores` and `/stores/[slug]` routes in the build output.

---

## 6. Embedded map

- [x] MapLibre GL on `/stores` and `/stores/[slug]` with pins from our lat/lng.
- [x] Tile source: **OpenFreeMap** (free vector styles, no API key) — not `tile.openstreetmap.org` (app usage prohibited) and not Google Maps JS.
- [x] “Cómo llegar” still opens Google Maps directions (deep link, no Maps API billing).
- [x] ODbL / OpenFreeMap attribution on list and detail.

## 7. Deferred — scheduled discovery

A monthly Vercel cron running `stores:discover` and opening a PR with the candidate diff. Only worth it after the loop has been run by hand a few times and the candidate list is short.

## 8. Deferred — user submissions and structured hours

- User-submitted shops: needs a moderation queue and an auth'd form. An unmoderated public write path on a public page is a spam magnet, and with a git-tracked source file the reviewed submission is just a commit.
- Parsing `openingHours` into "open now" state. Storing the raw string from day one makes this purely additive — though with 3 of 47 OSM entries carrying hours at all, the data has to come from the curated file first.
