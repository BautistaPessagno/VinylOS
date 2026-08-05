import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(new URL("./auth-session.ts", import.meta.url));

test("auth-session exposes optional and required session helpers", () => {
  const source = readFileSync(filename, "utf8");
  assert.match(source, /export async function getOptionalSession/);
  assert.match(source, /export async function requireSession/);
  assert.match(source, /throw new Error\("Unauthorized"\)/);
});
