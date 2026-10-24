import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { syncSharePreview } from "../lib/share-preview.js";

const projectId = process.argv[2];
if (!projectId) {
  console.error("使い方: node scripts/backfill-share-previews.mjs <projectId>");
  process.exit(1);
}

initializeApp({ projectId });
const db = getFirestore();
const snapshot = await db.collection("taskLists").where("shareCode", "!=", null).get();
let updated = 0;
for (const document of snapshot.docs) {
  if (await syncSharePreview(db, document.id, undefined, document.data(), Date.now())) {
    updated += 1;
  }
}
console.log(`共有中のリスト ${snapshot.size} 件のうち ${updated} 件のプレビューを書き込みました`);
