#!/usr/bin/env node
// Projects data/stores-amba.json into the stores table.
// Run with --dry to print the plan without writing.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadTs, ROOT } from "./load-ts.mjs";

const DRY = process.argv.includes("--dry");

const { storeFileSchema } = loadTs("lib/stores/storeFile.ts");
const { toStoreRows, buildSyncPlan } = loadTs("lib/stores/syncPlan.ts");

const entries = storeFileSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL("data/stores-amba.json", ROOT)), "utf8")),
);
const rows = toStoreRows(entries);

const connectionString = process.env.DATABASE_URL?.replace(
  /([?&]sslmode=)(prefer|require|verify-ca)\b/,
  "$1verify-full",
);
const pool = new pg.Pool({ connectionString });

const { rows: existing } = await pool.query(
  `SELECT slug, name, address_line AS "addressLine", neighborhood, city, province,
          postal_code AS "postalCode", lat, lng, phone, website, instagram, email,
          opening_hours AS "openingHours", tags, active
     FROM stores`,
);

const plan = buildSyncPlan(
  rows,
  existing.map((row) => ({ ...row, tags: row.tags ?? [] })),
);

console.log(
  `${plan.inserts.length} insert(s), ${plan.updates.length} update(s), ` +
    `${plan.deactivations.length} deactivation(s).`,
);
for (const row of plan.inserts) console.log(`  + ${row.slug}`);
for (const row of plan.updates) console.log(`  ~ ${row.slug}`);
for (const slug of plan.deactivations) console.log(`  - ${slug}`);

if (DRY) {
  console.log("--dry: nothing written.");
  await pool.end();
  process.exit(0);
}

const VALUES = (row) => [
  row.slug, row.name, row.addressLine, row.neighborhood, row.city, row.province,
  row.postalCode, row.lat, row.lng, row.phone, row.website, row.instagram,
  row.email, row.openingHours, row.tags,
];

for (const row of [...plan.inserts, ...plan.updates]) {
  await pool.query(
    `INSERT INTO stores (slug, name, address_line, neighborhood, city, province,
                         postal_code, lat, lng, phone, website, instagram, email,
                         opening_hours, tags, active, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,now())
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name, address_line=EXCLUDED.address_line,
       neighborhood=EXCLUDED.neighborhood, city=EXCLUDED.city,
       province=EXCLUDED.province, postal_code=EXCLUDED.postal_code,
       lat=EXCLUDED.lat, lng=EXCLUDED.lng, phone=EXCLUDED.phone,
       website=EXCLUDED.website, instagram=EXCLUDED.instagram,
       email=EXCLUDED.email, opening_hours=EXCLUDED.opening_hours,
       tags=EXCLUDED.tags, active=true, updated_at=now()`,
    VALUES(row),
  );
}

if (plan.deactivations.length > 0) {
  await pool.query(
    `UPDATE stores SET active=false, updated_at=now() WHERE slug = ANY($1)`,
    [plan.deactivations],
  );
}

console.log("Sync complete.");
await pool.end();
