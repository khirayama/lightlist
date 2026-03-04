import type { Language } from "../types";
import { normalizeLanguage } from "./language";

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

const normalizeDigits = (value: string): string => {
  return value.replace(/[٠-٩۰-۹०-९]/g, (char) => DIGIT_MAP[char] ?? char);
};

const getNextWeekdayOffset = (
  targetDay: number,
  currentDay: number,
): number => {
  const diff = targetDay - currentDay;
  if (diff >= 0) return diff;
  return diff + 7;
};

type Pattern = {
  regex: RegExp;
  getOffset?: (match: RegExpMatchArray) => number | null;
  getDate?: (match: RegExpMatchArray) => Date | null;
};

const NUMERIC_PATTERNS: Pattern[] = [
  {
    regex: new RegExp(
      String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${SPACE_OR_END}`,
    ),
    getDate: (match) => {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
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
      const m = parseInt(match[1], 10) - 1;
      const d = parseInt(match[2], 10);
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

const RELATIVE_PATTERNS: Record<Language, Pattern[]> = {
  ja: [
    { regex: new RegExp(String.raw`^今日${SPACE_OR_END}`), getOffset: () => 0 },
    { regex: new RegExp(String.raw`^明日${SPACE_OR_END}`), getOffset: () => 1 },
    {
      regex: new RegExp(String.raw`^明後日${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)日後(?:に)?${SPACE_OR_END}`),
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s+days?\s+later${SPACE_OR_END}`, "i"),
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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
      getOffset: (match) => parseInt(match[1], 10),
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

function resolveDateFromPattern(
  source: string,
  patterns: Pattern[],
): { targetDate: Date; matchedLength: number } | null {
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
}

export function parseDateFromText(
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
