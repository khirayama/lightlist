import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.join(__dirname, "..");
const sourcePath = path.join(
  webRoot,
  "..",
  "..",
  "shared",
  "locales",
  "locales.json",
);
const targetPath = path.join(webRoot, "src", "locales.json");
const lpTargetPath = path.join(webRoot, "src", "lp-locales.json");

mkdirSync(path.dirname(targetPath), { recursive: true });
copyFileSync(sourcePath, targetPath);

const locales = JSON.parse(readFileSync(sourcePath, "utf8"));

const flatten = (value, prefix, out) => {
  if (typeof value === "string") {
    out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
};

const lpLocales = Object.fromEntries(
  Object.entries(locales).map(([language, translation]) => [
    language,
    flatten(translation.pages.index, "pages.index", {
      copyright: translation.copyright,
      "common.skipToMain": translation.common.skipToMain,
    }),
  ]),
);

writeFileSync(lpTargetPath, `${JSON.stringify(lpLocales, null, 2)}\n`);
