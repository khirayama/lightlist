import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outputDir = path.join(webRoot, "public", "licenses");
const outputPath = path.join(outputDir, "licenses.json");
const manualLicensesPath = path.resolve(
  webRoot,
  "..",
  "..",
  "shared",
  "licenses",
  "manual-licenses.json",
);

const customFormatPath = path.join(__dirname, ".license-checker-format.json");

const customFormat = {
  name: "",
  version: "",
  licenses: "",
  repository: "",
  licenseText: "",
};

const parseLicenses = (raw) => {
  const parsed = JSON.parse(raw);
  return Object.values(parsed)
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const packageName =
        typeof entry.name === "string" && entry.name.length > 0
          ? entry.name
          : null;
      const version =
        typeof entry.version === "string" && entry.version.length > 0
          ? entry.version
          : "";
      if (!packageName) {
        return null;
      }

      return {
        name: packageName,
        version,
        license:
          typeof entry.licenses === "string" && entry.licenses.length > 0
            ? entry.licenses
            : "UNKNOWN",
        repository:
          typeof entry.repository === "string" && entry.repository.length > 0
            ? entry.repository
            : undefined,
        licenseText:
          typeof entry.licenseText === "string" ? entry.licenseText.trim() : "",
      };
    })
    .filter((entry) => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
};

await mkdir(outputDir, { recursive: true });
await writeFile(customFormatPath, `${JSON.stringify(customFormat, null, 2)}\n`);

const { stdout } = await execFileAsync(
  "npx",
  [
    "--yes",
    "license-checker-rseidelsohn",
    "--production",
    "--json",
    "--customPath",
    customFormatPath,
  ],
  { cwd: webRoot, maxBuffer: 16 * 1024 * 1024 },
);

const openSourceLicenses = parseLicenses(stdout);
const manualLicenses = JSON.parse(await readFile(manualLicensesPath, "utf8"));

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      openSourceLicenses,
      bundledLicenses: manualLicenses,
    },
    null,
    2,
  )}\n`,
);

await rm(customFormatPath, { force: true });
