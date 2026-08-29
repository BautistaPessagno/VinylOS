import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadNormalize() {
  const filename = fileURLToPath(new URL("./normalize.ts", import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const mod = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      module: mod,
      require,
    },
    { filename },
  );

  return mod.exports;
}

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
