import "./src/global.css"
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Main from "./src/components/Main";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "Welcome to Nativewind": "Welcome to Nativewind",
        }
      },
      ja: {
        translation: {
          "Welcome to Nativewind": "Nativewindへようこそ",
        }
      }
    },
    lng: "ja",
    fallbackLng: "ja",
    interpolation: {
      escapeValue: false
    }
  });
 
export default function App() {
  return <Main />;
}
