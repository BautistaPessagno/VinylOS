# Unified Discogs Search Design

**Date:** 2026-07-10
**Status:** Approved for implementation
**Scope:** Add-record search, Discover/Explore search, global navigation search entry, and artist detail pages

## Objective

Make record discovery reliable and efficient across VinylOS. Search must behave case-insensitively, return both artists/bands and vinyl records, provide a Spotify-like mixed result hierarchy, and let users open an artist page containing that artist's Discogs vinyl catalog.

Discogs is the catalog authority for both artist and record results. Last.fm remains optional enrichment for existing album-detail copy only; it is not part of the new search path.

## Success Criteria

1. Queries that differ only by case or surrounding/repeated whitespace resolve to the same normalized search and cached result.
2. Add-record search waits for at least two meaningful characters, debounces input, does not repeat an identical request, and never lets an older response replace a newer one.
3. The desktop and mobile `+ Add` navigation actions are replaced by an accessible magnifier linking to focused Explore search.
4. Explore retains genre browsing when search is empty and switches to mixed Discogs results for a valid query.
5. Mixed results include artists/bands and grouped vinyl albums, with a visually prominent best artist match when available.
6. Selecting an artist opens `/artist/[id]` using the stable Discogs artist ID.
7. The artist page displays Discogs identity data and paginated vinyl albums; selecting an album resolves a representative Discogs vinyl pressing, caches it locally, and opens the existing VinylOS album page.
8. Empty, loading, no-result, rate-limit, and general failure states give concise guidance without replacing valid newer results.
9. Focused regression tests, lint, and the production build pass.
10. No database migration or unrelated refactor is introduced.

## Architecture

### Shared query normalization

A small pure helper will normalize search input with Unicode NFKC normalization, trimming, internal whitespace collapse, and lowercase conversion. The normalized value is the request/cache key; the trimmed human-entered value may remain visible in the input.

Normalization is applied at both boundaries:

- Client components use it to decide whether to search and to avoid duplicate requests.
- Server actions and Discogs service functions normalize again so callers cannot bypass the invariant.

Two normalized characters are required before a remote request. This prevents broad one-character Discogs searches and reduces rate-limit pressure.

### Discogs client

The existing Discogs module will gain focused functions rather than a new abstraction layer:

- Search artists by normalized free text.
- Search vinyl releases and group editions by master ID, preserving the representative release ID used by current Add/Wishlist flows.
- Fetch an artist by Discogs ID.
- Fetch an artist's vinyl albums page using the canonical Discogs artist name, exact artist filtering, vinyl format filtering, and server-side pagination.

Discogs fetches keep bounded Next.js revalidation. Response schemas will validate artist identity, artist search, and paginated catalog shapes before UI code consumes them.

The artist page route uses the Discogs ID for identity. Its catalog query uses the canonical artist name returned by that ID, because Discogs database search supplies the vinyl format filter while the artist-releases endpoint includes non-vinyl work and secondary credits.

### Search orchestration

Explore search runs artist and vinyl-album searches concurrently and returns a single typed result object. It does not write to the database. A record is fetched in detail and cached only when the user opens, adds, or wishlists it, matching the existing lazy Explore behavior.

Add-record search continues to request only grouped vinyl albums, but adopts the shared normalization and client request controls.

## User Experience

### Navigation

The desktop `+ Add` button and mobile `+ Add` menu item become a magnifier icon with the accessible label `Search records and artists`. It links to:

`/recommendations?tab=explore&focus=search`

Explore reads `focus=search` only to focus the input on arrival. The Add Record route remains available through existing collection flows and direct links.

### Explore

The search field sits above the existing Explore genre chips.

- Empty query: show the current genre chips and album grid unchanged.
- One normalized character: show a prompt to enter at least two characters; make no network request.
- Two or more characters: after a short debounce, show mixed results.

Mixed results follow the reference hierarchy without copying Spotify styling:

1. `Top result`: the highest-ranked Discogs artist in a wider identity card.
2. `Artists`: remaining artist/band matches in compact image cards.
3. `Records`: grouped vinyl albums in the existing VinylOS card language, with Add, Wishlist, and Details actions.

On narrow screens the sections stack and remain fully keyboard accessible. Search results replace genre content only while a valid query is active. Clearing search immediately restores genre browsing.

### Add Record

The current layout and batch selection remain intact. Search behavior changes as follows:

- Debounce a normalized query.
- Skip queries shorter than two characters.
- Cache results by normalized query for the life of the component.
- Reuse a pending identical request instead of starting another.
- Assign each request a monotonically increasing sequence and commit results/errors only when its sequence is still current.
- Clear searching/error state when the query becomes invalid.

This directly addresses excessive requests, case-fragmented caching, and the stale-response race in the current effect.

### Artist Detail

`/artist/[id]` is an authenticated server page with:

- Back navigation to focused Explore search.
- Discogs artist image, canonical name, and profile.
- A `Records` grid containing grouped vinyl albums.
- URL-driven pagination so the entire Discogs vinyl catalog remains reachable and page loads stay bounded.

Album cards submit the existing lazy-resolution flow using artist name and album title. Successful resolution redirects to `/album/[localReleaseId]`; Add and Wishlist continue to use the same cached local release and existing mutations.

## Data Flow

### Explore query

1. User enters text.
2. Client normalizes and validates the query.
3. After debounce, one authenticated server action launches Discogs artist and vinyl searches concurrently.
4. The client accepts the response only if it belongs to the current request sequence.
5. UI renders Top result, Artists, and Records.

### Artist selection

1. Artist result links to `/artist/[discogsArtistId]`.
2. Server fetches the Discogs artist, then the requested vinyl catalog page using its canonical name.
3. Page renders identity and album groups plus previous/next pagination links.
4. Album selection resolves/caches a representative vinyl release and redirects to the local album detail.

### Add-record query

1. User enters text.
2. Client normalizes it and consults its local result/promise cache.
3. A cache miss calls the normalized authenticated server action.
4. Only the latest request sequence may update results or error state.

## Error and Empty States

- Invalid/short query: no remote request; show concise input guidance only where useful.
- No mixed results: `No artists or records found for “…”`.
- No artist catalog records: explain that Discogs has no vinyl matches for this artist.
- Discogs 429: retain the explicit retry-later message already produced by the client.
- Other Discogs/network failure: show `Search is unavailable right now. Try again.` while keeping the input editable.
- A failed stale request is ignored if a newer request has started.
- Invalid artist ID or missing Discogs artist: use the existing Next.js not-found behavior.

## Accessibility and Visual Direction

The feature extends VinylOS's existing neutral surfaces, red active accent, compact record cards, and light/dark modes. The distinctive element is the wider artist identity card contrasted with the denser record grid, reflecting the supplied search reference without cloning it.

Requirements:

- Inline SVG magnifier; no icon dependency.
- Visible focus treatment on search, result links, icon link, and pagination.
- Labels and live status text for searching/result counts.
- Decorative result images use empty alt text; identity and album images use meaningful alt text where they convey content.
- No motion beyond existing transitions, so reduced-motion behavior remains intact.

## Testing and Verification

Implementation follows red-green-refactor for independently testable behavior.

Focused tests will cover:

- Unicode/case/whitespace query normalization and minimum length.
- Discogs album grouping and representative release preservation.
- Artist and artist-catalog response mapping/pagination.
- Latest-request acceptance and stale-response rejection as a pure state decision.
- Source-level or rendered assertions for the navigation search link and Explore result sections when the current lightweight Node test setup cannot mount React components.

Final verification:

1. Run all Node tests.
2. Run `pnpm lint`.
3. Run `pnpm build`.
4. Exercise Add search with case variants and rapid typing.
5. Exercise Explore artist/record search, artist navigation, pagination, and album resolution at desktop and mobile widths.
6. Confirm the diff contains no schema change or unrelated cleanup.

## Constraints

- Do not run database migrations. No schema change is expected.
- Preserve Add Record manual entry, batch selection, edition picker, Add, and Wishlist behavior.
- Preserve Explore genre browsing when no search is active.
- Preserve existing local album detail and mutations.
- Avoid new dependencies unless implementation proves an existing platform API insufficient.
- Keep changes scoped to search, navigation, Discogs mapping, Explore, artist detail, tests, and required documentation.
