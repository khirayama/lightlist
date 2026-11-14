#!/usr/bin/env node
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, "apps/web/public/.well-known");
const aasaPath = resolve(directory, "apple-app-site-association");
const assetLinksPath = resolve(directory, "assetlinks.json");
const teamId = process.env.LIGHTLIST_IOS_TEAM_ID?.trim() || undefined;
const rawFingerprints =
  process.env.LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT?.trim() || undefined;
const checkOnly = process.argv.includes("--check");

if (!teamId && !rawFingerprints) {
  console.error(
    "LIGHTLIST_IOS_TEAM_ID と LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT を設定してください",
  );
  process.exit(1);
}
if (teamId && (teamId === "XXXXXXXXXX" || !/^[A-Z0-9]{10}$/.test(teamId))) {
  console.error(
    "LIGHTLIST_IOS_TEAM_ID は 10 文字の Apple Developer Team ID で指定してください",
  );
  process.exit(1);
}

const fingerprints = rawFingerprints
  ?.split(/[\s,]+/)
  .filter(Boolean)
  .map((value) => {
    const fingerprintHex = value.replaceAll(":", "").toUpperCase();
    if (!/^[0-9A-F]{64}$/.test(fingerprintHex)) {
      console.error(
        "LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT は SHA-256 の 64 桁 hex（コロン有無は任意、複数はカンマ区切り）で指定してください",
      );
      process.exit(1);
    }
    return fingerprintHex.match(/.{2}/g).join(":");
  });

const aasa = teamId
  ? `${JSON.stringify(
      {
        applinks: {
          details: [
            {
              appIDs: [`${teamId}.com.lightlist.app`],
              components: [{ "/": "/sharecodes/" }],
            },
          ],
        },
      },
      null,
      2,
    )}\n`
  : null;
const assetLinks = fingerprints?.length
  ? `${JSON.stringify(
      [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "com.lightlist.app",
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ],
      null,
      2,
    )}\n`
  : null;

if (checkOnly) {
  const [currentAasa, currentAssetLinks] = await Promise.all([
    readFile(aasaPath, "utf8").catch(() => null),
    readFile(assetLinksPath, "utf8").catch(() => null),
  ]);
  if (currentAasa !== aasa || currentAssetLinks !== assetLinks) {
    console.error(
      "apps/web/public/.well-known の内容が設定値と一致しません。just app-links で再生成してください",
    );
    process.exit(1);
  }
  console.log("App Links / Universal Links の設定は一致しています");
  process.exit(0);
}

await mkdir(directory, { recursive: true });
if (aasa) {
  await writeFile(aasaPath, aasa);
  console.log(`生成しました: ${aasaPath}`);
} else {
  await unlink(aasaPath).catch(() => {});
}
if (assetLinks) {
  await writeFile(assetLinksPath, assetLinks);
  console.log(`生成しました: ${assetLinksPath}`);
} else {
  await unlink(assetLinksPath).catch(() => {});
}
