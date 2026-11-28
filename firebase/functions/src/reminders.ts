import { getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import { getRegistrations, notifyTaskListMembers, removeInvalidRegistrations } from "./notifications";
import {
  buildTaskUpdateData,
  getOrderedTasks,
  insertTask,
  isRecord,
  isValidDateKey,
  memberKeyOf,
  readTasks,
  resolveTaskSettings,
  type RecordValue,
} from "./tasks";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_REPEAT_STEPS = 200;
const TASK_LIST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export type Repeat = {
  freq: "none" | "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  weekdays: number[];
  monthlyBy: "day" | "weekday";
};

export type Reminder = {
  date: string;
  time: string;
  repeat: Repeat;
  timeZone: string;
};

const REPEAT_FREQS = ["none", "daily", "weekly", "monthly", "yearly"] as const;

const isRepeatFreq = (value: unknown): value is Repeat["freq"] =>
  REPEAT_FREQS.some((freq) => freq === value);

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterOf = (timeZone: string): Intl.DateTimeFormat | null => {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
    return formatter;
  } catch {
    return null;
  }
};

const wallClockOf = (formatter: Intl.DateTimeFormat, epoch: number): number => {
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(epoch)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
};

const offsetAt = (formatter: Intl.DateTimeFormat, epoch: number): number =>
  wallClockOf(formatter, epoch) - Math.floor(epoch / 1000) * 1000;

const zonedEpoch = (formatter: Intl.DateTimeFormat, wallClock: number): number => {
  const offsetBefore = offsetAt(formatter, wallClock - DAY_MS);
  const candidates = [offsetBefore, offsetAt(formatter, wallClock + DAY_MS)]
    .map((offset) => wallClock - offset)
    .filter((epoch) => wallClockOf(formatter, epoch) === wallClock)
    .sort((left, right) => left - right);
  return candidates[0] ?? wallClock - offsetBefore;
};

export const canonicalTimeZoneOf = (timeZone: string): string | null =>
  timeZone.length > 0 && timeZone.length <= 64
    ? (formatterOf(timeZone)?.resolvedOptions().timeZone ?? null)
    : null;

const readRepeat = (value: unknown): Repeat | null => {
  if (!isRecord(value) || !isRepeatFreq(value.freq)) return null;
  const { interval, weekdays, monthlyBy } = value;
  if (typeof interval !== "number" || !Number.isInteger(interval) || interval < 1 || interval > 99) {
    return null;
  }
  if (!Array.isArray(weekdays) || (monthlyBy !== "day" && monthlyBy !== "weekday")) return null;
  const days = weekdays.filter(
    (day): day is number => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 7,
  );
  if ((value.freq === "weekly") !== days.length > 0) return null;
  return { freq: value.freq, interval, weekdays: days, monthlyBy };
};

export const readReminder = (data: RecordValue): Reminder | null => {
  const { date, time, timeZone } = data;
  const repeat = readRepeat(data.repeat);
  if (typeof time !== "string" || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) return null;
  if (typeof date !== "string" || !isValidDateKey(date) || typeof timeZone !== "string" || !repeat) {
    return null;
  }
  return { date, time, repeat, timeZone };
};

const scheduleSignature = (data: RecordValue): string => {
  const repeat = isRecord(data.repeat) ? data.repeat : {};
  return JSON.stringify([
    data.date,
    data.time,
    data.timeZone,
    data.enabled,
    repeat.freq,
    repeat.interval,
    repeat.weekdays,
    repeat.monthlyBy,
  ]);
};

const dayNumberOf = (year: number, month: number, day: number): number =>
  Math.round(Date.UTC(year, month - 1, day) / DAY_MS);

const dateOf = (dayNumber: number): [number, number, number] => {
  const date = new Date(dayNumber * DAY_MS);
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
};

const isoWeekdayOf = (dayNumber: number): number => ((new Date(dayNumber * DAY_MS).getUTCDay() + 6) % 7) + 1;

export const isoWeekdayOfDateKey = (dateKey: string): number => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return isoWeekdayOf(dayNumberOf(year, month, day));
};

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const nthWeekdayDay = (year: number, month: number, weekday: number, nth: number): number => {
  if (nth >= 5) {
    const last = daysInMonth(year, month);
    return last - ((isoWeekdayOf(dayNumberOf(year, month, last)) - weekday + 7) % 7);
  }
  return 1 + ((weekday - isoWeekdayOf(dayNumberOf(year, month, 1)) + 7) % 7) + (nth - 1) * 7;
};

const occurrenceOnOrAfter = (reminder: Reminder, fromDay: number): number | null => {
  const [year, month, day] = reminder.date.split("-").map(Number);
  const anchor = dayNumberOf(year, month, day);
  const start = Math.max(anchor, fromDay);
  const { freq, interval, weekdays, monthlyBy } = reminder.repeat;
  if (freq === "none") return anchor >= fromDay ? anchor : null;
  if (freq === "daily") return anchor + Math.ceil((start - anchor) / interval) * interval;
  if (freq === "weekly") {
    const anchorWeek = anchor - (isoWeekdayOf(anchor) - 1);
    for (let candidate = start; candidate < start + 7 * interval + 7; candidate += 1) {
      const weekIndex = Math.floor((candidate - anchorWeek) / 7);
      if (weekIndex % interval === 0 && weekdays.includes(isoWeekdayOf(candidate))) return candidate;
    }
    return null;
  }
  const [startYear, startMonth] = dateOf(start);
  if (freq === "monthly") {
    const anchorMonth = year * 12 + month - 1;
    const firstStep = Math.max(0, Math.floor((startYear * 12 + startMonth - 1 - anchorMonth) / interval));
    for (let step = firstStep; step < firstStep + MAX_REPEAT_STEPS; step += 1) {
      const monthIndex = anchorMonth + step * interval;
      const candidateYear = Math.floor(monthIndex / 12);
      const candidateMonth = (monthIndex % 12) + 1;
      const candidateDay =
        monthlyBy === "day"
          ? day
          : nthWeekdayDay(candidateYear, candidateMonth, isoWeekdayOf(anchor), Math.ceil(day / 7));
      if (candidateDay > daysInMonth(candidateYear, candidateMonth)) continue;
      const candidate = dayNumberOf(candidateYear, candidateMonth, candidateDay);
      if (candidate >= start) return candidate;
    }
    return null;
  }
  const firstStep = Math.max(0, Math.floor((startYear - year) / interval));
  for (let step = firstStep; step < firstStep + MAX_REPEAT_STEPS; step += 1) {
    const candidateYear = year + step * interval;
    if (day > daysInMonth(candidateYear, month)) continue;
    const candidate = dayNumberOf(candidateYear, month, day);
    if (candidate >= start) return candidate;
  }
  return null;
};

export const nextFireAtOf = (reminder: Reminder, base: number): number | null => {
  const formatter = formatterOf(reminder.timeZone);
  if (!formatter) return null;
  const [hour, minute] = reminder.time.split(":").map(Number);
  const epochOf = (dayNumber: number) => {
    const [year, month, day] = dateOf(dayNumber);
    return zonedEpoch(formatter, Date.UTC(year, month - 1, day, hour, minute));
  };
  const baseDate = new Date(wallClockOf(formatter, base));
  const baseDay = dayNumberOf(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, baseDate.getUTCDate());
  const first = occurrenceOnOrAfter(reminder, baseDay);
  if (first === null) return null;
  if (epochOf(first) >= base) return epochOf(first);
  const next = occurrenceOnOrAfter(reminder, first + 1);
  return next === null ? null : epochOf(next);
};

export const scheduleReminder = async (snapshot: DocumentSnapshot, before: RecordValue | undefined) => {
  const after = snapshot.data();
  if (!after || (before && scheduleSignature(before) === scheduleSignature(after))) return;
  const now = Date.now();
  const updatedAt = typeof after.updatedAt === "number" ? after.updatedAt : now;
  const reminder = readReminder(after);
  const nextFireAt =
    after.enabled === true && reminder
      ? nextFireAtOf(reminder, Math.min(now, Math.max(updatedAt, now - HOUR_MS)))
      : null;
  if (after.enabled === true && nextFireAt === null) {
    await snapshot.ref.update({ enabled: false, nextFireAt: null });
    return;
  }
  if (after.nextFireAt === nextFireAt) return;
  await snapshot.ref.update({ nextFireAt });
};

const dateKeyAt = (timeZone: string, epoch: number): string | null => {
  const formatter = formatterOf(timeZone);
  return formatter ? new Date(wallClockOf(formatter, epoch)).toISOString().slice(0, 10) : null;
};

const errorCodeOf = (error: unknown): string =>
  isRecord(error) && (typeof error.code === "string" || typeof error.code === "number")
    ? String(error.code)
    : "unknown";

type ReminderTaskResult = "added" | "exists" | null;

const addReminderTask = async (
  ownerUid: string,
  settings: unknown,
  reminderId: string,
  data: RecordValue,
  fireAt: number,
  text: string,
): Promise<ReminderTaskResult> => {
  const { taskListId, timeZone } = data;
  if (typeof taskListId !== "string" || !TASK_LIST_ID_PATTERN.test(taskListId)) return null;
  const date = typeof timeZone === "string" ? dateKeyAt(timeZone, fireAt) : null;
  if (!date) return null;
  const db = getFirestore();
  const taskId = `r_${reminderId}_${fireAt}`;
  try {
    const taskSettings = resolveTaskSettings(settings);
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(db.collection("taskLists").doc(taskListId));
      const taskList = snapshot.data();
      if (
        !taskList ||
        !Array.isArray(taskList.memberKeys) ||
        !taskList.memberKeys.includes(memberKeyOf(ownerUid))
      ) {
        return null;
      }
      if (isRecord(taskList.tasks) && Object.hasOwn(taskList.tasks, taskId)) {
        return { taskList, added: false };
      }
      const orderedTasks = getOrderedTasks(readTasks(taskList));
      const nextTasks = insertTask(
        orderedTasks,
        { id: taskId, text, completed: false, date, pinned: false },
        taskSettings,
      );
      transaction.update(snapshot.ref, {
        ...buildTaskUpdateData(orderedTasks, nextTasks),
        updatedAt: Date.now(),
      });
      return { taskList, added: true };
    });
    if (!result) return null;
    if (!result.added) return "exists";
    await notifyTaskListMembers(taskListId, result.taskList, ownerUid).catch((error: unknown) => {
      logger.error("reminder task notification failed", { code: errorCodeOf(error) });
    });
    return "added";
  } catch (error) {
    logger.error("reminder task failed", { code: errorCodeOf(error) });
    return null;
  }
};

const messageOf = (
  tokens: string[],
  reminderId: string,
  taskListId: string | null,
  text: string,
  expiresAt: number,
  now: number,
): MulticastMessage => {
  const ttlSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
  return {
    tokens,
    notification: { title: "Lightlist", body: text },
    data: taskListId ? { reminderId, taskListId } : { reminderId },
    android: {
      priority: "high",
      ttl: ttlSeconds * 1000,
      collapseKey: reminderId,
      notification: { channelId: "reminders", tag: reminderId },
    },
    apns: {
      headers: {
        "apns-collapse-id": reminderId,
        "apns-expiration": String(Math.floor(expiresAt / 1000)),
      },
      payload: { aps: { sound: "default" } },
    },
    webpush: {
      headers: { TTL: String(ttlSeconds) },
      notification: { tag: reminderId },
      fcmOptions: {
        link: taskListId
          ? `https://lightlist.app/app/?taskListId=${encodeURIComponent(taskListId)}`
          : "https://lightlist.app/app/#/reminders",
      },
    },
  };
};

export const deliverDueReminders = async () => {
  const db = getFirestore();
  const now = Date.now();
  const snapshot = await db
    .collection("reminders")
    .where("nextFireAt", "<=", now + 10 * 1000)
    .orderBy("nextFireAt")
    .limit(500)
    .get();
  if (snapshot.empty) return;

  const remindersByOwner = new Map<string, DocumentSnapshot[]>();
  for (const reminderSnapshot of snapshot.docs) {
    const ownerUid: unknown = reminderSnapshot.get("ownerUid");
    if (typeof ownerUid !== "string" || ownerUid.length === 0) continue;
    remindersByOwner.set(ownerUid, [...(remindersByOwner.get(ownerUid) ?? []), reminderSnapshot]);
  }

  let delivered = 0;
  let attempted = 0;
  let tasksAdded = 0;
  const failureCodes: string[] = [];
  const batch = db.batch();
  const results = await Promise.allSettled(
    [...remindersByOwner].map(async ([ownerUid, reminderSnapshots]) => {
      const settings = (await db.collection("settings").doc(ownerUid).get()).data();
      const notifies = settings?.notifyReminders === true;
      let registrations = notifies ? getRegistrations(settings.notificationDevices) : [];
      for (const reminderSnapshot of reminderSnapshots) {
        const data = reminderSnapshot.data() ?? {};
        const fireAt = typeof data.nextFireAt === "number" ? data.nextFireAt : now;
        const text = typeof data.text === "string" ? data.text : "";
        const isDue = notifies && fireAt >= now - HOUR_MS && text.length > 0;
        const taskResult = isDue
          ? await addReminderTask(ownerUid, settings, reminderSnapshot.id, data, fireAt, text)
          : null;
        if (taskResult === "added") tasksAdded += 1;
        if (isDue && registrations.length > 0) {
          attempted += 1;
          const response = await getMessaging().sendEachForMulticast(
            messageOf(
              registrations.map(({ token }) => token),
              reminderSnapshot.id,
              taskResult && typeof data.taskListId === "string" ? data.taskListId : null,
              text,
              fireAt + HOUR_MS,
              now,
            ),
          );
          delivered += response.successCount;
          for (const result of response.responses) {
            if (!result.success) failureCodes.push(result.error?.code ?? "unknown");
          }
          const invalidDeviceIds = await removeInvalidRegistrations(ownerUid, registrations, response);
          registrations = registrations.filter(({ deviceId }) => !invalidDeviceIds.includes(deviceId));
        }
        const reminder = readReminder(data);
        const nextFireAt = reminder ? nextFireAtOf(reminder, Math.max(fireAt + 1, now - HOUR_MS)) : null;
        batch.update(
          reminderSnapshot.ref,
          nextFireAt === null ? { enabled: false, nextFireAt: null } : { nextFireAt },
        );
      }
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      const reason: unknown = result.reason;
      failureCodes.push(
        isRecord(reason) && typeof reason.code === "string" ? reason.code : "owner_failed",
      );
    }
  }
  await batch.commit();
  if (attempted > 0 || tasksAdded > 0) {
    logger.info("reminder notification", {
      reminders: attempted,
      delivered,
      tasksAdded,
      failureCodes,
    });
  }
};

export const deleteRemindersOf = async (uid: string) => {
  const db = getFirestore();
  const snapshot = await db.collection("reminders").where("ownerUid", "==", uid).get();
  for (let offset = 0; offset < snapshot.docs.length; offset += 500) {
    const batch = db.batch();
    for (const reminderSnapshot of snapshot.docs.slice(offset, offset + 500)) {
      batch.delete(reminderSnapshot.ref);
    }
    await batch.commit();
  }
};
