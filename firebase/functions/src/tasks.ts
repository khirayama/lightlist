import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

export type RecordValue = Record<string, unknown>;

export const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  order: number;
  pinned: boolean;
};

export type TaskSettings = {
  autoSort: boolean;
  taskInsertPosition: "top" | "bottom";
};

const MEMBER_KEY_PREFIX = "lightlist-member:";

export const memberKeyOf = (uid: string): string =>
  createHash("sha256").update(`${MEMBER_KEY_PREFIX}${uid}`).digest("hex");

export const isValidDateKey = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
};

export const isCompleteTask = (taskId: string, value: unknown): value is Task =>
  isRecord(value) &&
  value.id === taskId &&
  typeof value.text === "string" &&
  typeof value.completed === "boolean" &&
  typeof value.date === "string" &&
  typeof value.order === "number" &&
  Number.isFinite(value.order) &&
  typeof value.pinned === "boolean";

export const hasTaskContent = (task: Pick<Task, "date" | "pinned" | "text">): boolean =>
  task.text.trim().length > 0 || Boolean(task.date) || task.pinned;

export const readTasks = (data: unknown): Task[] => {
  const tasks = isRecord(data) && isRecord(data.tasks) ? data.tasks : {};
  return Object.entries(tasks).flatMap(([taskId, task]) => {
    if (!isCompleteTask(taskId, task)) return [];
    const date = task.date && isValidDateKey(task.date) ? task.date : "";
    return [{ ...task, date }];
  });
};

export const resolveTaskSettings = (data: unknown): TaskSettings => {
  const settings = isRecord(data) ? data : {};
  const taskInsertPosition = settings.taskInsertPosition ?? "top";
  const autoSort = settings.autoSort ?? true;
  if (
    (taskInsertPosition !== "top" && taskInsertPosition !== "bottom") ||
    typeof autoSort !== "boolean"
  ) {
    throw new Error("Settings data is malformed");
  }
  return { autoSort, taskInsertPosition };
};

const compareStringIds = (left: string, right: string): number => {
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

const getTaskDisplayGroup = (task: Pick<Task, "completed" | "pinned">): number => {
  if (task.completed) return 2;
  return task.pinned ? 0 : 1;
};

export const getOrderedTasks = (tasks: Task[], displayOrder = false): Task[] =>
  tasks.filter(hasTaskContent).sort((a, b) => {
    const groupDifference = displayOrder ? getTaskDisplayGroup(a) - getTaskDisplayGroup(b) : 0;
    return groupDifference || a.order - b.order || compareStringIds(a.id, b.id);
  });

const renumberTasks = (tasks: Task[]): Task[] =>
  tasks.map((task, index) => ({ ...task, order: index + 1 }));

const getAutoSortedTasks = (tasks: Task[]): Task[] => {
  const getDateKey = (task: Task): string => task.date || "9999-12-31";
  return renumberTasks(
    [...tasks].sort((a, b) => {
      const aGroup = getTaskDisplayGroup(a);
      const bGroup = getTaskDisplayGroup(b);
      if (aGroup !== bGroup) return aGroup - bGroup;
      const aDate = getDateKey(a);
      const bDate = getDateKey(b);
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return a.order - b.order || compareStringIds(a.id, b.id);
    }),
  );
};

export const getSortedTasks = (tasks: Task[], settings: TaskSettings): Task[] =>
  settings.autoSort ? getAutoSortedTasks(tasks) : renumberTasks(tasks);

const canReorderTasks = (
  first: Pick<Task, "completed" | "date" | "pinned">,
  second: Pick<Task, "completed" | "date" | "pinned">,
  autoSort: boolean,
): boolean => {
  if (!autoSort) return true;
  return getTaskDisplayGroup(first) === getTaskDisplayGroup(second) && first.date === second.date;
};

export const reorderTasksByIds = (
  tasks: Task[],
  orderedTaskIds: string[],
  autoSort: boolean,
): Task[] | null => {
  if (tasks.length !== orderedTaskIds.length || new Set(orderedTaskIds).size !== tasks.length) {
    return null;
  }
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const nextTasks: Task[] = [];
  for (const taskId of orderedTaskIds) {
    const task = tasksById.get(taskId);
    if (!task) return null;
    nextTasks.push(task);
  }
  if (nextTasks.some((task, index) => !canReorderTasks(task, tasks[index], autoSort))) {
    return null;
  }
  return renumberTasks(nextTasks);
};

export const buildTaskUpdateData = (previousTasks: Task[], tasks: Task[]): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  const previousById = new Map(previousTasks.map((task) => [task.id, task]));
  const nextTaskIds = new Set(tasks.map((task) => task.id));
  for (const task of previousTasks) {
    if (!nextTaskIds.has(task.id)) updates[`tasks.${task.id}`] = FieldValue.delete();
  }
  for (const task of tasks) {
    const previous = previousById.get(task.id);
    if (!previous) {
      updates[`tasks.${task.id}`] = task;
      continue;
    }
    if (previous.text !== task.text) updates[`tasks.${task.id}.text`] = task.text;
    if (previous.completed !== task.completed) {
      updates[`tasks.${task.id}.completed`] = task.completed;
    }
    if (previous.date !== task.date) updates[`tasks.${task.id}.date`] = task.date;
    if (previous.order !== task.order) updates[`tasks.${task.id}.order`] = task.order;
    if (previous.pinned !== task.pinned) updates[`tasks.${task.id}.pinned`] = task.pinned;
  }
  return updates;
};
