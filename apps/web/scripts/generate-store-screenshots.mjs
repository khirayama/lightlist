import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const appRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

const iosEntries = [
  ["ios_01_home_detail.png", "01-home-detail.png"],
  ["ios_02_work_detail.png", "02-work-detail.png"],
  ["ios_03_trip_detail.png", "03-trip-detail.png"],
  ["ios_04_shared_detail.png", "04-shared-detail.png"],
  ["ios_05_share_sheet.png", "05-share-sheet.png"],
  ["ios_06_tasklists.png", "06-tasklists.png"],
  ["ios_07_settings.png", "07-settings.png"],
].map(([sourceName, outputName]) => ({
  input: path.join(repoRoot, "apps/ios/screenshots", sourceName),
  output: path.join(
    repoRoot,
    "apps/ios/screenshots/app-store/iphone-6.9",
    outputName,
  ),
  width: 1290,
  height: 2796,
}));

const androidEntries = [
  ["android_01_home_detail.png", "01-home-detail.png"],
  ["android_02_tasklists.png", "02-tasklists.png"],
  ["android_03_work_detail.png", "03-work-detail.png"],
  ["android_04_trip_detail.png", "04-trip-detail.png"],
  ["android_05_shared_detail.png", "05-shared-detail.png"],
  ["android_06_share_sheet.png", "06-share-sheet.png"],
  ["android_07_settings.png", "07-settings.png"],
].map(([sourceName, outputName]) => ({
  input: path.join(repoRoot, "apps/android/screenshots", sourceName),
  output: path.join(
    repoRoot,
    "apps/android/screenshots/google-play/phone",
    outputName,
  ),
  width: 1080,
  height: 1920,
}));

const webWideEntries = [
  ["web_01_home_detail.png", "01-home-detail.png"],
  ["web_02_work_detail.png", "02-work-detail.png"],
  ["web_03_trip_detail.png", "03-trip-detail.png"],
  ["web_04_shared_detail.png", "04-shared-detail.png"],
  ["web_05_share_modal.png", "05-share-modal.png"],
  ["web_06_calendar.png", "06-calendar.png"],
].map(([sourceName, outputName]) => ({
  input: path.join(appRoot, "screenshots", sourceName),
  output: path.join(appRoot, "public/screenshots/store/wide", outputName),
  width: 1920,
  height: 1080,
}));

const webNarrowEntries = [
  ["web_07_mobile_home_detail.png", "01-home-detail.png"],
].map(([sourceName, outputName]) => ({
  input: path.join(appRoot, "screenshots", sourceName),
  output: path.join(appRoot, "public/screenshots/store/narrow", outputName),
  width: 750,
  height: 1334,
}));

const platformDefinitions = {
  ios: {
    outputDirs: [
      path.join(repoRoot, "apps/ios/screenshots/app-store/iphone-6.9"),
    ],
    entries: iosEntries,
  },
  android: {
    outputDirs: [
      path.join(repoRoot, "apps/android/screenshots/google-play/phone"),
    ],
    entries: androidEntries,
  },
  web: {
    outputDirs: [
      path.join(appRoot, "public/screenshots/store/wide"),
      path.join(appRoot, "public/screenshots/store/narrow"),
    ],
    entries: [...webWideEntries, ...webNarrowEntries],
  },
};

const target = process.argv[2] ?? "all";
const platformNames =
  target === "all"
    ? Object.keys(platformDefinitions)
    : target
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

if (platformNames.length === 0) {
  console.error("target を指定してください: all | ios | android | web");
  process.exit(1);
}

for (const platformName of platformNames) {
  if (!(platformName in platformDefinitions)) {
    console.error(
      `不明な target です: ${platformName} (all | ios | android | web)`,
    );
    process.exit(1);
  }
}

for (const platformName of platformNames) {
  const definition = platformDefinitions[platformName];

  for (const outputDir of definition.outputDirs) {
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
  }

  for (const entry of definition.entries) {
    await sharp(entry.input)
      .resize({
        width: entry.width,
        height: entry.height,
        fit: "cover",
        position: "centre",
      })
      .png()
      .toFile(entry.output);

    console.log(
      `${platformName}: ${path.relative(repoRoot, entry.output)} ${entry.width}x${entry.height}`,
    );
  }
}
