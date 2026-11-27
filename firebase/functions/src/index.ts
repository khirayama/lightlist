import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import * as functionsV1 from "firebase-functions/v1";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentWritten, onDocumentWrittenWithAuthContext } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { hasVisibleTaskListChange, notifyTaskListMembers } from "./notifications";
import { deleteRemindersOf, deliverDueReminders, scheduleReminder } from "./reminders";
import { syncSharePreview } from "./share-preview";
import { isRecord, memberKeyOf } from "./tasks";

initializeApp();
setGlobalOptions({ region: "asia-northeast1", maxInstances: 3 });

export { mcp } from "./mcp";

export const notifySharedTaskListUpdates = onDocumentWrittenWithAuthContext(
  { document: "taskLists/{taskListId}", memory: "256MiB", timeoutSeconds: 30 },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const taskListId = event.params.taskListId;
    await syncSharePreview(getFirestore(), taskListId, before, after, Date.parse(event.time)).catch(
      (error: unknown) => {
        logger.error("share preview sync failed", {
          taskListId,
          code: isRecord(error) && typeof error.code === "string" ? error.code : "unknown",
        });
      },
    );
    if (!before || !after) return;
    const actorUid = event.authId;
    if (
      !actorUid ||
      !Array.isArray(before.memberKeys) ||
      !before.memberKeys.includes(memberKeyOf(actorUid))
    ) {
      return;
    }
    if (!hasVisibleTaskListChange(before, after)) return;
    await notifyTaskListMembers(taskListId, after, actorUid);
  },
);

export const scheduleReminderOnWrite = onDocumentWritten(
  { document: "reminders/{reminderId}", memory: "256MiB", timeoutSeconds: 30 },
  async (event) => {
    if (!event.data?.after.exists) return;
    await scheduleReminder(event.data.after, event.data.before.data());
  },
);

export const deliverReminders = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: "Etc/UTC",
    retryCount: 0,
    maxInstances: 1,
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  deliverDueReminders,
);

export const deleteApiTokensOnUserDelete = functionsV1
  .region("asia-northeast1")
  .runWith({ maxInstances: 1, memory: "256MB", timeoutSeconds: 30 })
  .auth.user()
  .onDelete(async (user) => {
    const db = getFirestore();
    const snapshot = await db.collection("apiTokens").where("uid", "==", user.uid).get();
    for (let offset = 0; offset < snapshot.docs.length; offset += 500) {
      const batch = db.batch();
      for (const tokenSnapshot of snapshot.docs.slice(offset, offset + 500)) {
        batch.delete(tokenSnapshot.ref);
      }
      await batch.commit();
    }
    await deleteRemindersOf(user.uid);
  });
