import "i18next";
import type { Resource } from "i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ja from "@/locales/ja.json";
import en from "@/locales/en.json";

const resources = {
  ja: { translation: ja },
  en: { translation: en },
} satisfies Resource;

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "ja",
    defaultNS: "translation",
    ns: ["translation"],
    resources,
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
