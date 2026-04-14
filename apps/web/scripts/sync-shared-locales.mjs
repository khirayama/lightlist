import { cpSync, mkdirSync } from "node:fs";
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

mkdirSync(path.dirname(targetPath), { recursive: true });
cpSync(sourcePath, targetPath);
