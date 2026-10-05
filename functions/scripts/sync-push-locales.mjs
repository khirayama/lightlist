import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = resolve(scriptDirectory, "../..");
const locales = JSON.parse(
  await readFile(
    resolve(repositoryDirectory, "shared/locales/locales.json"),
    "utf8",
  ),
);
const pushLocales = Object.fromEntries(
  Object.entries(locales).map(([language, locale]) => [
    language,
    locale.pushNotifications.sharedListUpdated,
  ]),
);

await writeFile(
  resolve(scriptDirectory, "../src/push-locales.json"),
  `${JSON.stringify(pushLocales, null, 2)}\n`,
);
