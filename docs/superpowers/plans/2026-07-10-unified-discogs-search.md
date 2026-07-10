# Unified Discogs Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build case-insensitive, efficient Discogs search for Add Record and Discover, with mixed artist/record results, a navigation magnifier, and paginated artist discography pages.

**Architecture:** Pure search helpers define normalization, minimum-query, grouping, and stale-response invariants. The existing Discogs client gains artist identity/search and exact-artist vinyl pagination; client components call authenticated server actions and ignore stale responses. Artist routes use stable Discogs IDs while album actions keep the existing lazy local-cache resolution.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Tailwind CSS 4, Node test runner, Discogs API.

## Global Constraints

- Do not run database migrations; no schema change is permitted.
- Preserve Add Record manual entry, batch selection, edition picker, Add, and Wishlist behavior.
- Preserve Explore genre browsing when no search is active.
- Preserve existing local album detail and mutations.
- Add no dependency unless an existing platform API proves insufficient.
- Normalize with Unicode NFKC, trim, whitespace collapse, and lowercase conversion.
- Require two normalized characters before a Discogs search.
- Keep all changes scoped to search, navigation, Discogs mapping, Explore, artist detail, tests, and required documentation.

---

### Task 1: Shared Search and Discogs Catalog Primitives

**Files:**
- Create: `lib/search/searchQuery.ts`
- Create: `lib/search/searchQuery.test.mjs`
- Create: `lib/discogs/searchResults.ts`
- Create: `lib/discogs/searchResults.test.mjs`
- Modify: `lib/discogs/types.ts`
- Modify: `lib/discogs/client.ts`

**Interfaces:**
- Produces: `normalizeSearchQuery(value: string): string`
- Produces: `isSearchQueryReady(value: string): boolean`
- Produces: `isLatestSearchRequest(requestId: number, latestRequestId: number): boolean`
- Produces: `splitDiscogsTitle(value: string): { artist: string; title: string }`
- Produces: `groupDiscogsAlbums(results: DiscogsSearchResult[]): DiscogsAlbumGroup[]`
- Produces: `searchArtists(query: string): Promise<DiscogsArtistSearchResult[]>`
- Produces: `getArtist(id: number): Promise<DiscogsArtist>`
- Produces: `searchArtistVinylAlbums(artist: string, page: number): Promise<DiscogsAlbumPage>`

- [ ] **Step 1: Write failing query-helper tests**

Test NFKC/case/whitespace equivalence, the two-character threshold, and request identity:

```js
assert.equal(normalizeSearchQuery("  CHARLY   García  "), "charly garcía");
assert.equal(normalizeSearchQuery("ＣＤ"), "cd");
assert.equal(isSearchQueryReady(" a "), false);
assert.equal(isSearchQueryReady(" AB "), true);
assert.equal(isLatestSearchRequest(4, 5), false);
assert.equal(isLatestSearchRequest(5, 5), true);
```

- [ ] **Step 2: Run the query-helper test and verify RED**

Run: `node --test lib/search/searchQuery.test.mjs`
Expected: FAIL because `lib/search/searchQuery.ts` does not exist.

- [ ] **Step 3: Implement the pure query helpers**

```ts
export const MIN_SEARCH_QUERY_LENGTH = 2;

export function normalizeSearchQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function isSearchQueryReady(value: string): boolean {
  return normalizeSearchQuery(value).length >= MIN_SEARCH_QUERY_LENGTH;
}

export function isLatestSearchRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}
```

- [ ] **Step 4: Run the query-helper test and verify GREEN**

Run: `node --test lib/search/searchQuery.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write failing Discogs mapping tests**

Cover title splitting, master grouping, representative release preservation, edition counts, artist mapping, and pagination metadata:

```js
assert.deepEqual(splitDiscogsTitle("Charly García - Clics Modernos"), {
  artist: "Charly García",
  title: "Clics Modernos",
});
const grouped = groupDiscogsAlbums([
  { id: 10, type: "release", title: "Artist - Album", master_id: 7 },
  { id: 11, type: "release", title: "Artist - Album", master_id: 7 },
]);
assert.equal(grouped[0].releaseId, 10);
assert.equal(grouped[0].editionCount, 2);
```

- [ ] **Step 6: Run the Discogs mapping test and verify RED**

Run: `node --test lib/discogs/searchResults.test.mjs`
Expected: FAIL because `searchResults.ts` does not exist.

- [ ] **Step 7: Implement mapping helpers and typed Discogs responses**

Define `DiscogsArtistSearchResult`, `DiscogsArtist`, `DiscogsAlbumPage`, pagination schemas, and artist schemas. Move grouping from `client.ts` into `groupDiscogsAlbums`, parsing the first `" - "` separator and keeping the first release as the representative pressing.

- [ ] **Step 8: Implement normalized Discogs client calls**

Use the existing `buildUrl`/`discogsFetch` path. `searchArtists` calls `/database/search` with `type=artist`; `getArtist` calls `/artists/:id`; `searchArtistVinylAlbums` calls database search with `artist=<canonical name>`, `type=release`, `format=Vinyl`, `page`, and `per_page=50`, returning grouped results plus parsed pagination.

- [ ] **Step 9: Run focused tests and type-aware lint**

Run: `node --test lib/search/searchQuery.test.mjs lib/discogs/searchResults.test.mjs`
Expected: PASS.

Run: `pnpm eslint lib/search/searchQuery.ts lib/discogs/searchResults.ts lib/discogs/types.ts lib/discogs/client.ts`
Expected: exit 0.

- [ ] **Step 10: Commit Task 1**

```bash
git add lib/search lib/discogs
git commit -m "feat: add Discogs search primitives"
```

---

### Task 2: Efficient Add Record Search

**Files:**
- Create: `app/(app)/collection/add/AddReleaseForm.test.mjs`
- Modify: `app/(app)/collection/add/AddReleaseForm.tsx`
- Modify: `app/(app)/collection/actions.ts`

**Interfaces:**
- Consumes: `normalizeSearchQuery`, `isSearchQueryReady`, `isLatestSearchRequest`
- Preserves: `searchDiscogsAction(query: string): Promise<DiscogsAlbumGroup[]>`

- [ ] **Step 1: Write a failing Add search regression test**

Compile/render or inspect the component using the repository's Node/TypeScript VM pattern. Assert it imports the shared helpers, owns result and promise caches, increments a request sequence, checks the latest request before committing state, and advertises a two-character minimum.

- [ ] **Step 2: Run the Add search regression test and verify RED**

Run: `node --test 'app/(app)/collection/add/AddReleaseForm.test.mjs'`
Expected: FAIL because the current component has no normalization/cache/sequence guard.

- [ ] **Step 3: Harden the server action boundary**

Normalize `query` inside `searchDiscogsAction`; return `[]` unless `isSearchQueryReady(normalized)`; pass only normalized text to `searchVinylAlbums`.

- [ ] **Step 4: Implement the client request controls**

Add `useRef` maps for resolved and pending searches, a monotonically increasing request ID, and latest-only state updates. Keep the current 400 ms debounce, clear invalid-query state immediately, and show `Enter at least 2 characters` for a non-empty short query.

- [ ] **Step 5: Run Add regression plus shared helper tests**

Run: `node --test 'app/(app)/collection/add/AddReleaseForm.test.mjs' lib/search/searchQuery.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add 'app/(app)/collection/add/AddReleaseForm.tsx' 'app/(app)/collection/add/AddReleaseForm.test.mjs' 'app/(app)/collection/actions.ts'
git commit -m "fix: make add record search stable"
```

---

### Task 3: Mixed Explore Search and Navigation Magnifier

**Files:**
- Create: `app/(app)/recommendations/ExploreSearch.tsx`
- Create: `app/(app)/recommendations/ExploreSearchResults.tsx`
- Create: `app/(app)/recommendations/ExploreSearchResults.test.mjs`
- Create: `app/(app)/AppNav.test.mjs`
- Modify: `app/(app)/recommendations/ExploreTab.tsx`
- Modify: `app/(app)/recommendations/page.tsx`
- Modify: `app/(app)/recommendations/actions.ts`
- Modify: `app/(app)/AppNav.tsx`

**Interfaces:**
- Produces: `searchExploreAction(query: string): Promise<ExploreSearchResult>`
- Produces: `ExploreSearchResult = { query: string; artists: DiscogsArtistSearchResult[]; albums: DiscogsAlbumGroup[] }`
- Consumes: existing Explore Add/Wishlist/Details server actions.

- [ ] **Step 1: Write failing mixed-result presentation tests**

Render `ExploreSearchResults` with one top artist, one additional artist, and one album. Assert `Top result`, `Artists`, and `Records` headings; `/artist/908651`; artist/album names; and the no-results message.

- [ ] **Step 2: Write a failing AppNav source regression test**

Assert both navigation variants use `/recommendations?tab=explore&focus=search`, include `aria-label="Search records and artists"`, include an SVG, and contain no `+ Add` label.

- [ ] **Step 3: Run both tests and verify RED**

Run: `node --test 'app/(app)/recommendations/ExploreSearchResults.test.mjs' 'app/(app)/AppNav.test.mjs'`
Expected: FAIL because the new presentation does not exist and AppNav still renders `+ Add`.

- [ ] **Step 4: Implement the authenticated mixed-search action**

Normalize and validate the query, then run `searchArtists(normalized)` and `searchVinylAlbums(normalized)` with `Promise.all`. Return the normalized query with both typed arrays; do not write catalog rows.

- [ ] **Step 5: Implement Explore search state and layout**

Build a client search field with the same debounce, cache, pending-promise reuse, and latest-request sequence invariant as Add search. `focusOnMount` focuses the input. Empty search renders the existing genre content; valid search renders the Spotify-inspired hierarchy with the wider top-artist card, compact artist row, and record grid. Preserve concise loading, short-query, no-result, and error states.

- [ ] **Step 6: Wire focused search through the page**

Read `focus` from awaited `searchParams`, pass `focus === "search"` into `ExploreTab`, and render `ExploreSearch` before the genre content.

- [ ] **Step 7: Replace both Add nav links with the magnifier**

Use an inline SVG and visible focus ring. Keep the desktop link compact and the mobile entry labeled `Search` while sharing the required accessible name.

- [ ] **Step 8: Run mixed-result, nav, and shared search tests**

Run: `node --test 'app/(app)/recommendations/ExploreSearchResults.test.mjs' 'app/(app)/AppNav.test.mjs' lib/search/searchQuery.test.mjs`
Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```bash
git add 'app/(app)/recommendations' 'app/(app)/AppNav.tsx' 'app/(app)/AppNav.test.mjs'
git commit -m "feat: add mixed Discogs discovery search"
```

---

### Task 4: Discogs Artist Detail and Vinyl Pagination

**Files:**
- Create: `app/(app)/artist/[id]/page.tsx`
- Create: `app/(app)/artist/[id]/loading.tsx`
- Create: `app/(app)/artist/[id]/page.test.mjs`

**Interfaces:**
- Consumes: `getArtist(id)` and `searchArtistVinylAlbums(artist, page)`
- Consumes: existing `addExploreAlbumAction`, `wishlistExploreAlbumAction`, and `openExploreAlbumAction`
- Route: `/artist/[id]?page=N`

- [ ] **Step 1: Write a failing artist-page source/render regression test**

Assert the page awaits both `params` and `searchParams`, validates positive integer IDs/pages, calls Discogs artist/catalog functions, renders a `Records` section, generates previous/next links, and submits album identity through the existing lazy-resolution actions.

- [ ] **Step 2: Run the artist-page test and verify RED**

Run: `node --test 'app/(app)/artist/[id]/page.test.mjs'`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the authenticated dynamic page**

Await the Next.js 16 promise props, require a session, call `notFound()` for invalid/missing artists, clamp catalog pages to the Discogs range, and render the Discogs image, canonical name, profile, grouped vinyl cards, and URL-driven pagination.

- [ ] **Step 4: Add a route loading skeleton**

Mirror the hero and album grid geometry without making remote calls so dynamic navigation has immediate feedback.

- [ ] **Step 5: Run artist, mapping, and build-time type checks**

Run: `node --test 'app/(app)/artist/[id]/page.test.mjs' lib/discogs/searchResults.test.mjs`
Expected: PASS.

Run: `pnpm eslint 'app/(app)/artist/[id]/page.tsx' 'app/(app)/artist/[id]/loading.tsx'`
Expected: exit 0.

- [ ] **Step 6: Commit Task 4**

```bash
git add 'app/(app)/artist/[id]' lib/discogs
git commit -m "feat: add Discogs artist pages"
```

---

### Task 5: Integrated Verification and Visual QA

**Files:**
- Modify only files required by concrete failures found in this task.

**Interfaces:**
- Verifies every success criterion in `docs/superpowers/specs/2026-07-10-unified-discogs-search-design.md`.

- [ ] **Step 1: Run the complete automated test suite**

Run: `node --test`
Expected: all tests pass with zero failures.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: exit 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

Run: `pnpm build`
Expected: exit 0 and successful Next.js route generation/type checks.

- [ ] **Step 4: Run local browser QA**

Start `pnpm dev`, authenticate with the existing local session, then verify:

- Nav magnifier focuses Explore search on desktop and mobile.
- `CHARLY GARCIA`, `charly garcia`, and whitespace variants share behavior.
- Rapid query replacement never shows results for the earlier query.
- Explore shows artist and record sections and clearing restores genres.
- Artist result opens its Discogs identity page; pagination links work.
- Artist record Details opens the existing local album page; Add and Wishlist still work.
- Add Record manual, batch, edition, Add, and Wishlist flows remain present.

- [ ] **Step 5: Audit scope and whitespace**

Run: `git diff 29ba0a9 --check`
Expected: no whitespace errors.

Run: `git status --short`
Expected: only intentional implementation changes, or clean after commits.

- [ ] **Step 6: Commit any verification-only fixes**

If Step 1-5 required changes, stage only those files and commit with `fix: address Discogs search verification`.
