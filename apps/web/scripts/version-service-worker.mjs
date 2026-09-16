import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";

const distDirectory = resolve(process.argv[2] ?? "dist");
const serviceWorkerPath = join(distDirectory, "sw.js");

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
};

const files = (await collectFiles(distDirectory)).sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(relative(distDirectory, file));
  hash.update("\0");
  hash.update(await readFile(file));
}
const buildId = hash.digest("hex").slice(0, 16);
const serviceWorker = await readFile(serviceWorkerPath, "utf8");
if (!serviceWorker.includes("__BUILD_ID__")) {
  throw new Error("Service Worker build ID placeholder is missing");
}
await writeFile(
  serviceWorkerPath,
  serviceWorker.replaceAll("__BUILD_ID__", buildId),
);
