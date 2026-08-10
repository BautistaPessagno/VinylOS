/**
 * One-off backfill: give existing artists their Discogs id.
 *
 * `/artist/[id]` is keyed on the Discogs artist id. Rows created before
 * lib/discogs/mapRelease.ts started carrying `artistRefs` have none, so their
 * pages are unreachable and absent from the sitemap. This walks the releases we
 * already know the Discogs id for and fills the gap from the release payload.
 *
 * Read-mostly and idempotent: only ever sets a column that is currently NULL.
 *
 *   node scripts/backfill-artist-discogs-ids.mjs --dry-run
 *   node scripts/backfill-artist-discogs-ids.mjs
 *
 * Discogs allows 60 authenticated requests/minute; this sleeps 1.1s between
 * calls, so a few hundred releases takes a few minutes.
 */
import "dotenv/config";
import pg from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
const RATE_LIMIT_MS = 1100;

const token = process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET;
if (!token) {
  console.error("Missing DISCOGS_CONSUMER_KEY / DISCOGS_CONSUMER_SECRET");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRelease(id) {
  const res = await fetch(`https://api.discogs.com/releases/${id}`, {
    headers: {
      "User-Agent": process.env.DISCOGS_USER_AGENT ?? "VinylOS/1.0",
      Authorization: `Discogs key=${process.env.DISCOGS_CONSUMER_KEY}, secret=${process.env.DISCOGS_CONSUMER_SECRET}`,
    },
  });
  if (!res.ok) throw new Error(`Discogs ${res.status} for release ${id}`);
  return res.json();
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
await client.connect();

const { rows: releases } = await client.query(`
  select distinct r.discogs_release_id
  from releases r
  join release_artists ra on ra.release_id = r.id
  join artists a on a.id = ra.artist_id
  where r.discogs_release_id is not null and a.discogs_artist_id is null
  order by r.discogs_release_id
`);

console.log(`${releases.length} releases to inspect${DRY_RUN ? " (dry run)" : ""}`);

let updated = 0;
for (const [index, row] of releases.entries()) {
  const releaseId = row.discogs_release_id;
  try {
    const detail = await fetchRelease(releaseId);
    for (const artist of detail.artists ?? []) {
      const { rowCount } = DRY_RUN
        ? await client.query(
            `select 1 from artists where lower(name) = lower($1) and discogs_artist_id is null`,
            [artist.name],
          )
        : await client.query(
            `update artists set discogs_artist_id = $1
             where lower(name) = lower($2) and discogs_artist_id is null`,
            [artist.id, artist.name],
          );
      if (rowCount > 0) {
        updated += rowCount;
        console.log(`  ${DRY_RUN ? "would set" : "set"} ${artist.name} -> ${artist.id}`);
      }
    }
  } catch (error) {
    console.warn(`  skipped release ${releaseId}: ${error.message}`);
  }
  if (index < releases.length - 1) await sleep(RATE_LIMIT_MS);
}

console.log(`${DRY_RUN ? "Would update" : "Updated"} ${updated} artists.`);
await client.end();
