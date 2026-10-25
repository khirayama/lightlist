import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { init, type ModuleInfos } from "license-checker-rseidelsohn";

type LocaleTree = { [key: string]: string | LocaleTree };

const webRoot = resolve(import.meta.dirname, "..");
const sharedRoot = resolve(webRoot, "../../shared");

const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const flatten = (
  value: string | LocaleTree,
  prefix: string,
  out: Record<string, string>,
): Record<string, string> => {
  if (typeof value === "string") {
    out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
};

const syncLocales = () => {
  const locales: Record<string, LocaleTree> = JSON.parse(
    readFileSync(resolve(sharedRoot, "locales/locales.json"), "utf8"),
  );
  const localesDir = resolve(webRoot, "src/locales");
  rmSync(localesDir, { recursive: true, force: true });
  mkdirSync(localesDir, { recursive: true });
  for (const [language, translation] of Object.entries(locales)) {
    writeJson(resolve(localesDir, `${language}.json`), translation);
  }
  writeJson(
    resolve(webRoot, "src/english-date-patterns.json"),
    locales.en.datePatterns,
  );
  writeJson(
    resolve(webRoot, "src/lp-locales.json"),
    Object.fromEntries(
      Object.entries(locales).map(([language, translation]) => {
        const common = translation.common as LocaleTree;
        const pages = translation.pages as LocaleTree;
        return [
          language,
          flatten(pages.index, "pages.index", {
            copyright: translation.copyright as string,
            "common.skipToMain": common.skipToMain as string,
          }),
        ];
      }),
    ),
  );
};

const generateLicenses = async () => {
  const packages: ModuleInfos = await promisify(init)({
    start: webRoot,
    production: true,
    customFormat: {
      name: "",
      version: "",
      licenses: "",
      repository: "",
      licenseText: "",
    },
  });
  const openSourceLicenses = Object.values(packages)
    .flatMap(({ name, version, licenses, repository, licenseText }) =>
      name
        ? [
            {
              name,
              version: version ?? "",
              license:
                typeof licenses === "string" && licenses ? licenses : "UNKNOWN",
              repository: repository || undefined,
              licenseText: licenseText?.trim() ?? "",
            },
          ]
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const outputDir = resolve(webRoot, "public/licenses");
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, "licenses.json"), {
    openSourceLicenses,
    bundledLicenses: JSON.parse(
      readFileSync(
        resolve(sharedRoot, "licenses/manual-licenses.json"),
        "utf8",
      ),
    ),
  });
};

export const prepareAssets = async () => {
  syncLocales();
  await generateLicenses();
};

if (import.meta.main) await prepareAssets();
