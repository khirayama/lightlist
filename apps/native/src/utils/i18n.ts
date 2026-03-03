import "i18next";
import type { Resource } from "i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import ja from "../locales/ja.json";

const resources = {
  ja: { translation: ja },
  en: { translation: en },
} satisfies Resource;

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    fallbackLng: "ja",
    defaultNS: "translation",
    ns: ["translation"],
    resources,
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18next;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof resources)["ja"];
  }
}
