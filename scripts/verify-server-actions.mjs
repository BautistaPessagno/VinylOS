import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultManifestPath = fileURLToPath(
  new URL("../.next/server/server-reference-manifest.json", import.meta.url),
);
const defaultPolicyPath = fileURLToPath(
  new URL("../server-actions.json", import.meta.url),
);

const [manifestPath = defaultManifestPath, policyPath = defaultPolicyPath] =
  process.argv.slice(2);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const policy = JSON.parse(readFileSync(policyPath, "utf8"));

function manifestActionKey(action) {
  return `${action.filename}#${action.exportedName}`;
}

function policyActionKey(action) {
  return `${action.module}#${action.export}`;
}

const anonymousActions = new Set([
  "app/(app)/recommendations/actions.ts#beginExploreAuthAction",
  "app/(app)/recommendations/actions.ts#openExploreAlbumAction",
  "app/(app)/recommendations/actions.ts#searchExploreAction",
]);

const registeredActionKeys = policy.actions.map(policyActionKey);
const registeredActions = new Set(registeredActionKeys);
const exposedActions = new Set(
  [...Object.values(manifest.node ?? {}), ...Object.values(manifest.edge ?? {})].map(
    manifestActionKey,
  ),
);

const unregisteredActions = [...exposedActions]
  .filter((action) => !registeredActions.has(action))
  .sort();
const missingActions = [...registeredActions]
  .filter((action) => !exposedActions.has(action))
  .sort();
const duplicateActions = [
  ...new Set(
    registeredActionKeys.filter(
      (action, index) => registeredActionKeys.indexOf(action) !== index,
    ),
  ),
].sort();
const incorrectAccess = policy.actions
  .map((action) => {
    const actionKey = policyActionKey(action);
    const expectedAccess = anonymousActions.has(actionKey) ? "anonymous" : "authenticated";
    return { actionKey, actualAccess: action.access, expectedAccess };
  })
  .filter((action) => action.actualAccess !== action.expectedAccess)
  .map((action) => ({
    action: action.actionKey,
    actualAccess: action.actualAccess,
    expectedAccess: action.expectedAccess,
  }));

for (const action of unregisteredActions) {
  console.error(`Unregistered Server Action: ${action}`);
}
for (const action of missingActions) {
  console.error(`Registered Server Action missing from build: ${action}`);
}
for (const action of duplicateActions) {
  console.error(`Duplicate Server Action registration: ${action}`);
}
for (const entry of incorrectAccess) {
  console.error(
    `Incorrect Server Action access: ${entry.action} ` +
      `(expected ${entry.expectedAccess}, received ${entry.actualAccess})`,
  );
}

if (
  unregisteredActions.length > 0 ||
  missingActions.length > 0 ||
  duplicateActions.length > 0 ||
  incorrectAccess.length > 0
) {
  process.exitCode = 1;
}
