import type { Firestore } from "firebase-admin/firestore";

export type RecordValue = Record<string, unknown>;

export const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const SHARE_CODE_PATTERN = /^[A-Z0-9]{8}$/;

const shareCodeOf = (value: unknown): string | null =>
  isRecord(value) && typeof value.shareCode === "string" && SHARE_CODE_PATTERN.test(value.shareCode)
    ? value.shareCode
    : null;

const previewTasks = (value: unknown): Record<string, RecordValue> => {
  const tasks = isRecord(value) && isRecord(value.tasks) ? value.tasks : {};
  const result: Record<string, RecordValue> = {};
  for (const [taskId, task] of Object.entries(tasks)) {
    if (
      isRecord(task) &&
      task.id === taskId &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean" &&
      typeof task.date === "string" &&
      typeof task.order === "number" &&
      Number.isFinite(task.order) &&
      typeof task.pinned === "boolean"
    ) {
      result[taskId] = {
        id: taskId,
        text: task.text,
        completed: task.completed,
        date: task.date,
        order: task.order,
        pinned: task.pinned,
      };
    }
  }
  return result;
};

const previewSignature = (value: unknown): string =>
  isRecord(value)
    ? JSON.stringify([value.name, value.background ?? null, previewTasks(value)])
    : "";

export const syncSharePreview = async (
  db: Firestore,
  taskListId: string,
  before: RecordValue | undefined,
  after: RecordValue | undefined,
  syncedAt: number,
): Promise<boolean> => {
  const shareCode = shareCodeOf(after);
  if (!after || !shareCode) return false;
  if (
    before &&
    shareCodeOf(before) === shareCode &&
    previewSignature(before) === previewSignature(after)
  ) {
    return false;
  }
  const shareCodeRef = db.collection("shareCodes").doc(shareCode);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(shareCodeRef);
    const data = snapshot.data();
    if (!snapshot.exists || data?.taskListId !== taskListId) return false;
    const previous: unknown = isRecord(data.preview) ? data.preview.syncedAt : undefined;
    if (typeof previous === "number" && previous > syncedAt) return false;
    transaction.update(shareCodeRef, {
      preview: {
        name: typeof after.name === "string" ? after.name : "",
        background: typeof after.background === "string" ? after.background : null,
        tasks: previewTasks(after),
        syncedAt,
      },
    });
    return true;
  });
};
