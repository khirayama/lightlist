import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { init } from "license-checker-rseidelsohn";

const readLicenses = promisify(init);
const webRoot = path.resolve(import.meta.dirname, "..");
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

const customFormat = {
  name: "",
  version: "",
  licenses: "",
  repository: "",
  licenseText: "",
};

const parseLicenses = (packages) => {
  return Object.values(packages)
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
const packages = await readLicenses({
  start: webRoot,
  production: true,
  json: true,
  customFormat,
});

const openSourceLicenses = parseLicenses(packages);
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
