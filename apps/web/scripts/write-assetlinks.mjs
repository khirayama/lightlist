import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = process.argv[2];
const allowMissingFingerprints = process.argv.includes("--if-configured");
const rawFingerprints =
  process.env.LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT?.trim();

if (!outputDirectory) {
  throw new Error("出力ディレクトリを指定してください。");
}

if (!rawFingerprints) {
  if (allowMissingFingerprints) {
    process.exit(0);
  }
  throw new Error(
    "LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT を設定してください。",
  );
}

const fingerprints = [
  ...new Set(
    rawFingerprints.split(",").map((fingerprint) => {
      const compactFingerprint = fingerprint
        .trim()
        .replaceAll(":", "")
        .toUpperCase();
      if (!/^[A-F0-9]{64}$/.test(compactFingerprint)) {
        throw new Error(
          "LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT には SHA-256 fingerprint をカンマ区切りで指定してください。",
        );
      }
      return compactFingerprint.match(/.{2}/g).join(":");
    }),
  ),
];

const template = await readFile(
  new URL("../assetlinks.template.json", import.meta.url),
  "utf8",
);
const content = template.replace(
  "__LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINTS__",
  JSON.stringify(fingerprints),
);
JSON.parse(content);

const destinationDirectory = resolve(outputDirectory, ".well-known");
await mkdir(destinationDirectory, { recursive: true });
await writeFile(
  resolve(destinationDirectory, "assetlinks.json"),
  `${content}\n`,
);
