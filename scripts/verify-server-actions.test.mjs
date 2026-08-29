import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const verifierPath = fileURLToPath(
  new URL("./verify-server-actions.mjs", import.meta.url),
);

function runVerifier(t, manifest, policy) {
  const fixtureDirectory = mkdtempSync(path.join(tmpdir(), "vinylos-server-actions-"));
  t.after(() => rmSync(fixtureDirectory, { recursive: true, force: true }));

  const manifestPath = path.join(fixtureDirectory, "manifest.json");
  const policyPath = path.join(fixtureDirectory, "policy.json");
  writeFileSync(manifestPath, JSON.stringify(manifest));
  writeFileSync(policyPath, JSON.stringify(policy));

  return spawnSync(process.execPath, [verifierPath, manifestPath, policyPath], {
    encoding: "utf8",
  });
}

test("production manifest rejects an unregistered user-facing action", (t) => {
  const result = runVerifier(
    t,
    {
      node: {
        generatedId: {
          filename: "app/example/actions.ts",
          exportedName: "unexpectedAction",
        },
      },
      edge: {},
    },
    { actions: [] },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Unregistered Server Action: app\/example\/actions\.ts#unexpectedAction/,
  );
});

test("production manifest rejects a registered action that is missing from the build", (t) => {
  const result = runVerifier(
    t,
    { node: {}, edge: {} },
    {
      actions: [
        {
          module: "app/example/actions.ts",
          export: "expectedAction",
          access: "authenticated",
        },
      ],
    },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Registered Server Action missing from build: app\/example\/actions\.ts#expectedAction/,
  );
});

test("server action policy rejects duplicate registrations", (t) => {
  const action = {
    module: "app/example/actions.ts",
    export: "expectedAction",
    access: "authenticated",
  };
  const result = runVerifier(
    t,
    {
      node: {
        generatedId: {
          filename: action.module,
          exportedName: action.export,
        },
      },
      edge: {},
    },
    { actions: [action, action] },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Duplicate Server Action registration: app\/example\/actions\.ts#expectedAction/,
  );
});

test("server action policy requires an authenticated or anonymous classification", (t) => {
  const result = runVerifier(
    t,
    {
      node: {
        generatedId: {
          filename: "app/example/actions.ts",
          exportedName: "expectedAction",
        },
      },
      edge: {},
    },
    {
      actions: [
        {
          module: "app/example/actions.ts",
          export: "expectedAction",
          access: "internal",
        },
      ],
    },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Incorrect Server Action access: app\/example\/actions\.ts#expectedAction \(expected authenticated, received internal\)/,
  );
});

test("server action policy rejects an extra anonymous action", (t) => {
  const result = runVerifier(
    t,
    {
      node: {
        generatedId: {
          filename: "app/example/actions.ts",
          exportedName: "unexpectedAction",
        },
      },
      edge: {},
    },
    {
      actions: [
        {
          module: "app/example/actions.ts",
          export: "unexpectedAction",
          access: "anonymous",
        },
      ],
    },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Incorrect Server Action access: app\/example\/actions\.ts#unexpectedAction \(expected authenticated, received anonymous\)/,
  );
});

test("server action policy keeps required anonymous actions anonymous", (t) => {
  const result = runVerifier(
    t,
    {
      node: {
        generatedId: {
          filename: "app/(app)/recommendations/actions.ts",
          exportedName: "searchExploreAction",
        },
      },
      edge: {},
    },
    {
      actions: [
        {
          module: "app/(app)/recommendations/actions.ts",
          export: "searchExploreAction",
          access: "authenticated",
        },
      ],
    },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Incorrect Server Action access: app\/\(app\)\/recommendations\/actions\.ts#searchExploreAction \(expected anonymous, received authenticated\)/,
  );
});
