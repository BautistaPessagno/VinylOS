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
