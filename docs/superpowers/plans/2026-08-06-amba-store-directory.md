# AMBA Record-Store Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public `/stores` page listing the physical record shops of AMBA, backed by a git-tracked curated JSON file, with an OpenStreetMap discovery script that suggests shops we're missing.

**Architecture:** `data/stores-amba.json` is the source of truth. Two independent scripts flank it: `stores:discover` reads OpenStreetMap via Overpass and writes *suggestions* to `data/store-candidates.json` (never touching the database), and `stores:sync` validates the curated file and projects it into the `stores` table. All decision logic lives in pure, unit-tested modules under `lib/stores/`; the scripts are thin shells and the service layer is a straight Drizzle read.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Neon Postgres, Zod 4, Tailwind CSS 4, Node 22 test runner, Overpass API.

**Spec:** `TODO.md` at the repo root. Section numbers below (§0–§8) refer to it.

## Global Constraints

- **Never run `pnpm db:migrate`.** Dev schema changes use `pnpm db:push` only; the maintainer applies production migrations by hand (`AGENTS.md`).
- **This is not the Next.js in your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before writing route or metadata code, and heed deprecation notices.
- Tests are `*.test.mjs` run by `node --test` (Node 22.20). TypeScript modules are loaded in tests via the established `ts.transpileModule` + `vm.runInNewContext` helper — copy it verbatim from `lib/services/collectionFilterOptions.test.mjs`. Do **not** add a test framework or a TS loader.
- Scripts under `scripts/` are `.mjs` and talk to Postgres through `pg` with raw SQL. They must not import from `lib/` — the `@/` path alias does not resolve outside the Next build.
- Add no new runtime dependency. `zod`, `pg`, `drizzle-orm` and `dotenv` are already present and sufficient.
- Every entry sourced from OpenStreetMap obliges ODbL attribution on any page that displays it.
- Match the surrounding code's style: named exports, no default exports outside route files, Tailwind utility classes with `dark:` variants, comments only where intent is non-obvious.

## Reference Data

These are real values measured from live Overpass (§0) and are used verbatim in fixtures and seed data. Do not substitute invented coordinates or addresses anywhere in this plan.

| Shop | OSM id | lat | lng | Address | Neighborhood |
|---|---|---|---|---|---|
| Oui Oui Records | node/4944505488 | -34.5769646 | -58.4376601 | Soler 6090 | Palermo |
| Exile records | node/6393709423 | -34.5870069 | -58.432826 | Honduras 5270 | Palermo |
| Smile | node/11310316671 | -34.5887533 | -58.415145 | Jerónimo Salguero 1837 | Palermo |
| Magical Mystery Records | node/5307657985 | -34.5590483 | -58.4586381 | Blanco Encalada 2370 | Belgrano |
| Zivals | way/473162796 | -34.6046054 | -58.3920697 | Avenida Callao 395 | Balvanera |
| BVM Records | node/5353274192 | -34.5620761 | -58.4577683 | *(no address in OSM)* | Belgrano |
| Liverpool Discos | node/5353274195 | -34.5620046 | -58.4575964 | *(no address in OSM)* | Belgrano |

**BVM Records and Liverpool Discos sit ~18 m apart** — two genuinely distinct shops in the same Belgrano gallery. They are the load-bearing test case for Task 3: proximity alone can never dedupe, so the name check is what makes the matcher correct.

---

### Task 1: `stores` table, curated file format, and seed data

**Files:**
- Modify: `lib/db/schema.ts` (append after `userFollows`)
- Create: `lib/stores/storeFile.ts`
- Create: `lib/stores/storeFile.test.mjs`
- Create: `data/stores-amba.json`

**Interfaces:**
- Produces: `AMBA_BBOX: { south: number; west: number; north: number; east: number }`
- Produces: `storeEntrySchema` (Zod object), `storeFileSchema` (Zod array)
- Produces: `type StoreEntry = z.infer<typeof storeEntrySchema>`
- Produces: `stores` Drizzle table

- [ ] **Step 1: Write the failing schema test**

Create `lib/stores/storeFile.test.mjs`. Copy the `loadModule` helper pattern from `lib/services/collectionFilterOptions.test.mjs` verbatim, pointing at `./storeFile.ts`.

```js
test("storeFileSchema accepts a well-formed entry", () => {
  const { storeFileSchema } = loadStoreFile();
  const parsed = storeFileSchema.parse([
    {
      name: "Oui Oui Records",
      addressLine: "Soler 6090",
      neighborhood: "Palermo",
      city: "Ciudad Autónoma de Buenos Aires",
      province: "CABA",
      lat: -34.5769646,
      lng: -58.4376601,
      website: "http://www.ouioui-records.com/",
      osmId: "node/4944505488",
    },
  ]);
  assert.equal(parsed[0].name, "Oui Oui Records");
  assert.deepEqual(parsed[0].tags, []);
});

test("storeFileSchema rejects coordinates outside AMBA", () => {
  const { storeFileSchema } = loadStoreFile();
  // Swapped lat/lng is the realistic typo this guard exists to catch.
  assert.throws(() =>
    storeFileSchema.parse([
      {
        name: "Wrong Way",
        addressLine: "Soler 6090",
        neighborhood: "Palermo",
        city: "Ciudad Autónoma de Buenos Aires",
        province: "CABA",
        lat: -58.4376601,
        lng: -34.5769646,
      },
    ]),
  );
});

test("the real curated file parses", () => {
  const { storeFileSchema } = loadStoreFile();
  const raw = readFileSync(
    fileURLToPath(new URL("../../data/stores-amba.json", import.meta.url)),
    "utf8",
  );
  const entries = storeFileSchema.parse(JSON.parse(raw));
  assert.ok(entries.length > 0);
});

test("the real curated file has no duplicate osmIds", () => {
  const { storeFileSchema } = loadStoreFile();
  const raw = readFileSync(
    fileURLToPath(new URL("../../data/stores-amba.json", import.meta.url)),
    "utf8",
  );
  const ids = storeFileSchema
    .parse(JSON.parse(raw))
    .map((e) => e.osmId)
    .filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/stores/storeFile.test.mjs`
Expected: FAIL — `lib/stores/storeFile.ts` does not exist.

- [ ] **Step 3: Implement the file schema**

Create `lib/stores/storeFile.ts`:

```ts
import { z } from "zod";

/** Covers CABA plus the 24 partidos of Gran Buenos Aires. Verified against live Overpass. */
export const AMBA_BBOX = {
  south: -34.95,
  west: -58.9,
  north: -34.32,
  east: -58.15,
} as const;

export const STORE_TAGS = ["usados", "nuevos", "tocadiscos", "cafe"] as const;

const optionalText = z.string().trim().min(1).nullish();

export const storeEntrySchema = z.object({
  name: z.string().trim().min(1),
  addressLine: z.string().trim().min(1),
  neighborhood: z.string().trim().min(1),
  city: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: optionalText,
  lat: z.number().gte(AMBA_BBOX.south).lte(AMBA_BBOX.north),
  lng: z.number().gte(AMBA_BBOX.west).lte(AMBA_BBOX.east),
  phone: optionalText,
  website: z.url().nullish(),
  instagram: optionalText,
  email: z.email().nullish(),
  openingHours: optionalText,
  tags: z.array(z.enum(STORE_TAGS)).default([]),
  /** OSM provenance, e.g. "node/4944505488". Absent for shops added by hand. */
  osmId: optionalText,
});

export const storeFileSchema = z.array(storeEntrySchema);

export type StoreEntry = z.infer<typeof storeEntrySchema>;
```

- [ ] **Step 4: Create the seed data file**

Create `data/stores-amba.json` with exactly the five shops from the Reference Data table that have a confirmed street address. The other AMBA shops OSM knows about lack addresses and will surface through `stores:discover` (Task 5) for the maintainer to complete by hand — that is the intended loop, not an omission.

```json
[
  {
    "name": "Oui Oui Records",
    "addressLine": "Soler 6090",
    "neighborhood": "Palermo",
    "city": "Ciudad Autónoma de Buenos Aires",
    "province": "CABA",
    "postalCode": "1425",
    "lat": -34.5769646,
    "lng": -58.4376601,
    "phone": "+54 11 4773-5875",
    "website": "http://www.ouioui-records.com/",
    "tags": ["usados", "nuevos"],
    "osmId": "node/4944505488"
  },
  {
    "name": "Exile Records",
    "addressLine": "Honduras 5270",
    "neighborhood": "Palermo",
    "city": "Ciudad Autónoma de Buenos Aires",
    "province": "CABA",
    "lat": -34.5870069,
    "lng": -58.432826,
    "tags": ["usados"],
    "osmId": "node/6393709423"
  },
  {
    "name": "Smile",
    "addressLine": "Jerónimo Salguero 1837",
    "neighborhood": "Palermo",
    "city": "Ciudad Autónoma de Buenos Aires",
    "province": "CABA",
    "lat": -34.5887533,
    "lng": -58.415145,
    "tags": ["usados"],
    "osmId": "node/11310316671"
  },
  {
    "name": "Magical Mystery Records",
    "addressLine": "Blanco Encalada 2370",
    "neighborhood": "Belgrano",
    "city": "Ciudad Autónoma de Buenos Aires",
    "province": "CABA",
    "lat": -34.5590483,
    "lng": -58.4586381,
    "tags": ["usados"],
    "osmId": "node/5307657985"
  },
  {
    "name": "Zivals",
    "addressLine": "Avenida Callao 395",
    "neighborhood": "Balvanera",
    "city": "Ciudad Autónoma de Buenos Aires",
    "province": "CABA",
    "lat": -34.6046054,
    "lng": -58.3920697,
    "website": "http://www.zivals.com/",
    "tags": ["nuevos"],
    "osmId": "way/473162796"
  }
]
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test lib/stores/storeFile.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 6: Add the `stores` table**

Append to `lib/db/schema.ts`. Add `doublePrecision` to the existing `drizzle-orm/pg-core` import list.

```ts
export const stores = pgTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    addressLine: text("address_line").notNull(),
    neighborhood: text("neighborhood").notNull(),
    city: text("city").notNull(),
    province: text("province").notNull(),
    postalCode: text("postal_code"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    phone: text("phone"),
    website: text("website"),
    instagram: text("instagram"),
    email: text("email"),
    // Stored verbatim from the curated file; structured "open now" parsing is deferred.
    openingHours: text("opening_hours"),
    tags: text("tags").array(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stores_slug_idx").on(table.slug),
    index("stores_city_idx").on(table.city),
  ],
);
```

- [ ] **Step 7: Push the schema and verify**

Run: `pnpm db:push`
Expected: the `stores` table is created. If it exits 1 with no message, the Neon credentials in `.env` are stale — that is the usual cause, not a schema error.

Then run `pnpm lint` and confirm it is clean.

- [ ] **Step 8: Commit**

```bash
git add lib/db/schema.ts lib/stores/storeFile.ts lib/stores/storeFile.test.mjs data/stores-amba.json
git commit -m "feat(stores): add stores table and curated store file schema"
```

---

### Task 2: Pure normalization helpers

**Files:**
- Create: `lib/stores/normalize.ts`
- Create: `lib/stores/normalize.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `foldName(value: string): string`
- Produces: `slugify(name: string, neighborhood: string): string`
- Produces: `uniqueSlug(base: string, taken: Set<string>): string`
- Produces: `normalizePhone(raw: string | null | undefined): string | null`
- Produces: `instagramHandle(raw: string | null | undefined): string | null`

- [ ] **Step 1: Write the failing tests**

Create `lib/stores/normalize.test.mjs` with the same `loadModule` helper, pointing at `./normalize.ts`.

```js
test("foldName strips diacritics, case and punctuation spacing", () => {
  const { foldName } = loadNormalize();
  assert.equal(foldName("  Disquería   Tus  Sonidos "), "disqueria tus sonidos");
  assert.equal(foldName("Oui Oui Records"), "oui oui records");
  assert.equal(foldName("Jerónimo Salguero"), "jeronimo salguero");
});

test("slugify combines name and neighbourhood", () => {
  const { slugify } = loadNormalize();
  assert.equal(slugify("Oui Oui Records", "Palermo"), "oui-oui-records-palermo");
  assert.equal(
    slugify("Disquería Tus Sonidos", "San Miguel"),
    "disqueria-tus-sonidos-san-miguel",
  );
  assert.equal(slugify("Zivals", "Balvanera"), "zivals-balvanera");
});

test("uniqueSlug suffixes on collision", () => {
  const { uniqueSlug } = loadNormalize();
  const taken = new Set(["smile-palermo"]);
  assert.equal(uniqueSlug("smile-palermo", taken), "smile-palermo-2");
  taken.add("smile-palermo-2");
  assert.equal(uniqueSlug("smile-palermo", taken), "smile-palermo-3");
  assert.equal(uniqueSlug("exile-records-palermo", taken), "exile-records-palermo");
});

test("normalizePhone converts Argentine formats to E.164", () => {
  const { normalizePhone } = loadNormalize();
  assert.equal(normalizePhone("+54 11 4773-5875"), "+541147735875");
  assert.equal(normalizePhone("011 4773-5875"), "+541147735875");
  assert.equal(normalizePhone("(011) 4773 5875"), "+541147735875");
  assert.equal(normalizePhone("54 11 4773 5875"), "+541147735875");
  // No area code — ambiguous, so refuse rather than guess.
  assert.equal(normalizePhone("4773-5875"), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone("   "), null);
});

test("instagramHandle extracts from URLs and @handles", () => {
  const { instagramHandle } = loadNormalize();
  assert.equal(instagramHandle("https://instagram.com/ouiouirecords"), "ouiouirecords");
  assert.equal(
    instagramHandle("https://www.instagram.com/oui.oui_records/"),
    "oui.oui_records",
  );
  assert.equal(instagramHandle("@ouiouirecords"), "ouiouirecords");
  assert.equal(instagramHandle("ouiouirecords"), "ouiouirecords");
  assert.equal(instagramHandle("https://facebook.com/ouiouirecords"), null);
  assert.equal(instagramHandle(null), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/stores/normalize.test.mjs`
Expected: FAIL — `lib/stores/normalize.ts` does not exist.

- [ ] **Step 3: Implement the helpers**

Create `lib/stores/normalize.ts`:

```ts
/** Lowercase, diacritic-free, whitespace-collapsed form used for comparison and slugs. */
export function foldName(value: string): string {
  return value
    .normalize("NFD")
    // Combining diacritical marks. Written as escapes so the range survives copy-paste.
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(name: string, neighborhood: string): string {
  return `${foldName(name)} ${foldName(neighborhood)}`
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Argentine numbers to E.164. Returns null when the input lacks an area code,
 * because guessing one silently produces a number that does not ring.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.replace(/[\s\-().]/g, "");
  if (!compact) return null;

  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (compact.startsWith("54")) digits = compact;
  else if (compact.startsWith("0")) digits = `54${compact.slice(1)}`;
  else return null;

  if (!/^\d+$/.test(digits)) return null;
  if (digits.length < 11 || digits.length > 14) return null;
  return `+${digits}`;
}

export function instagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const urlMatch = value.match(
    /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?/i,
  );
  if (urlMatch) return urlMatch[1];
  if (/^https?:\/\//i.test(value)) return null;

  const handle = value.startsWith("@") ? value.slice(1) : value;
  return /^[A-Za-z0-9._]+$/.test(handle) ? handle : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/stores/normalize.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/stores/normalize.ts lib/stores/normalize.test.mjs
git commit -m "feat(stores): add pure slug, phone and instagram normalizers"
```

---

### Task 3: Candidate matching

**Files:**
- Create: `lib/stores/match.ts`
- Create: `lib/stores/match.test.mjs`

**Interfaces:**
- Consumes: `foldName` from `lib/stores/normalize.ts`; `StoreEntry` from `lib/stores/storeFile.ts`.
- Produces: `haversineMeters(a: Point, b: Point): number` where `Point = { lat: number; lng: number }`
- Produces: `diceCoefficient(a: string, b: string): number`
- Produces: `findExistingStore(candidate: MatchCandidate, entries: StoreEntry[]): StoreEntry | null` where `MatchCandidate = { name: string; lat: number; lng: number; osmId?: string | null }`
- Produces: `MATCH_RADIUS_METERS = 150`, `MATCH_NAME_THRESHOLD = 0.6`

- [ ] **Step 1: Write the failing tests**

Create `lib/stores/match.test.mjs` with the `loadModule` helper pointing at `./match.ts`. Use the real coordinates from the Reference Data table.

```js
const OUI_OUI = {
  name: "Oui Oui Records",
  addressLine: "Soler 6090",
  neighborhood: "Palermo",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  lat: -34.5769646,
  lng: -58.4376601,
  osmId: "node/4944505488",
};
const BVM = {
  name: "BVM Records",
  addressLine: "Blanco Encalada 2300",
  neighborhood: "Belgrano",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  lat: -34.5620761,
  lng: -58.4577683,
  osmId: "node/5353274192",
};

test("haversineMeters measures the real BVM/Liverpool gap", () => {
  const { haversineMeters } = loadMatch();
  const d = haversineMeters(
    { lat: -34.5620761, lng: -58.4577683 },
    { lat: -34.5620046, lng: -58.4575964 },
  );
  assert.ok(d > 10 && d < 30, `expected ~18m, got ${d}`);
});

test("diceCoefficient scores identical and unrelated names", () => {
  const { diceCoefficient } = loadMatch();
  assert.equal(diceCoefficient("oui oui records", "oui oui records"), 1);
  assert.ok(diceCoefficient("bvm records", "liverpool discos") < 0.3);
  assert.ok(diceCoefficient("exile records", "exile record") > 0.8);
});

test("findExistingStore matches on osmId regardless of drift", () => {
  const { findExistingStore } = loadMatch();
  const hit = findExistingStore(
    { name: "Oui Oui", lat: -34.6, lng: -58.5, osmId: "node/4944505488" },
    [OUI_OUI],
  );
  assert.equal(hit?.name, "Oui Oui Records");
});

test("findExistingStore matches a nearby same-named shop with no osmId", () => {
  const { findExistingStore } = loadMatch();
  const hit = findExistingStore(
    { name: "Oui Oui Records", lat: -34.5770, lng: -58.4377, osmId: null },
    [OUI_OUI],
  );
  assert.equal(hit?.name, "Oui Oui Records");
});

test("findExistingStore keeps two distinct shops 18m apart separate", () => {
  const { findExistingStore } = loadMatch();
  // Liverpool Discos is ~18m from BVM Records in the same Belgrano gallery.
  const hit = findExistingStore(
    { name: "Liverpool Discos", lat: -34.5620046, lng: -58.4575964, osmId: "node/5353274195" },
    [BVM],
  );
  assert.equal(hit, null);
});

test("findExistingStore does not match the same name far away", () => {
  const { findExistingStore } = loadMatch();
  const hit = findExistingStore(
    { name: "Oui Oui Records", lat: -34.6046, lng: -58.3920, osmId: null },
    [OUI_OUI],
  );
  assert.equal(hit, null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/stores/match.test.mjs`
Expected: FAIL — `lib/stores/match.ts` does not exist.

- [ ] **Step 3: Implement the matcher**

Create `lib/stores/match.ts`:

```ts
import { foldName } from "./normalize";
import type { StoreEntry } from "./storeFile";

export const MATCH_RADIUS_METERS = 150;
export const MATCH_NAME_THRESHOLD = 0.6;

export type Point = { lat: number; lng: number };
export type MatchCandidate = Point & { name: string; osmId?: string | null };

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function bigrams(value: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) out.push(value.slice(i, i + 2));
  return out;
}

/** Sørensen–Dice over character bigrams. 1 = identical, 0 = nothing in common. */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.length === 0 || right.length === 0) return 0;

  const pool = new Map<string, number>();
  for (const gram of left) pool.set(gram, (pool.get(gram) ?? 0) + 1);

  let shared = 0;
  for (const gram of right) {
    const count = pool.get(gram) ?? 0;
    if (count > 0) {
      shared += 1;
      pool.set(gram, count - 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

/**
 * Is this OSM element already in the curated file?
 *
 * Advisory only — a miss costs one redundant suggestion in the candidate file,
 * never a corrupt row, which is why fuzzy matching is acceptable here. Proximity
 * alone is deliberately insufficient: BVM Records and Liverpool Discos are two
 * different shops 18 m apart.
 */
export function findExistingStore(
  candidate: MatchCandidate,
  entries: StoreEntry[],
): StoreEntry | null {
  if (candidate.osmId) {
    const byId = entries.find((entry) => entry.osmId === candidate.osmId);
    if (byId) return byId;
  }

  const folded = foldName(candidate.name);
  for (const entry of entries) {
    if (haversineMeters(candidate, entry) > MATCH_RADIUS_METERS) continue;
    if (diceCoefficient(folded, foldName(entry.name)) >= MATCH_NAME_THRESHOLD) {
      return entry;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/stores/match.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/stores/match.ts lib/stores/match.test.mjs
git commit -m "feat(stores): add haversine + dice candidate matcher"
```

---

### Task 4: Overpass client

**Files:**
- Create: `lib/stores/overpass.ts`
- Create: `lib/stores/overpass.test.mjs`
- Create: `lib/stores/fixtures/overpass-amba.json`

**Interfaces:**
- Consumes: `AMBA_BBOX` from `lib/stores/storeFile.ts`.
- Produces: `buildMusicShopQuery(bbox: typeof AMBA_BBOX): string`
- Produces: `buildNameProbeQuery(bbox: typeof AMBA_BBOX): string`
- Produces: `toRawStores(response: unknown): RawStore[]` where `RawStore = { osmId: string; name: string; lat: number; lng: number; street: string | null; houseNumber: string | null; suburb: string | null; city: string | null; postcode: string | null; phone: string | null; website: string | null; openingHours: string | null }`
- Produces: `fetchMusicShops(bbox?: typeof AMBA_BBOX): Promise<RawStore[]>`
- Produces: `fetchNameProbe(bbox?: typeof AMBA_BBOX): Promise<RawStore[]>`

- [ ] **Step 1: Create the fixture**

Create `lib/stores/fixtures/overpass-amba.json` — a trimmed but real slice of the live response, including the unnamed element and a way (which carries `center` rather than `lat`/`lon`) so both edge cases are covered:

```json
{
  "elements": [
    {
      "type": "node",
      "id": 4944505488,
      "lat": -34.5769646,
      "lon": -58.4376601,
      "tags": {
        "shop": "music",
        "name": "Oui Oui Records",
        "addr:street": "Soler",
        "addr:housenumber": "6090",
        "addr:suburb": "Palermo",
        "addr:city": "Ciudad Autónoma de Buenos Aires",
        "addr:postcode": "1425",
        "phone": "+54 11 4773-5875",
        "website": "http://www.ouioui-records.com/"
      }
    },
    {
      "type": "node",
      "id": 5353274195,
      "lat": -34.5620046,
      "lon": -58.4575964,
      "tags": { "shop": "music", "name": "Liverpool Discos" }
    },
    {
      "type": "way",
      "id": 473162796,
      "center": { "lat": -34.6046054, "lon": -58.3920697 },
      "tags": {
        "shop": "music",
        "name": "Zivals",
        "addr:street": "Avenida Callao",
        "addr:housenumber": "395",
        "website": "http://www.zivals.com/"
      }
    },
    {
      "type": "node",
      "id": 1769949021,
      "lat": -34.6,
      "lon": -58.4,
      "tags": { "shop": "music" }
    }
  ]
}
```

- [ ] **Step 2: Write the failing tests**

Create `lib/stores/overpass.test.mjs` with the `loadModule` helper pointing at `./overpass.ts`.

```js
test("buildMusicShopQuery targets shop=music over the bbox", () => {
  const { buildMusicShopQuery } = loadOverpass();
  const query = buildMusicShopQuery({
    south: -34.95,
    west: -58.9,
    north: -34.32,
    east: -58.15,
  });
  assert.match(query, /\[out:json\]/);
  assert.match(query, /node\["shop"="music"\]\(-34\.95,-58\.9,-34\.32,-58\.15\);/);
  assert.match(query, /way\["shop"="music"\]\(-34\.95,-58\.9,-34\.32,-58\.15\);/);
  assert.match(query, /out tags center;/);
});

test("buildNameProbeQuery matches record-shop names across all shop types", () => {
  const { buildNameProbeQuery } = loadOverpass();
  const query = buildNameProbeQuery({
    south: -34.95,
    west: -58.9,
    north: -34.32,
    east: -58.15,
  });
  assert.match(query, /nwr\["shop"\]\["name"~"disco\|disquer\|vinil\|vinyl\|record",i\]/);
  assert.doesNotMatch(query, /"shop"="music"/);
});

test("toRawStores maps nodes and ways and drops unnamed elements", () => {
  const { toRawStores } = loadOverpass();
  const fixture = JSON.parse(
    readFileSync(fileURLToPath(new URL("./fixtures/overpass-amba.json", import.meta.url)), "utf8"),
  );
  const stores = toRawStores(fixture);

  // The unnamed node is dropped; the other three survive.
  assert.equal(stores.length, 3);

  const ouiOui = stores.find((s) => s.osmId === "node/4944505488");
  assert.deepEqual(ouiOui, {
    osmId: "node/4944505488",
    name: "Oui Oui Records",
    lat: -34.5769646,
    lng: -58.4376601,
    street: "Soler",
    houseNumber: "6090",
    suburb: "Palermo",
    city: "Ciudad Autónoma de Buenos Aires",
    postcode: "1425",
    phone: "+54 11 4773-5875",
    website: "http://www.ouioui-records.com/",
    openingHours: null,
  });

  // A way carries `center` instead of lat/lon.
  const zivals = stores.find((s) => s.osmId === "way/473162796");
  assert.equal(zivals.lat, -34.6046054);
  assert.equal(zivals.lng, -58.3920697);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test lib/stores/overpass.test.mjs`
Expected: FAIL — `lib/stores/overpass.ts` does not exist.

- [ ] **Step 4: Implement the client**

Create `lib/stores/overpass.ts`:

```ts
import { z } from "zod";
import { AMBA_BBOX } from "./storeFile";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export type Bbox = typeof AMBA_BBOX;

export type RawStore = {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  street: string | null;
  houseNumber: string | null;
  suburb: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
};

export function buildMusicShopQuery(bbox: Bbox): string {
  const area = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  return [
    "[out:json][timeout:90];",
    "(",
    `  node["shop"="music"]${area};`,
    `  way["shop"="music"]${area};`,
    ");",
    "out tags center;",
  ].join("\n");
}

/**
 * Shops of any type whose *name* reads like a record shop. Catches the ones
 * mistagged as shop=electronics, at the cost of dragging in bakeries called
 * "El Record" — so its results are always marked low-confidence for triage.
 */
export function buildNameProbeQuery(bbox: Bbox): string {
  const area = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  return [
    "[out:json][timeout:90];",
    "(",
    `  nwr["shop"]["name"~"disco|disquer|vinil|vinyl|record",i]${area};`,
    ");",
    "out tags center;",
  ].join("\n");
}

const elementSchema = z.object({
  type: z.string(),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

const responseSchema = z.object({ elements: z.array(elementSchema) });

export function toRawStores(response: unknown): RawStore[] {
  const { elements } = responseSchema.parse(response);
  const stores: RawStore[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    // Unnamed or geometry-less elements cannot become directory entries.
    if (!name || lat === undefined || lng === undefined) continue;

    stores.push({
      osmId: `${element.type}/${element.id}`,
      name,
      lat,
      lng,
      street: tags["addr:street"] ?? null,
      houseNumber: tags["addr:housenumber"] ?? null,
      suburb: tags["addr:suburb"] ?? null,
      city: tags["addr:city"] ?? null,
      postcode: tags["addr:postcode"] ?? null,
      phone: tags.phone ?? null,
      website: tags.website ?? null,
      openingHours: tags.opening_hours ?? null,
    });
  }

  return stores;
}

async function runQuery(query: string): Promise<RawStore[]> {
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": process.env.SCRAPER_USER_AGENT ?? "VinylOS/0.1",
    },
  });

  // Overpass sheds load with 429/504 under contention; the caller is a manual
  // script, so surface it plainly rather than retrying in a tight loop.
  if (res.status === 429 || res.status === 504) {
    throw new Error(`Overpass is busy (${res.status}). Wait a minute and re-run.`);
  }
  if (!res.ok) {
    throw new Error(`Overpass error ${res.status}: ${await res.text()}`);
  }
  return toRawStores(await res.json());
}

export async function fetchMusicShops(bbox: Bbox = AMBA_BBOX): Promise<RawStore[]> {
  return runQuery(buildMusicShopQuery(bbox));
}

export async function fetchNameProbe(bbox: Bbox = AMBA_BBOX): Promise<RawStore[]> {
  return runQuery(buildNameProbeQuery(bbox));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test lib/stores/overpass.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 6: Document the env var**

Add to `.env.example`, under the external APIs block:

```
SCRAPER_USER_AGENT=      # e.g. "VinylOS/1.0 +https://yourapp.example" — Overpass etiquette
```

- [ ] **Step 7: Commit**

```bash
git add lib/stores/overpass.ts lib/stores/overpass.test.mjs lib/stores/fixtures/overpass-amba.json .env.example
git commit -m "feat(stores): add Overpass client for AMBA music shops"
```

---

### Task 5: Discovery script

**Files:**
- Create: `lib/stores/candidates.ts`
- Create: `lib/stores/candidates.test.mjs`
- Create: `scripts/load-ts.mjs`
- Create: `scripts/discover-stores.mjs`
- Modify: `package.json` (scripts block)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `RawStore` from `lib/stores/overpass.ts`; `findExistingStore` from `lib/stores/match.ts`; `StoreEntry` from `lib/stores/storeFile.ts`; `normalizePhone` from `lib/stores/normalize.ts`.
- Produces: `buildCandidateList(tagged: RawStore[], probed: RawStore[], entries: StoreEntry[]): Candidate[]` where `Candidate = { osmId: string; name: string; lat: number; lng: number; suggestedAddress: string | null; suggestedNeighborhood: string | null; phone: string | null; website: string | null; openingHours: string | null; hasFullAddress: boolean; lowConfidence: boolean }`

The script writes `data/store-candidates.json`, which is a **work queue for a human**, not an input to anything. Nothing reads it back.

- [ ] **Step 1: Write the failing tests**

Create `lib/stores/candidates.test.mjs` with the `loadModule` helper pointing at `./candidates.ts`.

```js
const CURATED = [
  {
    name: "Oui Oui Records",
    addressLine: "Soler 6090",
    neighborhood: "Palermo",
    city: "Ciudad Autónoma de Buenos Aires",
    province: "CABA",
    lat: -34.5769646,
    lng: -58.4376601,
    tags: [],
    osmId: "node/4944505488",
  },
];

const RAW = [
  {
    osmId: "node/4944505488",
    name: "Oui Oui Records",
    lat: -34.5769646,
    lng: -58.4376601,
    street: "Soler",
    houseNumber: "6090",
    suburb: "Palermo",
    city: null,
    postcode: null,
    phone: "+54 11 4773-5875",
    website: null,
    openingHours: null,
  },
  {
    osmId: "node/5353274195",
    name: "Liverpool Discos",
    lat: -34.5620046,
    lng: -58.4575964,
    street: null,
    houseNumber: null,
    suburb: null,
    city: null,
    postcode: null,
    phone: null,
    website: null,
    openingHours: null,
  },
  {
    osmId: "node/5307657985",
    name: "Magical Mystery Records",
    lat: -34.5590483,
    lng: -58.4586381,
    street: "Blanco Encalada",
    houseNumber: "2370",
    suburb: "Belgrano",
    city: null,
    postcode: null,
    phone: null,
    website: null,
    openingHours: null,
  },
];

const PROBED = [
  // Overlaps the shop=music query — must not be duplicated.
  RAW[2],
  // A genuine record shop mistagged shop=electronics. This is why the probe exists.
  {
    osmId: "node/9999000001",
    name: "Pappo Records",
    lat: -34.61,
    lng: -58.42,
    street: null,
    houseNumber: null,
    suburb: null,
    city: null,
    postcode: null,
    phone: null,
    website: null,
    openingHours: null,
  },
];

test("buildCandidateList omits shops already in the curated file", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, [], CURATED);
  assert.deepEqual(
    candidates.map((c) => c.osmId).sort(),
    ["node/5307657985", "node/5353274195"],
  );
});

test("buildCandidateList composes an address only when street and number exist", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, [], CURATED);

  const magical = candidates.find((c) => c.osmId === "node/5307657985");
  assert.equal(magical.suggestedAddress, "Blanco Encalada 2370");
  assert.equal(magical.hasFullAddress, true);

  const liverpool = candidates.find((c) => c.osmId === "node/5353274195");
  assert.equal(liverpool.suggestedAddress, null);
  assert.equal(liverpool.hasFullAddress, false);
});

test("buildCandidateList sorts complete addresses first", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, [], CURATED);
  assert.equal(candidates[0].osmId, "node/5307657985");
});

test("buildCandidateList adds probe-only hits as low-confidence, without duplicating", () => {
  const { buildCandidateList } = loadCandidates();
  const candidates = buildCandidateList(RAW, PROBED, CURATED);

  // Magical Mystery appears in both queries but only once in the output.
  assert.equal(candidates.filter((c) => c.osmId === "node/5307657985").length, 1);

  const pappo = candidates.find((c) => c.osmId === "node/9999000001");
  assert.equal(pappo.lowConfidence, true);
  // Low-confidence hits sort last, behind even the addressless tagged shops.
  assert.equal(candidates.at(-1).osmId, "node/9999000001");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/stores/candidates.test.mjs`
Expected: FAIL — `lib/stores/candidates.ts` does not exist.

- [ ] **Step 3: Implement the candidate builder**

Create `lib/stores/candidates.ts`:

```ts
import { findExistingStore } from "./match";
import { normalizePhone } from "./normalize";
import type { RawStore } from "./overpass";
import type { StoreEntry } from "./storeFile";

export type Candidate = {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  suggestedAddress: string | null;
  suggestedNeighborhood: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  hasFullAddress: boolean;
  /** Came from the name probe rather than shop=music, so it may not be a record shop at all. */
  lowConfidence: boolean;
};

function toCandidate(store: RawStore, lowConfidence: boolean): Candidate {
  const hasFullAddress = Boolean(store.street && store.houseNumber);
  return {
    osmId: store.osmId,
    name: store.name,
    lat: store.lat,
    lng: store.lng,
    suggestedAddress: hasFullAddress ? `${store.street} ${store.houseNumber}` : null,
    suggestedNeighborhood: store.suburb,
    phone: normalizePhone(store.phone),
    website: store.website,
    openingHours: store.openingHours,
    hasFullAddress,
    lowConfidence,
  };
}

/**
 * OSM elements not already represented in the curated file, ordered so the ones
 * needing least manual work come first. Most AMBA entries lack a house number,
 * so an incomplete address is the norm rather than a defect.
 *
 * `probed` results are name-regex hits across all shop types — they surface shops
 * mistagged as something else, but also bakeries called "El Record", so they sort
 * last and carry `lowConfidence`.
 */
export function buildCandidateList(
  tagged: RawStore[],
  probed: RawStore[],
  entries: StoreEntry[],
): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const store of tagged) {
    if (findExistingStore(store, entries)) continue;
    seen.add(store.osmId);
    candidates.push(toCandidate(store, false));
  }

  for (const store of probed) {
    // The probe overlaps shop=music heavily; only its exclusive hits are new.
    if (seen.has(store.osmId)) continue;
    if (findExistingStore(store, entries)) continue;
    seen.add(store.osmId);
    candidates.push(toCandidate(store, true));
  }

  return candidates.sort((a, b) => {
    if (a.lowConfidence !== b.lowConfidence) return a.lowConfidence ? 1 : -1;
    if (a.hasFullAddress !== b.hasFullAddress) return a.hasFullAddress ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/stores/candidates.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the shared TypeScript loader**

Both scripts need to call into `lib/stores/*.ts`, and neither can use the `@/` alias. Create `scripts/load-ts.mjs` once so there is a single loading mechanism rather than a copy in each script:

```js
// Loads a TypeScript module from the repo by transpiling it in-process, the same
// way the *.test.mjs suites do. Scripts cannot use the `@/` alias — it only
// resolves inside the Next build — so relative imports are resolved here.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

export const ROOT = new URL("../", import.meta.url);

const cache = new Map();

export function loadTs(relativePath) {
  const cached = cache.get(relativePath);
  if (cached) return cached;

  const fileUrl = new URL(relativePath, ROOT);
  const filename = fileURLToPath(fileUrl);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const rootPath = fileURLToPath(ROOT);
  const localRequire = (id) =>
    id.startsWith(".")
      ? loadTs(fileURLToPath(new URL(`${id}.ts`, fileUrl)).slice(rootPath.length))
      : require(id);

  const mod = { exports: {} };
  cache.set(relativePath, mod.exports);
  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require: localRequire,
      fetch,
      process,
      console,
      URL,
    },
    { filename },
  );
  cache.set(relativePath, mod.exports);
  return mod.exports;
}
```

- [ ] **Step 6: Write the discovery script**

Create `scripts/discover-stores.mjs`.

```js
#!/usr/bin/env node
// Queries Overpass for AMBA music shops and writes the ones missing from
// data/stores-amba.json to data/store-candidates.json for manual triage.
// This script never touches the database — see TODO.md §0 for why.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadTs, ROOT } from "./load-ts.mjs";

const { storeFileSchema } = loadTs("lib/stores/storeFile.ts");
const { fetchMusicShops, fetchNameProbe } = loadTs("lib/stores/overpass.ts");
const { buildCandidateList } = loadTs("lib/stores/candidates.ts");

const CACHE_PATH = fileURLToPath(new URL(".overpass-cache.json", ROOT));
const useCache = process.argv.includes("--cache") && existsSync(CACHE_PATH);

const cached = useCache ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : null;
const [tagged, probed] = cached
  ? [cached.tagged, cached.probed]
  : await Promise.all([fetchMusicShops(), fetchNameProbe()]);

if (!useCache) {
  writeFileSync(CACHE_PATH, JSON.stringify({ tagged, probed }, null, 2));
}

const entries = storeFileSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL("data/stores-amba.json", ROOT)), "utf8")),
);

const candidates = buildCandidateList(tagged, probed, entries);
const outPath = fileURLToPath(new URL("data/store-candidates.json", ROOT));
mkdirSync(fileURLToPath(new URL("data/", ROOT)), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(candidates, null, 2)}\n`);

const complete = candidates.filter((c) => c.hasFullAddress).length;
const lowConfidence = candidates.filter((c) => c.lowConfidence).length;
console.log(
  `OSM returned ${tagged.length} shop=music elements and ${probed.length} name matches.\n` +
    `${entries.length} already curated. ${candidates.length} candidates written to ` +
    `data/store-candidates.json (${complete} with a full address, ` +
    `${lowConfidence} low-confidence name matches).\n` +
    `Triage: move the real record shops into data/stores-amba.json, ignore the rest.`,
);
```

- [ ] **Step 7: Register the script and ignore the cache**

Add to `package.json` scripts:

```json
"stores:discover": "node scripts/discover-stores.mjs"
```

Add to `.gitignore`:

```
.overpass-cache.json
```

- [ ] **Step 8: Run it against live Overpass and verify**

Run: `pnpm stores:discover`
Expected: roughly 46 `shop=music` elements and ~13 name matches, 5 already curated, and ~45 candidates of which a handful are flagged low-confidence. Open `data/store-candidates.json` and confirm:
- entries with a full address sort first, low-confidence name matches sort last;
- the five seeded shops are absent;
- `Pappo Records` (tagged `shop=electronics`) appears as a low-confidence candidate — that shop is the entire reason the probe exists;
- the bakeries named "El Record" also appear, flagged low-confidence. That is expected noise, not a bug — the probe trades precision for recall and a human resolves it.

Re-run with `pnpm stores:discover --cache` and confirm identical output without a network call.

- [ ] **Step 9: Commit**

Commit the scripts and the generated candidate file — the candidate list is a reviewable work queue, so it belongs in git.

```bash
git add lib/stores/candidates.ts lib/stores/candidates.test.mjs scripts/load-ts.mjs scripts/discover-stores.mjs package.json .gitignore data/store-candidates.json
git commit -m "feat(stores): add Overpass discovery script and candidate triage queue"
```

---

### Task 6: Sync script

**Files:**
- Create: `lib/stores/syncPlan.ts`
- Create: `lib/stores/syncPlan.test.mjs`
- Create: `scripts/sync-stores.mjs`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: `StoreEntry` from `lib/stores/storeFile.ts`; `slugify`, `uniqueSlug`, `normalizePhone`, `instagramHandle` from `lib/stores/normalize.ts`; `loadTs` and `ROOT` from `scripts/load-ts.mjs` (created in Task 5).
- Produces: `type StoreRow` — the flat shape written to Postgres, with `slug` resolved.
- Produces: `toStoreRows(entries: StoreEntry[]): StoreRow[]`
- Produces: `buildSyncPlan(rows: StoreRow[], existing: ExistingRow[]): { inserts: StoreRow[]; updates: StoreRow[]; deactivations: string[] }` where `ExistingRow = StoreRow & { active: boolean }`

Updates are diffed field-by-field rather than blind-upserted, so that re-running the sync on unchanged data reports zero changes. That property is the verification criterion in §5 of the spec — a blind upsert would make it untestable.

- [ ] **Step 1: Write the failing tests**

Create `lib/stores/syncPlan.test.mjs` with the `loadModule` helper pointing at `./syncPlan.ts`.

```js
const ENTRY = {
  name: "Oui Oui Records",
  addressLine: "Soler 6090",
  neighborhood: "Palermo",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  postalCode: "1425",
  lat: -34.5769646,
  lng: -58.4376601,
  phone: "+54 11 4773-5875",
  website: "http://www.ouioui-records.com/",
  instagram: null,
  email: null,
  openingHours: null,
  tags: ["usados"],
  osmId: "node/4944505488",
};

test("toStoreRows assigns slugs and normalizes contact fields", () => {
  const { toStoreRows } = loadSyncPlan();
  const [row] = toStoreRows([ENTRY]);
  assert.equal(row.slug, "oui-oui-records-palermo");
  assert.equal(row.phone, "+541147735875");
  assert.deepEqual(row.tags, ["usados"]);
});

test("toStoreRows disambiguates two shops with the same name and neighbourhood", () => {
  const { toStoreRows } = loadSyncPlan();
  const rows = toStoreRows([ENTRY, { ...ENTRY, addressLine: "Soler 6100" }]);
  assert.deepEqual(rows.map((r) => r.slug), [
    "oui-oui-records-palermo",
    "oui-oui-records-palermo-2",
  ]);
});

test("buildSyncPlan inserts unknown slugs", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const plan = buildSyncPlan(rows, []);
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.updates.length, 0);
  assert.deepEqual(plan.deactivations, []);
});

test("buildSyncPlan reports nothing when data is unchanged", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const plan = buildSyncPlan(rows, rows.map((r) => ({ ...r, active: true })));
  assert.deepEqual(plan.inserts, []);
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.deactivations, []);
});

test("buildSyncPlan updates a changed field and reactivates a dormant row", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const existing = rows.map((r) => ({ ...r, addressLine: "Soler 6000", active: false }));
  const plan = buildSyncPlan(rows, existing);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].addressLine, "Soler 6090");
});

test("buildSyncPlan deactivates active rows dropped from the file", () => {
  const { toStoreRows, buildSyncPlan } = loadSyncPlan();
  const rows = toStoreRows([ENTRY]);
  const existing = [
    ...rows.map((r) => ({ ...r, active: true })),
    { ...rows[0], slug: "closed-shop-belgrano", active: true },
  ];
  const plan = buildSyncPlan(rows, existing);
  assert.deepEqual(plan.deactivations, ["closed-shop-belgrano"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/stores/syncPlan.test.mjs`
Expected: FAIL — `lib/stores/syncPlan.ts` does not exist.

- [ ] **Step 3: Implement the plan builder**

Create `lib/stores/syncPlan.ts`:

```ts
import { instagramHandle, normalizePhone, slugify, uniqueSlug } from "./normalize";
import type { StoreEntry } from "./storeFile";

export type StoreRow = {
  slug: string;
  name: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  province: string;
  postalCode: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  openingHours: string | null;
  tags: string[];
};

export type ExistingRow = StoreRow & { active: boolean };

const COMPARED_FIELDS = [
  "name",
  "addressLine",
  "neighborhood",
  "city",
  "province",
  "postalCode",
  "lat",
  "lng",
  "phone",
  "website",
  "instagram",
  "email",
  "openingHours",
] as const;

export function toStoreRows(entries: StoreEntry[]): StoreRow[] {
  const taken = new Set<string>();
  return entries.map((entry) => {
    const slug = uniqueSlug(slugify(entry.name, entry.neighborhood), taken);
    taken.add(slug);
    return {
      slug,
      name: entry.name,
      addressLine: entry.addressLine,
      neighborhood: entry.neighborhood,
      city: entry.city,
      province: entry.province,
      postalCode: entry.postalCode ?? null,
      lat: entry.lat,
      lng: entry.lng,
      phone: normalizePhone(entry.phone),
      website: entry.website ?? null,
      instagram: instagramHandle(entry.instagram),
      email: entry.email ?? null,
      openingHours: entry.openingHours ?? null,
      tags: entry.tags,
    };
  });
}

function hasChanged(next: StoreRow, current: ExistingRow): boolean {
  if (!current.active) return true;
  if (COMPARED_FIELDS.some((field) => next[field] !== current[field])) return true;
  if (next.tags.length !== current.tags.length) return true;
  return next.tags.some((tag, i) => tag !== current.tags[i]);
}

export function buildSyncPlan(rows: StoreRow[], existing: ExistingRow[]) {
  const bySlug = new Map(existing.map((row) => [row.slug, row]));
  const inserts: StoreRow[] = [];
  const updates: StoreRow[] = [];

  for (const row of rows) {
    const current = bySlug.get(row.slug);
    if (!current) inserts.push(row);
    else if (hasChanged(row, current)) updates.push(row);
  }

  const fileSlugs = new Set(rows.map((row) => row.slug));
  const deactivations = existing
    .filter((row) => row.active && !fileSlugs.has(row.slug))
    .map((row) => row.slug);

  return { inserts, updates, deactivations };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/stores/syncPlan.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the sync script**

Create `scripts/sync-stores.mjs`. It uses `pg` directly — no Drizzle, no `@/` aliases.

```js
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
```

- [ ] **Step 6: Register the script**

Add to `package.json` scripts:

```json
"stores:sync": "node scripts/sync-stores.mjs"
```

- [ ] **Step 7: Run and verify idempotence**

Run: `pnpm stores:sync --dry`
Expected: `5 insert(s), 0 update(s), 0 deactivation(s)` and `--dry: nothing written.`

Run: `pnpm stores:sync`
Expected: the same plan, then `Sync complete.`

Run: `pnpm stores:sync --dry` again.
Expected: `0 insert(s), 0 update(s), 0 deactivation(s)`. **If this reports updates, the field comparison in `hasChanged` disagrees with what Postgres round-trips** — most likely `lat`/`lng` precision or `tags` being `null` rather than `[]`. Fix the comparison, not the schema.

- [ ] **Step 8: Commit**

```bash
git add lib/stores/syncPlan.ts lib/stores/syncPlan.test.mjs scripts/sync-stores.mjs package.json
git commit -m "feat(stores): add curated-file to database sync script"
```

---

### Task 7: Store service and the `/stores` list page

**Files:**
- Create: `lib/services/storeService.ts`
- Create: `app/(public)/stores/page.tsx`
- Create: `app/(public)/stores/page.test.mjs`
- Create: `app/(public)/stores/StoreCard.tsx`
- Modify: `app/(app)/AppNav.tsx` (`NAV_LINKS` and `TAB_ICONS`)
- Modify: `app/(public)/PublicGuestNav.tsx` (add a Stores link)
- Modify: `proxy.test.mjs` (assert `/stores` stays public)

**Interfaces:**
- Consumes: `stores` table from `lib/db/schema.ts`.
- Produces: `listStores(options: { q?: string; neighborhood?: string }): Promise<StoreListItem[]>`
- Produces: `listNeighborhoods(): Promise<string[]>`
- Produces: `getStoreBySlug(slug: string): Promise<StoreListItem | null>`
- Produces: `StoreCard` component taking `{ store: StoreListItem }`

- [ ] **Step 1: Write the service**

Create `lib/services/storeService.ts`. There is no unit test here by design — it is a thin Drizzle read with no branching logic worth isolating, matching `wishlistService.ts`, which is likewise untested. The page test in Step 3 covers the rendering contract.

```ts
import { db } from "@/lib/db/client";
import { stores } from "@/lib/db/schema";
import { and, asc, eq, ilike, or } from "drizzle-orm";

const publicColumns = {
  slug: stores.slug,
  name: stores.name,
  addressLine: stores.addressLine,
  neighborhood: stores.neighborhood,
  city: stores.city,
  province: stores.province,
  lat: stores.lat,
  lng: stores.lng,
  phone: stores.phone,
  website: stores.website,
  instagram: stores.instagram,
  openingHours: stores.openingHours,
  tags: stores.tags,
};

export type StoreListItem = {
  slug: string;
  name: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  openingHours: string | null;
  tags: string[] | null;
};

export async function listStores({
  q,
  neighborhood,
}: {
  q?: string;
  neighborhood?: string;
}): Promise<StoreListItem[]> {
  const term = q?.trim();
  const filters = [eq(stores.active, true)];
  if (neighborhood) filters.push(eq(stores.neighborhood, neighborhood));
  if (term) {
    filters.push(
      or(
        ilike(stores.name, `%${term}%`),
        ilike(stores.neighborhood, `%${term}%`),
        ilike(stores.addressLine, `%${term}%`),
      )!,
    );
  }

  return db
    .select(publicColumns)
    .from(stores)
    .where(and(...filters))
    .orderBy(asc(stores.neighborhood), asc(stores.name));
}

export async function listNeighborhoods(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ neighborhood: stores.neighborhood })
    .from(stores)
    .where(eq(stores.active, true))
    .orderBy(asc(stores.neighborhood));
  return rows.map((row) => row.neighborhood);
}

export async function getStoreBySlug(slug: string): Promise<StoreListItem | null> {
  const [store] = await db
    .select(publicColumns)
    .from(stores)
    .where(and(eq(stores.slug, slug), eq(stores.active, true)))
    .limit(1);
  return store ?? null;
}
```

- [ ] **Step 2: Write the card component**

Create `app/(public)/stores/StoreCard.tsx`. Missing hours and phone is the common case (§0: 3 of 47 OSM entries carry hours), so the card must read as complete without them — no "Hours: unknown" placeholders.

```tsx
import Link from "next/link";
import type { StoreListItem } from "@/lib/services/storeService";

export function StoreCard({ store }: { store: StoreListItem }) {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;

  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/stores/${store.slug}`}
            className="font-medium hover:text-red-500"
          >
            {store.name}
          </Link>
          <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
            {store.addressLine} · {store.neighborhood}
          </p>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:text-red-500 dark:border-zinc-800"
        >
          Cómo llegar
        </a>
      </div>

      {store.openingHours && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {store.openingHours}
        </p>
      )}

      {(store.tags?.length ?? 0) > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {store.tags?.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Write the failing page test**

Create `app/(public)/stores/page.test.mjs`, modelled on `app/(public)/explore/page.test.mjs` — copy its `loadPage` helper and stub `@/lib/services/storeService`.

```js
const STORES = [
  {
    slug: "oui-oui-records-palermo",
    name: "Oui Oui Records",
    addressLine: "Soler 6090",
    neighborhood: "Palermo",
    city: "Ciudad Autónoma de Buenos Aires",
    province: "CABA",
    lat: -34.5769646,
    lng: -58.4376601,
    phone: null,
    website: null,
    instagram: null,
    openingHours: null,
    tags: ["usados"],
  },
];

test("guests see the store list with OSM attribution", async () => {
  const Page = loadPage({ stores: STORES, neighborhoods: ["Palermo"] });
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({}) }),
  );

  assert.match(html, /Oui Oui Records/);
  assert.match(html, /Soler 6090/);
  assert.match(html, /OpenStreetMap/);
  assert.match(html, /openstreetmap\.org\/copyright/);
});

test("a store with no hours renders without an empty hours row", async () => {
  const Page = loadPage({ stores: STORES, neighborhoods: ["Palermo"] });
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({}) }),
  );
  assert.doesNotMatch(html, /Horarios/);
});

test("the empty state explains how to suggest a shop", async () => {
  const Page = loadPage({ stores: [], neighborhoods: [] });
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({ q: "nada" }) }),
  );
  assert.match(html, /No encontramos/);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `node --test "app/(public)/stores/page.test.mjs"`
Expected: FAIL — `app/(public)/stores/page.tsx` does not exist.

- [ ] **Step 5: Write the page**

Create `app/(public)/stores/page.tsx`. Read `node_modules/next/dist/docs/` on `searchParams` and `metadata` before writing — the App Router API in this version differs from older releases.

```tsx
import Link from "next/link";
import { listNeighborhoods, listStores } from "@/lib/services/storeService";
import { StoreCard } from "./StoreCard";

export const metadata = {
  title: "Disquerías en AMBA",
  description:
    "Dónde comprar vinilos en Buenos Aires: disquerías de CABA y Gran Buenos Aires, con dirección, horarios y contacto.",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; neighborhood?: string }>;
}) {
  const { q, neighborhood } = await searchParams;
  const [stores, neighborhoods] = await Promise.all([
    listStores({ q, neighborhood }),
    listNeighborhoods(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Disquerías</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Dónde comprar vinilos en CABA y Gran Buenos Aires.
        </p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, barrio o dirección"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        />
        <select
          name="neighborhood"
          defaultValue={neighborhood ?? ""}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">Todos los barrios</option>
          {neighborhoods.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Buscar
        </button>
      </form>

      {stores.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No encontramos disquerías con ese filtro.{" "}
          <Link href="/stores" className="underline hover:text-red-500">
            Ver todas
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {stores.map((store) => (
            <StoreCard key={store.slug} store={store} />
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Datos parciales de{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          © OpenStreetMap contributors
        </a>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test "app/(public)/stores/page.test.mjs"`
Expected: PASS, 3 tests.

- [ ] **Step 7: Add navigation entries**

In `app/(app)/AppNav.tsx`, add to `NAV_LINKS` after Discover:

```ts
{ href: "/stores", label: "Disquerías" },
```

and add a matching entry to `TAB_ICONS`:

```tsx
"/stores": (
  // Map pin
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
),
```

This makes five mobile bottom tabs where there were four. Check it visually at 375 px before moving on; if it is too tight, the fallback is to keep `/stores` in the desktop nav only.

In `app/(public)/PublicGuestNav.tsx`, add a link beside Explore, matching its classes:

```tsx
<Link
  href="/stores"
  className="rounded-lg px-2 py-2 text-sm text-zinc-700 hover:text-red-500 active:text-red-500 sm:px-3 dark:text-zinc-200"
>
  Disquerías
</Link>
```

- [ ] **Step 8: Assert `/stores` stays public**

Append to `proxy.test.mjs`:

```js
test("/stores is not gated by the proxy matcher", () => {
  const source = readFileSync(fileURLToPath(new URL("./proxy.ts", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /"\/stores/);
});
```

- [ ] **Step 9: Verify the whole suite and build**

Run: `pnpm test`
Expected: PASS, including the new store tests and the existing suite.

Run: `pnpm lint` — clean. Then `pnpm build` — clean.

- [ ] **Step 10: Commit**

```bash
git add lib/services/storeService.ts "app/(public)/stores" "app/(app)/AppNav.tsx" "app/(public)/PublicGuestNav.tsx" proxy.test.mjs
git commit -m "feat(stores): add public /stores directory page"
```

---

### Task 8: Store detail page

**Files:**
- Create: `app/(public)/stores/[slug]/page.tsx`
- Create: `app/(public)/stores/[slug]/page.test.mjs`

**Interfaces:**
- Consumes: `getStoreBySlug` from `lib/services/storeService.ts`.
- Produces: the `/stores/[slug]` route and its `generateMetadata`.

- [ ] **Step 1: Write the failing test**

Create `app/(public)/stores/[slug]/page.test.mjs` using the same `loadPage` helper, stubbing `@/lib/services/storeService` and `next/navigation`.

```js
const STORE = {
  slug: "oui-oui-records-palermo",
  name: "Oui Oui Records",
  addressLine: "Soler 6090",
  neighborhood: "Palermo",
  city: "Ciudad Autónoma de Buenos Aires",
  province: "CABA",
  lat: -34.5769646,
  lng: -58.4376601,
  phone: "+541147735875",
  website: "http://www.ouioui-records.com/",
  instagram: null,
  openingHours: null,
  tags: ["usados", "nuevos"],
};

test("renders the store with a maps link and contact details", async () => {
  const { Page } = loadDetail(STORE);
  const html = ReactDOMServer.renderToStaticMarkup(
    await Page({ params: Promise.resolve({ slug: STORE.slug }) }),
  );

  assert.match(html, /Oui Oui Records/);
  assert.match(html, /Soler 6090/);
  assert.match(html, /maps\/search/);
  assert.match(html, /\+541147735875/);
});

test("generateMetadata titles the store for share cards", async () => {
  const { generateMetadata } = loadDetail(STORE);
  const meta = await generateMetadata({ params: Promise.resolve({ slug: STORE.slug }) });
  assert.match(meta.title, /Oui Oui Records/);
  assert.match(meta.description, /Palermo/);
});

test("an unknown slug calls notFound", async () => {
  const { Page, notFoundCalls } = loadDetail(null);
  await assert.rejects(() => Page({ params: Promise.resolve({ slug: "nope" }) }));
  assert.equal(notFoundCalls.length, 1);
});
```

In the loader, stub `next/navigation` with a `notFound` that records the call and throws, mirroring its real control flow:

```js
const notFoundCalls = [];
// ...
if (id === "next/navigation") {
  return {
    notFound: () => {
      notFoundCalls.push(true);
      throw new Error("NEXT_NOT_FOUND");
    },
  };
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "app/(public)/stores/[slug]/page.test.mjs"`
Expected: FAIL — the page does not exist.

- [ ] **Step 3: Write the detail page**

Create `app/(public)/stores/[slug]/page.tsx`. Follow `app/(public)/album/[id]/page.tsx` for the `cache()` + `generateMetadata` pattern.

```tsx
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/services/storeService";

// Deduped across generateMetadata and the page render within one request.
const getStoreCached = cache(getStoreBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreCached(slug);
  if (!store) return { title: "Disquería no encontrada" };

  const title = `${store.name} — Disquería en ${store.neighborhood}`;
  const description = `${store.name}, ${store.addressLine}, ${store.neighborhood}. Dónde comprar vinilos en Buenos Aires.`;
  return { title, description, openGraph: { title, description } };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreCached(slug);
  if (!store) notFound();

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/stores"
        className="text-sm text-zinc-600 hover:text-red-500 dark:text-zinc-400"
      >
        ← Disquerías
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{store.name}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {store.addressLine} · {store.neighborhood}, {store.city}
        </p>
      </div>

      {store.openingHours && (
        <section>
          <h2 className="text-sm font-medium">Horarios</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {store.openingHours}
          </p>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Cómo llegar
        </a>
        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
          >
            {store.phone}
          </a>
        )}
        {store.website && (
          <a
            href={store.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
          >
            Sitio web
          </a>
        )}
        {store.instagram && (
          <a
            href={`https://instagram.com/${store.instagram}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
          >
            @{store.instagram}
          </a>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Datos parciales de{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          © OpenStreetMap contributors
        </a>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "app/(public)/stores/[slug]/page.test.mjs"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Full verification**

Run: `pnpm test` — all suites pass.
Run: `pnpm lint` — clean.
Run: `pnpm build` — clean.

Then start `pnpm dev` and, signed out in a fresh browser profile, confirm:
- `/stores` renders all five seeded shops with no console errors.
- Searching `palermo` narrows to three; the neighbourhood select narrows correctly.
- A card's "Cómo llegar" opens the right location.
- `/stores/oui-oui-records-palermo` renders, and `/stores/does-not-exist` 404s.
- A shop with no hours and no phone (Exile Records) still looks deliberate rather than broken.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/stores/[slug]"
git commit -m "feat(stores): add store detail page"
```

---

## Post-implementation

Update `TODO.md`: tick §1–§5 and record the shop count reached in the curated file. Update `README.md`'s project-layout block with `lib/stores` and the two new scripts, and add `SCRAPER_USER_AGENT` to its environment-variables list.

The maintainer applies the `stores` table to production (`AGENTS.md`) and runs `pnpm stores:sync` against it.

**Not in this plan** — see `TODO.md` §6–§8: embedded map, scheduled discovery, user submissions, structured opening-hours parsing.
