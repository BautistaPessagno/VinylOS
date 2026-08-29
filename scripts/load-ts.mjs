// Loads a TypeScript module from the repo by transpiling it in-process, the same
// way the *.test.mjs suites do. Scripts cannot use the `@/` alias — it only
// resolves inside the Next build — so relative imports are resolved here.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

export const ROOT = new URL("../", import.meta.url);

const cache = new Map();

export function loadTs(relativePath) {
  // Normalize so `./foo` and `foo` cache together; strip a leading slash if any.
  const normalized = relativePath.replace(/^\.\//, "").replace(/^\//, "");
  const cached = cache.get(normalized);
  if (cached) return cached;

  const fileUrl = new URL(normalized, ROOT);
  const filename = fileURLToPath(fileUrl);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const rootPath = fileURLToPath(ROOT);
  const localRequire = (id) => {
    if (!id.startsWith(".")) return require(id);
    // Resolve relative to the current module, then re-enter loadTs with a
    // path relative to the repo root (posix-style, for stable cache keys).
    const resolvedAbs = fileURLToPath(new URL(`${id}.ts`, fileUrl));
    const rel = path.relative(rootPath, resolvedAbs).split(path.sep).join("/");
    return loadTs(rel);
  };

  const mod = { exports: {} };
  // Seed the cache before execution so circular relative imports resolve.
  cache.set(normalized, mod.exports);
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
  cache.set(normalized, mod.exports);
  return mod.exports;
}
