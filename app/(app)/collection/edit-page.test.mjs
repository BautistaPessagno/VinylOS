import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const actionsPath = fileURLToPath(new URL("./actions.ts", import.meta.url));
const editPagePath = fileURLToPath(
  new URL("./[itemId]/edit/page.tsx", import.meta.url),
);

function loadEditPage({ requireSession, getCollectionItem }) {
  const source = readFileSync(editPagePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const localRequire = (id) => {
    if (id === "next/navigation") return { notFound() {} };
    if (id === "@/lib/auth-session") return { requireSession };
    if (id === "@/lib/services/collectionService") return { getCollectionItem };
    if (id === "../../actions") return { updateItemAction() {} };
    if (id === "./EditEditionSection") return { EditEditionSection() {} };
    if (id === "../../../SubmitButton") return { SubmitButton() {} };
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire },
    { filename: editPagePath },
  );
  return mod.exports.default;
}

test("collection edit authenticates before loading the signed-in user's item", async () => {
  const calls = [];
  const page = loadEditPage({
    requireSession: async () => {
      calls.push("session");
      return { user: { id: "owner-1" } };
    },
    getCollectionItem: async (userId, itemId) => {
      calls.push(["item", userId, itemId]);
      return {
        id: itemId,
        title: "Arrival",
        coverUrl: null,
        year: null,
        labelName: null,
        catalogNumber: null,
        country: null,
        masterId: null,
        folder: null,
        rating: null,
        mediaCondition: null,
        sleeveCondition: null,
        purchasePrice: null,
        purchaseDate: null,
        purchaseLocation: null,
        notes: null,
      };
    },
  });

  await page({ params: Promise.resolve({ itemId: "42" }) });

  assert.deepEqual(calls, ["session", ["item", "owner-1", 42]]);
});

test("collection edit does not export its read as a Server Action", () => {
  const actionsSource = readFileSync(actionsPath, "utf8");

  assert.doesNotMatch(actionsSource, /export async function getEditItemData/);
});
