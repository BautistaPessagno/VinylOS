import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadAction({ addCollectionItem, dismissRecommendationForRelease }) {
  const filename = fileURLToPath(new URL("./actions.ts", import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const localRequire = (id) => {
    if (id === "next/cache") return { revalidatePath() {} };
    if (id === "next/navigation") return { redirect() {} };
    if (id === "@/lib/auth-session") {
      return { requireSession: async () => ({ user: { id: "user-1" } }) };
    }
    if (id === "@/lib/toast/flash") return { appendToast: (path) => path };
    if (id === "@/lib/services/collectionService") return { addCollectionItem };
    if (id === "@/lib/services/recommendationService") {
      return {
        dismissReleaseForUser: async () => {},
        dismissRecommendationForRelease,
      };
    }
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    { exports: mod.exports, module: mod, require: localRequire, FormData },
    { filename },
  );
  return mod.exports.addAlbumToCollectionAction;
}

test("album detail keeps a successful add when recommendation cleanup fails", async () => {
  const action = loadAction({
    addCollectionItem: async () => 1,
    dismissRecommendationForRelease: async () => {
      throw new Error("cleanup failed");
    },
  });
  const formData = new FormData();
  formData.set("releaseId", "10");

  const result = await action(null, formData);

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { toast: "collection-added", inList: true },
  );
});
