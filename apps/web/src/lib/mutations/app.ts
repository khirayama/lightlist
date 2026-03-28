import {
  doc,
  updateDoc,
  setDoc,
  deleteField,
  collection,
  writeBatch,
  runTransaction,
  getDoc,
} from "firebase/firestore";

import { getAuthInstance, getDbInstance } from "../firebase";
import {
  Language,
  Settings,
  Task,
  TaskListOrderStore,
  TaskListStore,
  TaskListStoreTask,
} from "../types";
import { getCurrentSettings } from "../settings";
import {
  getCurrentTaskListOrderStore,
  getCurrentTaskListStoreData,
  normalizeTaskListStore,
} from "../taskLists";
import { DEFAULT_LANGUAGE, normalizeLanguage } from "../utils/language";

type ResolvedTaskSettings = {
  autoSort: boolean;
  language: ReturnType<typeof normalizeLanguage>;
  taskInsertPosition: "bottom" | "top";
};

const TASK_LIST_ORDER_METADATA_KEYS = new Set(["createdAt", "updatedAt"]);
const SPACE_OR_END = String.raw`(?:[\s\u3000]|$)`;
const DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

type DatePattern = {
  regex: RegExp;
  getOffset?: (match: RegExpMatchArray) => number | null;
  getDate?: (match: RegExpMatchArray) => Date | null;
};

const normalizeDigits = (value: string): string => {
  return value.replace(/[٠-٩۰-۹०-९]/g, (char) => DIGIT_MAP[char] ?? char);
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getNextWeekdayOffset = (
  targetDay: number,
  currentDay: number,
): number => {
  const diff = targetDay - currentDay;
  if (diff >= 0) return diff;
  return diff + 7;
};

const NUMERIC_PATTERNS: DatePattern[] = [
  {
    regex: new RegExp(
      String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${SPACE_OR_END}`,
    ),
    getDate: (match) => {
      const y = Number.parseInt(match[1], 10);
      const m = Number.parseInt(match[2], 10) - 1;
      const d = Number.parseInt(match[3], 10);
      const date = new Date(y, m, d);
      if (
        date.getFullYear() !== y ||
        date.getMonth() !== m ||
        date.getDate() !== d
      ) {
        return null;
      }
      return date;
    },
  },
  {
    regex: new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})${SPACE_OR_END}`),
    getDate: (match) => {
      const m = Number.parseInt(match[1], 10) - 1;
      const d = Number.parseInt(match[2], 10);
      const now = new Date();
      const currentYear = now.getFullYear();
      const date = new Date(currentYear, m, d);
      if (date.getMonth() !== m || date.getDate() !== d) {
        return null;
      }
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (date < today) {
        date.setFullYear(currentYear + 1);
      }
      return date;
    },
  },
];

const RELATIVE_PATTERNS: Record<Language, DatePattern[]> = {
  ja: [
    { regex: new RegExp(String.raw`^今日${SPACE_OR_END}`), getOffset: () => 0 },
    { regex: new RegExp(String.raw`^明日${SPACE_OR_END}`), getOffset: () => 1 },
    {
      regex: new RegExp(String.raw`^明後日${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)日後(?:に)?${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(String.raw`^([月火水木金土日])曜?${SPACE_OR_END}`),
      getOffset: (match) => {
        const map: Record<string, number> = {
          日: 0,
          月: 1,
          火: 2,
          水: 3,
          木: 4,
          金: 5,
          土: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  en: [
    {
      regex: new RegExp(String.raw`^today${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^tomorrow${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^day after tomorrow${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^in\s+(\d+)\s+days?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s+days?\s+later${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(mon|tue|wed|thu|fri|sat|sun)(?:day)?${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          sun: 0,
          mon: 1,
          tue: 2,
          wed: 3,
          thu: 4,
          fri: 5,
          sat: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  es: [
    {
      regex: new RegExp(String.raw`^hoy${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^mañana${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^pasado\s+mañana${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(
        String.raw`^(?:en|dentro\s+de)\s+(\d+)\s+d[ií]as?${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo|lun|mar|mi[eé]|jue|vie|s[áa]b|dom)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          domingo: 0,
          dom: 0,
          lunes: 1,
          lun: 1,
          martes: 2,
          mar: 2,
          miércoles: 3,
          miercoles: 3,
          mié: 3,
          mie: 3,
          jueves: 4,
          jue: 4,
          viernes: 5,
          vie: 5,
          sábado: 6,
          sabado: 6,
          sáb: 6,
          sab: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  de: [
    {
      regex: new RegExp(String.raw`^heute${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^morgen${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^übermorgen${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^in\s+(\d+)\s+tagen?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          sonntag: 0,
          so: 0,
          montag: 1,
          mo: 1,
          dienstag: 2,
          di: 2,
          mittwoch: 3,
          mi: 3,
          donnerstag: 4,
          do: 4,
          freitag: 5,
          fr: 5,
          samstag: 6,
          sa: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  fr: [
    {
      regex: new RegExp(String.raw`^aujourd(?:'|’)hui${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^demain${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^apr[eè]s[- ]demain${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^dans\s+(\d+)\s+jours?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          dimanche: 0,
          dim: 0,
          lundi: 1,
          lun: 1,
          mardi: 2,
          mar: 2,
          mercredi: 3,
          mer: 3,
          jeudi: 4,
          jeu: 4,
          vendredi: 5,
          ven: 5,
          samedi: 6,
          sam: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  ko: [
    { regex: new RegExp(String.raw`^오늘${SPACE_OR_END}`), getOffset: () => 0 },
    { regex: new RegExp(String.raw`^내일${SPACE_OR_END}`), getOffset: () => 1 },
    { regex: new RegExp(String.raw`^모레${SPACE_OR_END}`), getOffset: () => 2 },
    {
      regex: new RegExp(String.raw`^(\d+)\s*일\s*후${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(월요일|화요일|수요일|목요일|금요일|토요일|일요일|월|화|수|목|금|토|일)${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          일요일: 0,
          일: 0,
          월요일: 1,
          월: 1,
          화요일: 2,
          화: 2,
          수요일: 3,
          수: 3,
          목요일: 4,
          목: 4,
          금요일: 5,
          금: 5,
          토요일: 6,
          토: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  "zh-CN": [
    { regex: new RegExp(String.raw`^今天${SPACE_OR_END}`), getOffset: () => 0 },
    { regex: new RegExp(String.raw`^明天${SPACE_OR_END}`), getOffset: () => 1 },
    { regex: new RegExp(String.raw`^后天${SPACE_OR_END}`), getOffset: () => 2 },
    {
      regex: new RegExp(String.raw`^(\d+)\s*天后${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(星期[一二三四五六日天]|周[一二三四五六日天])${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          星期日: 0,
          星期天: 0,
          周日: 0,
          周天: 0,
          星期一: 1,
          周一: 1,
          星期二: 2,
          周二: 2,
          星期三: 3,
          周三: 3,
          星期四: 4,
          周四: 4,
          星期五: 5,
          周五: 5,
          星期六: 6,
          周六: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  hi: [
    { regex: new RegExp(String.raw`^आज${SPACE_OR_END}`), getOffset: () => 0 },
    { regex: new RegExp(String.raw`^कल${SPACE_OR_END}`), getOffset: () => 1 },
    {
      regex: new RegExp(String.raw`^परसों${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s*दिन\s*बाद${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          रविवार: 0,
          सोमवार: 1,
          मंगलवार: 2,
          बुधवार: 3,
          गुरुवार: 4,
          शुक्रवार: 5,
          शनिवार: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  ar: [
    {
      regex: new RegExp(String.raw`^اليوم${SPACE_OR_END}`),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^غد(?:ا|ًا)?${SPACE_OR_END}`),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^بعد\s+غد${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^بعد\s+(\d+)\s+أيام?${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(الاثنين|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          الأحد: 0,
          الاثنين: 1,
          الإثنين: 1,
          الثلاثاء: 2,
          الأربعاء: 3,
          الخميس: 4,
          الجمعة: 5,
          السبت: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  "pt-BR": [
    {
      regex: new RegExp(String.raw`^hoje${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^amanh[ãa]${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(
        String.raw`^depois\s+de\s+amanh[ãa]${SPACE_OR_END}`,
        "i",
      ),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^em\s+(\d+)\s+dias?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          domingo: 0,
          dom: 0,
          segunda: 1,
          "segunda-feira": 1,
          seg: 1,
          terça: 2,
          terca: 2,
          "terça-feira": 2,
          "terca-feira": 2,
          ter: 2,
          quarta: 3,
          "quarta-feira": 3,
          qua: 3,
          quinta: 4,
          "quinta-feira": 4,
          qui: 4,
          sexta: 5,
          "sexta-feira": 5,
          sex: 5,
          sábado: 6,
          sabado: 6,
          sáb: 6,
          sab: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  id: [
    {
      regex: new RegExp(String.raw`^hari\s+ini${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^besok${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^lusa${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^dalam\s+(\d+)\s+hari${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          minggu: 0,
          senin: 1,
          selasa: 2,
          rabu: 3,
          kamis: 4,
          jumat: 5,
          "jum'at": 5,
          sabtu: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
};

const resolveDateFromPattern = (
  source: string,
  patterns: DatePattern[],
): { targetDate: Date; matchedLength: number } | null => {
  for (const pattern of patterns) {
    const match = source.match(pattern.regex);
    if (!match) continue;

    if (pattern.getDate) {
      const date = pattern.getDate(match);
      if (date) {
        return { targetDate: date, matchedLength: match[0].length };
      }
      continue;
    }

    if (pattern.getOffset) {
      const offset = pattern.getOffset(match);
      if (offset === null) continue;
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return { targetDate: date, matchedLength: match[0].length };
    }
  }
  return null;
};

function parseDateFromText(
  text: string,
  language: Language = "ja",
): {
  date: string | null;
  text: string;
} {
  const source = text.trimStart();
  if (!source) {
    return { date: null, text: source };
  }

  const normalized = normalizeDigits(source);
  const resolvedLanguage = normalizeLanguage(language);
  const numericParsed = resolveDateFromPattern(normalized, NUMERIC_PATTERNS);
  if (numericParsed) {
    return {
      date: formatDate(numericParsed.targetDate),
      text: source.substring(numericParsed.matchedLength).trimStart(),
    };
  }

  const languageParsed = resolveDateFromPattern(
    normalized,
    RELATIVE_PATTERNS[resolvedLanguage] ?? RELATIVE_PATTERNS.ja,
  );
  if (languageParsed) {
    return {
      date: formatDate(languageParsed.targetDate),
      text: source.substring(languageParsed.matchedLength).trimStart(),
    };
  }

  return { date: null, text };
}

function assertTaskListStore(data: unknown, id: string): TaskListStore {
  if (data == null) throw new Error(`TaskList not found: ${id}`);
  const d = data as Record<string, unknown>;
  if (
    typeof d.name !== "string" ||
    typeof d.tasks !== "object" ||
    d.tasks === null ||
    typeof d.memberCount !== "number"
  ) {
    throw new Error(`TaskList data is malformed: ${id}`);
  }
  return data as TaskListStore;
}

function assertTaskListOrderStore(
  data: unknown,
  uid: string,
): TaskListOrderStore {
  if (data == null) throw new Error(`TaskListOrder not found: ${uid}`);
  return data as TaskListOrderStore;
}

const getTaskListOrderEntries = (taskListOrder: TaskListOrderStore) => {
  return Object.entries(taskListOrder).filter(
    ([key]) => !TASK_LIST_ORDER_METADATA_KEYS.has(key),
  );
};

const getValidMemberCount = (taskList: TaskListStore): number => {
  if (!Number.isInteger(taskList.memberCount) || taskList.memberCount < 1) {
    throw new Error("Invalid member count");
  }
  return taskList.memberCount;
};

const normalizeShareCode = (shareCode: string): string => {
  return shareCode.trim().toUpperCase();
};

function getAutoSortedTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  const getDateValue = (task: TaskListStoreTask): number => {
    if (!task.date) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(task.date);
    if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
    return parsed;
  };

  return [...tasks]
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      const aDate = getDateValue(a);
      const bDate = getDateValue(b);
      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return a.order - b.order;
    })
    .map((task, index) => ({
      ...task,
      order: (index + 1) * 1.0,
    }));
}

async function getTaskListData(taskListId: string): Promise<TaskListStore> {
  const db = getDbInstance();
  const cached = getCurrentTaskListStoreData(taskListId);
  if (cached) return cached;

  const snapshot = await getDoc(doc(db, "taskLists", taskListId));
  if (!snapshot.exists()) throw new Error("Task list not found");
  return normalizeTaskListStore(
    assertTaskListStore(snapshot.data(), taskListId),
  );
}

function requireCurrentUserId(): string {
  const uid = getAuthInstance().currentUser?.uid;
  if (!uid) {
    throw new Error("No user logged in");
  }
  return uid;
}

function getResolvedTaskSettings(): ResolvedTaskSettings {
  const settings = getCurrentSettings();
  return {
    autoSort: Boolean(settings?.autoSort),
    language: normalizeLanguage(settings?.language ?? DEFAULT_LANGUAGE),
    taskInsertPosition:
      settings?.taskInsertPosition === "bottom" ? "bottom" : "top",
  };
}

function getOrderedTaskListOrders(taskListOrder: TaskListOrderStore): number[] {
  return getTaskListOrderEntries(taskListOrder).map(
    ([, value]) => (value as { order: number }).order,
  );
}

async function getTaskListOrderData(uid: string): Promise<TaskListOrderStore> {
  const db = getDbInstance();
  const cached = getCurrentTaskListOrderStore();
  if (cached) {
    return cached;
  }
  const snapshot = await getDoc(doc(db, "taskListOrder", uid));
  return assertTaskListOrderStore(snapshot.data(), uid);
}

function getSortedTasks(taskListData: TaskListStore): TaskListStoreTask[] {
  return Object.values(taskListData.tasks).sort((a, b) => a.order - b.order);
}

function renumberTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  return tasks.map((task, index) => ({
    ...task,
    order: (index + 1) * 1.0,
  }));
}

function buildTaskUpdateData(params: {
  deleteTaskIds?: string[];
  now: number;
  replaceTaskIds?: string[];
  tasks: TaskListStoreTask[];
}): Record<string, unknown> {
  const replaceTaskIds = new Set(params.replaceTaskIds ?? []);
  const updateData: Record<string, unknown> = { updatedAt: params.now };

  (params.deleteTaskIds ?? []).forEach((taskId) => {
    updateData[`tasks.${taskId}`] = deleteField();
  });

  params.tasks.forEach((task) => {
    if (replaceTaskIds.has(task.id)) {
      updateData[`tasks.${task.id}`] = task;
      return;
    }
    updateData[`tasks.${task.id}.order`] = task.order;
  });

  return updateData;
}

function buildHistory(history: string[], normalizedText: string): string[] {
  const nextHistory = history
    .map((item) => item.trim())
    .filter((item) => item !== "");
  const normalizedTextLower = normalizedText.toLowerCase();
  const existingIndex = nextHistory.findIndex(
    (item) => item.toLowerCase() === normalizedTextLower,
  );
  if (existingIndex >= 0) {
    nextHistory.splice(existingIndex, 1);
  }

  nextHistory.unshift(normalizedText);
  while (nextHistory.length > 300) {
    nextHistory.pop();
  }

  return nextHistory;
}

function normalizeTaskInput(text: string, date: string, language: Language) {
  const { date: parsedDate, text: parsedTextRaw } = parseDateFromText(
    text.trim(),
    language,
  );
  return {
    date: parsedDate || date,
    text: parsedTextRaw.trim(),
  };
}

export async function updateSettings(settings: Partial<Settings>) {
  const db = getDbInstance();
  const uid = requireCurrentUserId();

  const now = Date.now();
  await setDoc(
    doc(db, "settings", uid),
    {
      ...settings,
      updatedAt: now,
    },
    { merge: true },
  );
}

export async function updateTaskListOrder(
  draggedTaskListId: string,
  targetTaskListId: string,
) {
  const db = getDbInstance();
  const uid = requireCurrentUserId();
  if (draggedTaskListId === targetTaskListId) return;

  const currentTaskListOrder = await getTaskListOrderData(uid);

  const taskListOrders = Object.entries(currentTaskListOrder)
    .filter(([key]) => !TASK_LIST_ORDER_METADATA_KEYS.has(key))
    .map(([id, value]) => ({
      id,
      order: (value as { order: number }).order,
    }))
    .sort((a, b) => a.order - b.order);

  const draggedIndex = taskListOrders.findIndex(
    (item) => item.id === draggedTaskListId,
  );
  if (draggedIndex === -1) throw new Error("Task list not found");

  const targetIndexBeforeRemoval = taskListOrders.findIndex(
    (item) => item.id === targetTaskListId,
  );
  if (targetIndexBeforeRemoval === -1) throw new Error("Task list not found");
  const [dragged] = taskListOrders.splice(draggedIndex, 1);

  taskListOrders.splice(targetIndexBeforeRemoval, 0, dragged);

  const now = Date.now();

  const updateData: Record<string, unknown> = { updatedAt: now };
  taskListOrders.forEach((item, index) => {
    updateData[item.id] = { order: (index + 1) * 1.0 };
  });
  await updateDoc(doc(db, "taskListOrder", uid), updateData);
}

export async function createTaskList(
  name: string,
  background: string | null = null,
) {
  const db = getDbInstance();
  const uid = requireCurrentUserId();

  const taskListId = doc(collection(db, "taskLists")).id;
  const taskListOrders = getCurrentTaskListOrderStore()
    ? getOrderedTaskListOrders(getCurrentTaskListOrderStore()!)
    : [];

  let newOrder: number;
  if (taskListOrders.length === 0) {
    newOrder = 1.0;
  } else {
    const maxOrder = Math.max(...taskListOrders);
    newOrder = maxOrder + 1.0;
  }

  const now = Date.now();
  const newTaskList: TaskListStore = {
    id: taskListId,
    name,
    tasks: {},
    history: [],
    shareCode: null,
    background,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, "taskLists", taskListId), newTaskList);
  batch.update(doc(db, "taskListOrder", uid), {
    [taskListId]: { order: newOrder },
    updatedAt: now,
  });
  await batch.commit();

  return taskListId;
}

export async function updateTaskList(
  taskListId: string,
  updates: Partial<Pick<TaskListStore, "name" | "background">>,
) {
  const db = getDbInstance();
  const now = Date.now();
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: now,
  };
  await updateDoc(doc(db, "taskLists", taskListId), updateData);
}

export async function deleteTaskList(taskListId: string) {
  const db = getDbInstance();
  const uid = requireCurrentUserId();

  await runTransaction(db, async (transaction) => {
    const now = Date.now();
    const taskListOrderRef = doc(db, "taskListOrder", uid);
    const taskListOrderSnapshot = await transaction.get(taskListOrderRef);
    if (!taskListOrderSnapshot.exists()) {
      throw new Error("TaskListOrder not found");
    }

    const taskListOrderData = assertTaskListOrderStore(
      taskListOrderSnapshot.data(),
      uid,
    );
    if (!taskListOrderData[taskListId]) {
      throw new Error("Task list not found");
    }

    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListSnapshot = await transaction.get(taskListRef);

    transaction.update(taskListOrderRef, {
      [taskListId]: deleteField(),
      updatedAt: now,
    });

    if (!taskListSnapshot.exists()) {
      return;
    }

    const taskListData = assertTaskListStore(
      taskListSnapshot.data(),
      taskListId,
    );
    const currentMemberCount = getValidMemberCount(taskListData);
    const nextMemberCount = currentMemberCount - 1;

    if (nextMemberCount <= 0) {
      if (taskListData.shareCode) {
        transaction.delete(doc(db, "shareCodes", taskListData.shareCode));
      }
      transaction.delete(taskListRef);
      return;
    }

    transaction.update(taskListRef, {
      memberCount: nextMemberCount,
      updatedAt: now,
    });
  });
}

export function generateTaskId(): string {
  const db = getDbInstance();
  return doc(collection(db, "taskLists")).id;
}

export async function addTask(
  taskListId: string,
  text: string,
  date: string = "",
  id?: string,
) {
  const db = getDbInstance();
  const settings = getResolvedTaskSettings();
  const normalizedInput = normalizeTaskInput(text, date, settings.language);
  const normalizedText = normalizedInput.text;
  const finalDate = normalizedInput.date;

  if (normalizedText === "") throw new Error("Task text is empty");

  const taskId = id || generateTaskId();

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData) throw new Error("Task list not found");

  const tasks = getSortedTasks(taskListData);
  const insertIndex = settings.taskInsertPosition === "top" ? 0 : tasks.length;

  const now = Date.now();
  const newTask: TaskListStoreTask = {
    id: taskId,
    text: normalizedText,
    completed: false,
    date: finalDate,
    order: 0,
  };

  const reorderedTasks = [...tasks];
  reorderedTasks.splice(insertIndex, 0, newTask);
  const normalizedTasks = settings.autoSort
    ? getAutoSortedTasks(reorderedTasks)
    : renumberTasks(reorderedTasks);

  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData = buildTaskUpdateData({
    now,
    replaceTaskIds: [taskId],
    tasks: normalizedTasks,
  });
  updateData.history = buildHistory(taskListData.history || [], normalizedText);

  await updateDoc(taskListRef, updateData);

  return taskId;
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Task>,
) {
  const db = getDbInstance();
  const settings = getResolvedTaskSettings();
  const normalizedUpdates: Partial<Task> = { ...updates };
  if (normalizedUpdates.text) {
    const normalizedInput = normalizeTaskInput(
      normalizedUpdates.text,
      normalizedUpdates.date ?? "",
      settings.language,
    );
    if (normalizedInput.date) {
      normalizedUpdates.date = normalizedInput.date;
      normalizedUpdates.text = normalizedInput.text;
    }
  }

  if (normalizedUpdates.text !== undefined && normalizedUpdates.text === "") {
    throw new Error("Task text is empty");
  }

  const now = Date.now();
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!settings.autoSort) {
    const updateData: Record<string, unknown> = { updatedAt: now };
    Object.entries(normalizedUpdates).forEach(([key, value]) => {
      updateData[`tasks.${taskId}.${key}`] = value;
    });
    await updateDoc(taskListRef, updateData);
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const updatedTasks = Object.values(taskListData.tasks).map((task) =>
    task.id === taskId ? { ...task, ...normalizedUpdates } : task,
  );
  const normalizedTasks = getAutoSortedTasks(updatedTasks);

  const updateData = buildTaskUpdateData({
    now,
    replaceTaskIds: [taskId],
    tasks: normalizedTasks,
  });
  await updateDoc(taskListRef, updateData);
}

export async function deleteTask(taskListId: string, taskId: string) {
  const db = getDbInstance();
  const now = Date.now();
  const taskListRef = doc(db, "taskLists", taskListId);

  if (!getResolvedTaskSettings().autoSort) {
    const updateData = {
      [`tasks.${taskId}`]: deleteField(),
      updatedAt: now,
    };
    await updateDoc(taskListRef, updateData);
    return;
  }

  const taskListData = await getTaskListData(taskListId);
  if (!taskListData.tasks[taskId]) throw new Error("Task not found");

  const remainingTasks = Object.values(taskListData.tasks).filter(
    (task) => task.id !== taskId,
  );
  const normalizedTasks = getAutoSortedTasks(remainingTasks);

  const updateData = buildTaskUpdateData({
    deleteTaskIds: [taskId],
    now,
    tasks: normalizedTasks,
  });

  await updateDoc(taskListRef, updateData);
}

export async function updateTasksOrder(
  taskListId: string,
  draggedTaskId: string,
  targetTaskId: string,
) {
  const db = getDbInstance();
  const taskListData = await getTaskListData(taskListId);
  if (draggedTaskId === targetTaskId) return;

  const tasks = getSortedTasks(taskListData);
  const draggedIndex = tasks.findIndex((task) => task.id === draggedTaskId);
  if (draggedIndex === -1) throw new Error("Task not found");

  const targetIndexBeforeRemoval = tasks.findIndex(
    (task) => task.id === targetTaskId,
  );
  if (targetIndexBeforeRemoval === -1) throw new Error("Task not found");

  const [draggedTask] = tasks.splice(draggedIndex, 1);
  const insertionIndex = targetIndexBeforeRemoval;
  const previousTask = insertionIndex > 0 ? tasks[insertionIndex - 1] : null;
  const nextTask = insertionIndex < tasks.length ? tasks[insertionIndex] : null;

  let nextOrder = draggedTask.order;
  if (previousTask && nextTask) {
    nextOrder = (previousTask.order + nextTask.order) / 2;
  } else if (previousTask) {
    nextOrder = previousTask.order + 1;
  } else if (nextTask) {
    nextOrder = nextTask.order - 1;
  } else {
    nextOrder = 1;
  }

  const canUseSingleTaskUpdate =
    Number.isFinite(nextOrder) &&
    (!previousTask || nextOrder > previousTask.order) &&
    (!nextTask || nextOrder < nextTask.order);

  const now = Date.now();

  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData: Record<string, unknown> = { updatedAt: now };
  if (canUseSingleTaskUpdate) {
    updateData[`tasks.${draggedTask.id}.order`] = nextOrder;
  } else {
    tasks.splice(insertionIndex, 0, draggedTask);
    renumberTasks(tasks).forEach((task) => {
      updateData[`tasks.${task.id}.order`] = task.order;
    });
  }
  await updateDoc(taskListRef, updateData);
}

export async function sortTasks(taskListId: string): Promise<void> {
  const db = getDbInstance();
  const taskListData = await getTaskListData(taskListId);
  const tasks = getSortedTasks(taskListData);
  if (tasks.length < 2) return;

  const normalizedTasks = getAutoSortedTasks(tasks);
  const now = Date.now();

  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData = buildTaskUpdateData({
    now,
    tasks: normalizedTasks,
  });
  await updateDoc(taskListRef, updateData);
}

export async function deleteCompletedTasks(
  taskListId: string,
): Promise<number> {
  const db = getDbInstance();
  const autoSortEnabled = getResolvedTaskSettings().autoSort;

  const taskListData = await getTaskListData(taskListId);
  const tasks = getSortedTasks(taskListData);
  const completedTasks = tasks.filter((task) => task.completed);
  if (completedTasks.length === 0) return 0;

  const remainingTasks = tasks.filter((task) => !task.completed);
  const normalizedRemainingTasks = autoSortEnabled
    ? getAutoSortedTasks(remainingTasks)
    : renumberTasks(remainingTasks);

  const now = Date.now();
  const taskListRef = doc(db, "taskLists", taskListId);
  const updateData = buildTaskUpdateData({
    deleteTaskIds: completedTasks.map((task) => task.id),
    now,
    tasks: normalizedRemainingTasks,
  });

  await updateDoc(taskListRef, updateData);

  return completedTasks.length;
}

function generateRandomShareCode(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const MAX_SHARE_CODE_ATTEMPTS = 10;

export async function generateShareCode(taskListId: string): Promise<string> {
  const db = getDbInstance();
  if (!(await getTaskListData(taskListId))) {
    throw new Error("Task list not found");
  }

  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt++) {
    const shareCode = generateRandomShareCode();
    const reserved = await runTransaction(
      db,
      async (transaction): Promise<string | null> => {
        const shareCodeRef = doc(db, "shareCodes", shareCode);
        const shareCodeSnapshot = await transaction.get(shareCodeRef);
        if (shareCodeSnapshot.exists()) {
          return null;
        }

        const taskListRef = doc(db, "taskLists", taskListId);
        const taskListSnapshot = await transaction.get(taskListRef);
        if (!taskListSnapshot.exists()) {
          throw new Error("Task list not found");
        }
        const currentShareCode = assertTaskListStore(
          taskListSnapshot.data(),
          taskListId,
        ).shareCode;
        if (currentShareCode) {
          transaction.delete(doc(db, "shareCodes", currentShareCode));
        }

        const now = Date.now();
        transaction.set(shareCodeRef, { taskListId, createdAt: now });
        transaction.update(taskListRef, { shareCode, updatedAt: now });
        return shareCode;
      },
    );

    if (reserved) {
      return reserved;
    }
  }

  throw new Error("Failed to generate a unique share code. Please try again.");
}

export async function removeShareCode(taskListId: string): Promise<void> {
  const db = getDbInstance();
  if (!(await getTaskListData(taskListId))) {
    throw new Error("Task list not found");
  }

  const now = Date.now();
  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListSnapshot = await transaction.get(taskListRef);
    if (!taskListSnapshot.exists()) {
      throw new Error("Task list not found");
    }
    const currentShareCode = assertTaskListStore(
      taskListSnapshot.data(),
      taskListId,
    ).shareCode;
    if (currentShareCode) {
      transaction.delete(doc(db, "shareCodes", currentShareCode));
    }
    transaction.update(taskListRef, {
      shareCode: null,
      updatedAt: now,
    });
  });
}

export async function fetchTaskListIdByShareCode(
  shareCode: string,
): Promise<string | null> {
  const db = getDbInstance();
  const normalizedShareCode = normalizeShareCode(shareCode);
  if (!normalizedShareCode) {
    return null;
  }

  const shareCodeRef = doc(db, "shareCodes", normalizedShareCode);
  const shareCodeSnapshot = await getDoc(shareCodeRef);
  if (!shareCodeSnapshot.exists()) {
    return null;
  }

  const data = shareCodeSnapshot.data() as { taskListId?: string } | undefined;
  return data?.taskListId ?? null;
}

export async function fetchTaskListByShareCode(
  shareCode: string,
): Promise<TaskListStore | null> {
  const db = getDbInstance();
  const normalizedShareCode = normalizeShareCode(shareCode);
  if (!normalizedShareCode) {
    return null;
  }

  const shareCodeRef = doc(db, "shareCodes", normalizedShareCode);
  const shareCodeSnapshot = await getDoc(shareCodeRef);
  if (!shareCodeSnapshot.exists()) {
    return null;
  }

  const shareData = shareCodeSnapshot.data() as
    | { taskListId: string }
    | undefined;
  if (!shareData?.taskListId) return null;
  const { taskListId } = shareData;
  const taskListRef = doc(db, "taskLists", taskListId);
  const taskListSnapshot = await getDoc(taskListRef);
  if (!taskListSnapshot.exists()) {
    return null;
  }

  return assertTaskListStore(taskListSnapshot.data(), taskListId);
}

export async function addSharedTaskListToOrder(
  taskListId: string,
): Promise<void> {
  const db = getDbInstance();
  const uid = requireCurrentUserId();

  await runTransaction(db, async (transaction) => {
    const now = Date.now();
    const taskListOrderRef = doc(db, "taskListOrder", uid);
    const taskListOrderSnapshot = await transaction.get(taskListOrderRef);
    if (!taskListOrderSnapshot.exists()) {
      throw new Error("TaskListOrder not found");
    }

    const taskListOrderData = assertTaskListOrderStore(
      taskListOrderSnapshot.data(),
      uid,
    );
    if (taskListOrderData[taskListId]) {
      throw new Error("This task list is already in your order");
    }

    const taskListOrders = getOrderedTaskListOrders(taskListOrderData);

    const newOrder =
      taskListOrders.length === 0 ? 1.0 : Math.max(...taskListOrders) + 1.0;

    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListSnapshot = await transaction.get(taskListRef);
    if (!taskListSnapshot.exists()) {
      throw new Error("Task list not found");
    }
    const taskListData = assertTaskListStore(
      taskListSnapshot.data(),
      taskListId,
    );
    const currentMemberCount = getValidMemberCount(taskListData);

    transaction.update(taskListOrderRef, {
      [taskListId]: { order: newOrder },
      updatedAt: now,
    });
    transaction.update(taskListRef, {
      memberCount: currentMemberCount + 1,
      updatedAt: now,
    });
  });
}
