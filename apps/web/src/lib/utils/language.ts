import { Language } from "../types";

export const DEFAULT_LANGUAGE: Language = "ja";

export const SUPPORTED_LANGUAGES = [
  "ja",
  "en",
  "es",
  "de",
  "fr",
  "ko",
  "zh-CN",
  "hi",
  "ar",
  "pt-BR",
  "id",
] as const satisfies readonly Language[];

export const RTL_LANGUAGES = ["ar"] as const;

export const LANGUAGE_DISPLAY_NAMES: Record<Language, string> = {
  ja: "日本語",
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  ko: "한국어",
  "zh-CN": "简体中文",
  hi: "हिन्दी",
  ar: "العربية",
  "pt-BR": "Português (Brasil)",
  id: "Bahasa Indonesia",
};

const SUPPORTED_LANGUAGE_SET = new Set<Language>(SUPPORTED_LANGUAGES);

export function normalizeLanguage(value: string | null | undefined): Language {
  if (!value) return DEFAULT_LANGUAGE;
  if (SUPPORTED_LANGUAGE_SET.has(value as Language)) {
    return value as Language;
  }

  const lower = value.toLowerCase();

  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("ko")) return "ko";
  if (
    lower === "zh" ||
    lower.startsWith("zh-cn") ||
    lower.startsWith("zh-hans") ||
    lower.startsWith("zh-sg")
  ) {
    return "zh-CN";
  }
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("ar")) return "ar";
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
  if (lower === "id" || lower === "in" || lower.startsWith("id-")) return "id";

  return DEFAULT_LANGUAGE;
}

export function getLanguageDirection(
  value: string | null | undefined,
): "ltr" | "rtl" {
  const language = normalizeLanguage(value);
  return RTL_LANGUAGES.includes(language as (typeof RTL_LANGUAGES)[number])
    ? "rtl"
    : "ltr";
}

export function isSupportedLanguage(
  value: string | null | undefined,
): value is Language {
  if (!value) return false;
  return SUPPORTED_LANGUAGE_SET.has(value as Language);
}
