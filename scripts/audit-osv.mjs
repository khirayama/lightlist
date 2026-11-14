#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const root = resolve(import.meta.dirname, "..");
const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_VULN_URL = "https://api.osv.dev/v1/vulns";
const OSV_BATCH_SIZE = 1000;
const target = process.argv[2] ?? "all";
const execFileAsync = promisify(execFile);

if (!["ios", "android", "all"].includes(target)) {
  console.error("usage: node scripts/audit-osv.mjs [ios|android|all]");
  process.exit(2);
}

const addQuery = (queries, skipped, ecosystem, name, version) => {
  if (!version) {
    skipped.push(name);
    return;
  }
  const key = `${ecosystem}:${name}@${version}`;
  if (!queries.some((query) => query.key === key)) {
    queries.push({ key, package: { ecosystem, name }, version });
  }
};

const readIosQueries = async () => {
  const path = resolve(
    root,
    "apps/ios/Lightlist.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved",
  );
  const data = JSON.parse(await readFile(path, "utf8"));
  const queries = [];
  const skipped = [];
  for (const pin of data.pins ?? []) {
    const version = pin.state?.version;
    if (typeof pin.location === "string") {
      const name = pin.location
        .replace(/^https?:\/\//, "")
        .replace(/\.git$/, "");
      addQuery(queries, skipped, "SwiftURL", name, version);
    }
  }
  return { label: "iOS", queries, skipped };
};

const readAndroidQueries = async () => {
  const androidRoot = resolve(root, "apps/android");
  const { stdout } = await execFileAsync(
    resolve(androidRoot, "gradlew"),
    [
      ":app:dependencies",
      "--configuration",
      "releaseRuntimeClasspath",
      "--console=plain",
    ],
    { cwd: androidRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (/ FAILED$/m.test(stdout)) {
    throw new Error("Android の依存解決に失敗しました");
  }
  const queries = [];
  const skipped = [];
  for (const line of stdout.split("\n")) {
    const match = /^[|+\-\\ ]*[+\\]--- (.+?)\s*$/.exec(line);
    if (!match || / \(c\)$/.test(match[1])) continue;
    const dependency = match[1].replace(/ \(\*\)$/, "");
    const arrow = dependency.lastIndexOf(" -> ");
    const resolved =
      arrow < 0
        ? dependency
        : (() => {
            const coordinates = dependency.slice(0, arrow).split(":");
            return coordinates.length >= 2
              ? `${coordinates.slice(0, 2).join(":")}:${dependency.slice(arrow + 4)}`
              : dependency;
          })();
    const parts = resolved.split(":");
    if (parts.length !== 3) {
      skipped.push(resolved);
      continue;
    }
    const [group, name, version] = parts;
    addQuery(queries, skipped, "Maven", `${group}:${name}`, version);
  }

  return { label: "Android", queries, skipped };
};

const queryOsv = async (queries) => {
  const response = await fetch(OSV_BATCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      queries: queries.map(({ key: _key, ...query }) => query),
    }),
  });
  if (!response.ok) {
    throw new Error(`OSV API ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return payload.results ?? [];
};

const readVulnerability = async (id) => {
  const response = await fetch(`${OSV_VULN_URL}/${encodeURIComponent(id)}`);
  return response.ok ? response.json() : { id };
};

const main = async () => {
  const groups = [];
  if (target === "ios" || target === "all") groups.push(await readIosQueries());
  if (target === "android" || target === "all")
    groups.push(await readAndroidQueries());

  let hitCount = 0;
  for (const { label, queries, skipped } of groups) {
    console.log(`${label}: ${queries.length} 件を OSV で照合`);
    if (skipped.length > 0) {
      console.log(`  版未固定のため未照合: ${skipped.join(", ")}`);
    }
    if (queries.length === 0) continue;
    for (let offset = 0; offset < queries.length; offset += OSV_BATCH_SIZE) {
      const batch = queries.slice(offset, offset + OSV_BATCH_SIZE);
      const results = await queryOsv(batch);
      for (let index = 0; index < results.length; index += 1) {
        const vulns = results[index]?.vulns;
        if (!Array.isArray(vulns) || vulns.length === 0) continue;
        hitCount += 1;
        const query = batch[index];
        console.log(`  脆弱性あり: ${query.package.name}@${query.version}`);
        for (const vuln of vulns) {
          const detail = await readVulnerability(vuln.id);
          console.log(`    ${vuln.id}: ${detail.summary ?? ""}`.trimEnd());
        }
      }
    }
  }
  if (hitCount > 0) process.exit(1);
  console.log("OSV: 既知の脆弱性なし");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
