import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(new URL("./AppNav.tsx", import.meta.url));

test("navigation uses an accessible Explore search magnifier instead of Add", () => {
  const source = readFileSync(filename, "utf8");

  assert.match(
    source,
    /const SEARCH_HREF = "\/recommendations\?tab=explore&focus=search"/,
  );
  assert.ok((source.match(/href=\{SEARCH_HREF\}/g) ?? []).length >= 2);
  assert.match(source, /aria-label="Search records and artists"/);
  assert.match(source, /<svg/);
  assert.doesNotMatch(source, />\s*\+ Add\s*</);
});
