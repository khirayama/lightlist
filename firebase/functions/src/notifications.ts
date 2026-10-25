import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  getMessaging,
  type BatchResponse,
  type MulticastMessage,
} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import pushLocales from "./push-locales.json";
import { isRecord, type RecordValue } from "./tasks";

const NOTIFICATION_COOLDOWN_MS = 10 * 60 * 1000;
const NOTIFICATION_TITLE_MAX_LENGTH = 100;
const recentNotifications = new Map<string, number>();

type DeviceRegistration = { deviceId: string; token: string; platform: string };

const notificationBody = (language: unknown): string => {
  if (typeof language === "string" && Object.hasOwn(pushLocales, language)) {
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

export const hasVisibleTaskListChange = (before: RecordValue, after: RecordValue): boolean =>
  before.name !== after.name || hasVisibleTaskChange(before, after);

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
  const invalidDeviceIds = responses.responses.flatMap((response, index) =>
    !response.success &&
    (response.error?.code === "messaging/registration-token-not-registered" ||
      response.error?.code === "messaging/invalid-registration-token")
      ? [registrations[index].deviceId]
      : [],
  );
  const [first, ...rest] = invalidDeviceIds;
  if (first === undefined) return;
  const fieldsAndValues = rest.flatMap((deviceId) => [
    new FieldPath("notificationDevices", deviceId),
    FieldValue.delete(),
  ]);
  await getFirestore()
    .collection("settings")
    .doc(uid)
    .update(new FieldPath("notificationDevices", first), FieldValue.delete(), ...fieldsAndValues);
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

const releaseNotification = async (throttleKey: string) => {
  recentNotifications.delete(throttleKey);
  await getFirestore().collection("notificationThrottles").doc(throttleKey).delete();
};

export const notifyTaskListMembers = async (
  taskListId: string,
  after: RecordValue,
  actorUid: string | undefined,
) => {
  if (typeof after.memberCount !== "number" || after.memberCount <= 1) return;

  const taskListName =
    typeof after.name === "string"
      ? Array.from(after.name).slice(0, NOTIFICATION_TITLE_MAX_LENGTH).join("")
      : "Lightlist";

  const db = getFirestore();
  const throttleKey = actorUid ? `${taskListId}_${actorUid}` : taskListId;
  if (!(await claimNotification(throttleKey))) return;
  let delivered = 0;
  const failureCodes: string[] = [];
  const deliver = async () => {
    const members = await db.collection("taskLists").doc(taskListId).collection("members").get();
    const results = await Promise.allSettled(
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
                priority: "high",
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
            delivered += response.successCount;
            for (const result of response.responses) {
              if (!result.success) failureCodes.push(result.error?.code ?? "unknown");
            }
            await removeInvalidRegistrations(uid, batchRegistrations, response);
          }
        }),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        const reason: unknown = result.reason;
        failureCodes.push(
          isRecord(reason) && typeof reason.code === "string" ? reason.code : "member_failed",
        );
      }
    }
  };
  try {
    await deliver();
  } catch (error) {
    await releaseNotification(throttleKey);
    throw error;
  }
  logger.info("shared list notification", { taskListId, delivered, failureCodes });
  if (delivered === 0 && failureCodes.length > 0) await releaseNotification(throttleKey);
};
