import "i18next";
import type { Resource } from "i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/utils/language";
import ja from "@/locales/ja.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import ko from "@/locales/ko.json";
import zhCN from "@/locales/zh-CN.json";
import hi from "@/locales/hi.json";
import ar from "@/locales/ar.json";
import ptBR from "@/locales/pt-BR.json";
import id from "@/locales/id.json";

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  ko: { translation: ko },
  "zh-CN": { translation: zhCN },
  hi: { translation: hi },
  ar: { translation: ar },
  "pt-BR": { translation: ptBR },
  id: { translation: id },
} satisfies Resource;

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    defaultNS: "translation",
    ns: ["translation"],
    resources,
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      lookupQuerystring: "lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof resources)["ja"];
  }
}
