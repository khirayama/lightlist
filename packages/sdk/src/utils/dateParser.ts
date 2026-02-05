export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }
  return null;
}

const JA_WEEKDAYS: Record<string, number> = {
  日: 0,
  月: 1,
  火: 2,
  水: 3,
  木: 4,
  金: 5,
  土: 6,
};

const EN_WEEKDAYS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function getNextWeekdayOffset(targetDay: number, currentDay: number): number {
  const diff = targetDay - currentDay;
  if (diff >= 0) return diff;
  return diff + 7;
}

type Pattern = {
  regex: RegExp;
  getOffset?: (match: RegExpMatchArray) => number | null;
  getDate?: (match: RegExpMatchArray) => Date | null;
};

const PATTERNS: Pattern[] = [
  // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  {
    regex: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[\s\u3000]/,
    getDate: (match) => {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      const date = new Date(y, m, d);
      // 日付の妥当性チェック
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
  // MM/DD, MM-DD, MM.DD (年補完: 過去なら来年)
  {
    regex: /^(\d{1,2})[-/.](\d{1,2})[\s\u3000]/,
    getDate: (match) => {
      const m = parseInt(match[1], 10) - 1;
      const d = parseInt(match[2], 10);
      const now = new Date();
      const currentYear = now.getFullYear();

      // まず今年のその日付
      const date = new Date(currentYear, m, d);

      // 日付の妥当性チェック (例: 2/30 -> 3/2 になるのを防ぐ)
      if (date.getMonth() !== m || date.getDate() !== d) {
        return null;
      }

      // 今日の日付 (時刻0:0:0)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 過去の日付なら来年にする
      if (date < today) {
        date.setFullYear(currentYear + 1);
      }

      return date;
    },
  },

  // 日本語 固定
  { regex: /^今日[\s\u3000]/, getOffset: () => 0 },
  { regex: /^明日[\s\u3000]/, getOffset: () => 1 },
  { regex: /^明後日[\s\u3000]/, getOffset: () => 2 },
  // 日本語 X日後
  {
    regex: /^(\d+)日後[\s\u3000]/,
    getOffset: (match) => parseInt(match[1], 10),
  },
  // 日本語 曜日 (月曜, 月, etc)
  {
    regex: /^([月火水木金土日])曜?[\s\u3000]/,
    getOffset: (match) => {
      const dayChar = match[1];
      const target = JA_WEEKDAYS[dayChar];
      if (target === undefined) return null;
      return getNextWeekdayOffset(target, new Date().getDay());
    },
  },

  // 英語 固定
  { regex: /^today\s/i, getOffset: () => 0 },
  { regex: /^tomorrow\s/i, getOffset: () => 1 },
  { regex: /^day after tomorrow\s/i, getOffset: () => 2 },
  // 英語 in X days
  {
    regex: /^in (\d+) days\s/i,
    getOffset: (match) => parseInt(match[1], 10),
  },
  // 英語 X days later (一応入れておく)
  {
    regex: /^(\d+) days later\s/i,
    getOffset: (match) => parseInt(match[1], 10),
  },
  // 英語 曜日
  {
    regex: /^(mon|tue|wed|thu|fri|sat|sun)(?:day)?\s/i,
    getOffset: (match) => {
      const dayStr = match[1].toLowerCase();
      const target = EN_WEEKDAYS[dayStr];
      if (target === undefined) return null;
      return getNextWeekdayOffset(target, new Date().getDay());
    },
  },
];

export function parseDateFromText(text: string): {
  date: string | null;
  text: string;
} {
  for (const pattern of PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      let targetDate: Date | null = null;

      if (pattern.getDate) {
        targetDate = pattern.getDate(match);
      } else if (pattern.getOffset) {
        const offset = pattern.getOffset(match);
        if (offset !== null) {
          targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + offset);
        }
      }

      if (targetDate) {
        // マッチした部分（キーワード + スペース）を除去
        const remainingText = text.substring(match[0].length);

        return {
          date: formatDate(targetDate),
          text: remainingText,
        };
      }
    }
  }

  return { date: null, text };
}
