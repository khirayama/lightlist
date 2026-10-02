import "@/styles/base.css";
import "@/styles/lp-styles.css";

type Language =
  | "ja"
  | "en"
  | "es"
  | "de"
  | "fr"
  | "ko"
  | "zh-CN"
  | "hi"
  | "ar"
  | "pt-BR"
  | "id";

const DEFAULT_LANGUAGE: Language = "ja";

const SUPPORTED_LANGUAGES = [
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

const SUPPORTED_LANGUAGE_SET = new Set<Language>(SUPPORTED_LANGUAGES);

function normalizeLanguage(value: string | null | undefined): Language {
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
  if (lower === "zh" || lower.startsWith("zh-")) {
    return "zh-CN";
  }
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("ar")) return "ar";
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
  if (lower === "id" || lower === "in" || lower.startsWith("id-")) return "id";

  return DEFAULT_LANGUAGE;
}

const LANGUAGE_PATHS: Record<Language, string> = {
  ja: "/",
  en: "/en/",
  es: "/es/",
  de: "/de/",
  fr: "/fr/",
  ko: "/ko/",
  "zh-CN": "/zh-cn/",
  hi: "/hi/",
  ar: "/ar/",
  "pt-BR": "/pt-br/",
  id: "/id/",
};

const pageLanguage = normalizeLanguage(document.documentElement.lang);
const queryLanguage = new URLSearchParams(window.location.search).get("lang");
const storedLanguage = window.localStorage.getItem("i18nextLng");
const preferredLanguage = queryLanguage
  ? normalizeLanguage(queryLanguage)
  : pageLanguage === DEFAULT_LANGUAGE && storedLanguage
    ? normalizeLanguage(storedLanguage)
    : pageLanguage;

if (preferredLanguage !== pageLanguage) {
  window.location.replace(LANGUAGE_PATHS[preferredLanguage]);
} else if (queryLanguage) {
  window.history.replaceState(
    window.history.state,
    "",
    LANGUAGE_PATHS[pageLanguage],
  );
}

const languageSelect = document.getElementById("lp-language");
if (languageSelect instanceof HTMLSelectElement) {
  languageSelect.value = pageLanguage;
  languageSelect.addEventListener("change", () => {
    const nextLanguage = normalizeLanguage(languageSelect.value);
    window.localStorage.setItem("i18nextLng", nextLanguage);
    window.location.assign(LANGUAGE_PATHS[nextLanguage]);
  });
}

const isSecureOrLocalhost =
  window.location.protocol === "https:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
if (isSecureOrLocalhost && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => registration.update())
    .catch(() => {});
}
