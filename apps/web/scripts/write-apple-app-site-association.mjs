import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = process.argv[2];
const allowMissingTeamId = process.argv.includes("--if-configured");
const teamId = process.env.LIGHTLIST_IOS_TEAM_ID?.trim();

if (!outputDirectory) {
  throw new Error("出力ディレクトリを指定してください。");
}

if (!teamId) {
  if (allowMissingTeamId) {
    process.exit(0);
  }
  throw new Error("LIGHTLIST_IOS_TEAM_ID を設定してください。");
}

if (!/^[A-Z0-9]{10}$/.test(teamId)) {
  throw new Error(
    "LIGHTLIST_IOS_TEAM_ID は 10 文字の英大文字・数字で指定してください。",
  );
}

const template = await readFile(
  new URL("../apple-app-site-association.template.json", import.meta.url),
  "utf8",
);
const destinationDirectory = resolve(outputDirectory, ".well-known");

await mkdir(destinationDirectory, { recursive: true });
await writeFile(
  resolve(destinationDirectory, "apple-app-site-association"),
  template.replaceAll("__LIGHTLIST_IOS_TEAM_ID__", teamId),
);
