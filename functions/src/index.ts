import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  getMessaging,
  type BatchResponse,
  type MulticastMessage,
} from "firebase-admin/messaging";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentWrittenWithAuthContext } from "firebase-functions/v2/firestore";
import pushLocales from "./push-locales.json";

initializeApp();
setGlobalOptions({ region: "asia-northeast1", maxInstances: 3 });

const NOTIFICATION_COOLDOWN_MS = 10 * 60 * 1000;
const recentNotifications = new Map<string, number>();

type RecordValue = Record<string, unknown>;
type DeviceRegistration = { deviceId: string; token: string; platform: string };

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const notificationBody = (language: unknown): string => {
  if (typeof language === "string" && language in pushLocales) {
    return pushLocales[language as keyof typeof pushLocales];
  }
  return pushLocales.ja;
};

const taskSignature = (value: unknown): string => {
  if (!isRecord(value)) return "";
  return JSON.stringify([
    value.id,
    value.text,
    value.completed,
    value.date,
    value.pinned,
  ]);
};

const hasVisibleTaskChange = (before: unknown, after: unknown): boolean => {
  const previousTasks = isRecord(before) && isRecord(before.tasks) ? before.tasks : {};
  const nextTasks = isRecord(after) && isRecord(after.tasks) ? after.tasks : {};
  const taskIds = new Set([...Object.keys(previousTasks), ...Object.keys(nextTasks)]);
  for (const taskId of taskIds) {
    if (taskSignature(previousTasks[taskId]) !== taskSignature(nextTasks[taskId])) {
      return true;
    }
  }
  return false;
};

const getRegistrations = (value: unknown): DeviceRegistration[] => {
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([deviceId, entry]) => {
    if (
      isRecord(entry) &&
      typeof entry.token === "string" &&
      entry.token.length > 0 &&
      typeof entry.platform === "string"
    ) {
      return [{ deviceId, token: entry.token, platform: entry.platform }];
    }
    return [];
  });
};

const removeInvalidRegistrations = async (
  uid: string,
  registrations: DeviceRegistration[],
  responses: BatchResponse,
) => {
  const updates: Record<string, unknown> = {};
  responses.responses.forEach((response, index) => {
    if (
      !response.success &&
      (response.error?.code === "messaging/registration-token-not-registered" ||
        response.error?.code === "messaging/invalid-registration-token")
    ) {
      updates[`notificationDevices.${registrations[index].deviceId}`] =
        FieldValue.delete();
    }
  });
  if (Object.keys(updates).length > 0) {
    await getFirestore().collection("settings").doc(uid).update(updates);
  }
};

const isCoolingDown = (notifiedAt: unknown, now: number): boolean =>
  typeof notifiedAt === "number" && now - notifiedAt < NOTIFICATION_COOLDOWN_MS;

const claimNotification = async (throttleKey: string): Promise<boolean> => {
  const now = Date.now();
  if (isCoolingDown(recentNotifications.get(throttleKey), now)) return false;
  for (const [key, notifiedAt] of recentNotifications) {
    if (!isCoolingDown(notifiedAt, now)) recentNotifications.delete(key);
  }
  const throttleRef = getFirestore().collection("notificationThrottles").doc(throttleKey);
  const storedAt: unknown = (await throttleRef.get()).data()?.notifiedAt;
  if (typeof storedAt === "number" && isCoolingDown(storedAt, now)) {
    recentNotifications.set(throttleKey, storedAt);
    return false;
  }
  recentNotifications.set(throttleKey, now);
  await throttleRef.set({ notifiedAt: now });
  return true;
};

export const notifySharedTaskListUpdates = onDocumentWrittenWithAuthContext(
  { document: "taskLists/{taskListId}", memory: "256MiB", timeoutSeconds: 30 },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (typeof after.memberCount !== "number" || after.memberCount <= 1) return;

    const taskListName = typeof after.name === "string" ? after.name : "Lightlist";
    const listNameChanged = before.name !== after.name;
    if (!listNameChanged && !hasVisibleTaskChange(before, after)) return;

    const db = getFirestore();
    const taskListId = event.params.taskListId;
    const actorUid = event.authId;
    if (!(await claimNotification(actorUid ? `${taskListId}_${actorUid}` : taskListId))) return;
    const members = await event.data?.after.ref.collection("members").get();
    if (!members) return;
    await Promise.all(
      members.docs
        .map((member) => member.id)
        .filter((uid) => uid !== actorUid)
        .map(async (uid) => {
          const settingsSnapshot = await db.collection("settings").doc(uid).get();
          const settings = settingsSnapshot.data();
          if (settings?.notifySharedListUpdates !== true) return;
          const registrations = getRegistrations(settings.notificationDevices);
          if (registrations.length === 0) return;
          const body = notificationBody(settings.language);
          for (let offset = 0; offset < registrations.length; offset += 500) {
            const batchRegistrations = registrations.slice(offset, offset + 500);
            const message: MulticastMessage = {
              tokens: batchRegistrations.map(({ token }) => token),
              notification: { title: taskListName, body },
              data: { taskListId },
              android: {
                collapseKey: taskListId,
                notification: { channelId: "shared_list_updates", tag: taskListId },
              },
              apns: {
                headers: { "apns-collapse-id": taskListId },
                payload: { aps: { sound: "default" } },
              },
              webpush: {
                notification: { tag: taskListId },
                fcmOptions: {
                  link: `https://lightlist.app/app/?taskListId=${encodeURIComponent(taskListId)}`,
                },
              },
            };
            const response = await getMessaging().sendEachForMulticast(message);
            await removeInvalidRegistrations(uid, batchRegistrations, response);
          }
        }),
    );
  },
);
