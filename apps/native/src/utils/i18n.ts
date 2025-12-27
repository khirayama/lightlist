import i18n from "i18next";
import type { Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import ja from "../locales/ja.json";

const resources = {
  ja: { translation: ja },
  en: { translation: en },
} satisfies Resource;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "ja",
    fallbackLng: "ja",
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
