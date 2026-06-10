import "@/styles/globals.css";
import lpLocales from "./lp-locales.json";

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

const RTL_LANGUAGES = ["ar"] as const;

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

function getLanguageDirection(value: string | null | undefined): "ltr" | "rtl" {
  const language = normalizeLanguage(value);
  return RTL_LANGUAGES.includes(language as (typeof RTL_LANGUAGES)[number])
    ? "rtl"
    : "ltr";
}

const OG_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  ja: "ja_JP",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  fr: "fr_FR",
  ko: "ko_KR",
  "zh-CN": "zh_CN",
  hi: "hi_IN",
  ar: "ar_AR",
  "pt-BR": "pt_BR",
  id: "id_ID",
};

const setHeadValue = (
  selector: string,
  attribute: "content" | "href",
  value: string,
) => {
  const element = document.querySelector(selector);
  if (
    element instanceof HTMLMetaElement ||
    element instanceof HTMLLinkElement
  ) {
    element.setAttribute(attribute, value);
  }
};

const translations = lpLocales as Record<Language, Record<string, string>>;

const t = (language: Language, key: string): string =>
  translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;

const detectLanguage = (): Language => {
  const queryLang = new URLSearchParams(window.location.search).get("lang");
  if (queryLang) return normalizeLanguage(queryLang);
  const storedLang = window.localStorage.getItem("i18nextLng");
  if (storedLang) return normalizeLanguage(storedLang);
  return normalizeLanguage(navigator.languages?.[0] ?? navigator.language);
};

const applyTranslations = (language: Language) => {
  document.documentElement.lang = language;
  document.documentElement.dir = getLanguageDirection(language);

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key) element.textContent = t(language, key);
  });
  document
    .querySelectorAll<HTMLImageElement>("[data-i18n-alt]")
    .forEach((element) => {
      const key = element.dataset.i18nAlt;
      if (key) element.alt = t(language, key);
    });

  const origin = window.location.origin;
  const pageUrl =
    language === "ja" ? `${origin}/` : `${origin}/?lang=${language}`;
  const pageTitle = t(language, "pages.index.seo.title");
  const pageDescription = t(language, "pages.index.seo.description");

  document.title = pageTitle;
  setHeadValue('meta[name="description"]', "content", pageDescription);
  setHeadValue(
    'meta[name="keywords"]',
    "content",
    t(language, "pages.index.seo.keywords"),
  );
  setHeadValue('link[rel="canonical"]', "href", pageUrl);
  setHeadValue('meta[property="og:title"]', "content", pageTitle);
  setHeadValue('meta[property="og:description"]', "content", pageDescription);
  setHeadValue('meta[property="og:url"]', "content", pageUrl);
  setHeadValue(
    'meta[property="og:locale"]',
    "content",
    OG_LOCALE_BY_LANGUAGE[language],
  );
  setHeadValue(
    'meta[property="og:image:alt"]',
    "content",
    t(language, "pages.index.preview.desktopAlt"),
  );
  setHeadValue('meta[name="twitter:title"]', "content", pageTitle);
  setHeadValue('meta[name="twitter:description"]', "content", pageDescription);
};

const language = detectLanguage();
window.localStorage.setItem("i18nextLng", language);
applyTranslations(language);

const languageSelect = document.getElementById("lp-language");
if (languageSelect instanceof HTMLSelectElement) {
  languageSelect.value = language;
  languageSelect.addEventListener("change", () => {
    const nextLanguage = normalizeLanguage(languageSelect.value);
    window.localStorage.setItem("i18nextLng", nextLanguage);
    const url = new URL(window.location.href);
    if (nextLanguage === "ja") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", nextLanguage);
    }
    window.history.replaceState(window.history.state, "", url.toString());
    languageSelect.value = nextLanguage;
    applyTranslations(nextLanguage);
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
