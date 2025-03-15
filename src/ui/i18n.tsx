import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

const I18nContext = createContext(null);

export const initI18n = (options: {}) => {
  i18n.use(initReactI18next).init(options);
};

export const I18nProvider = (props: { children: ReactNode }) => {
  const tr = useTranslation();
  const [lng, setLng] = useState(tr.i18n.resolvedLanguage);

  useEffect(() => {
    tr.i18n.on("languageChanged", (l) => {
      setLng(l);
    });
  }, []);

  return (
    <I18nContext.Provider
      value={{
        t: tr.t,
        lng,
        supportedLanguages: Object.keys(tr.i18n?.options?.resources || {}).map(
          (lang) => lang.toUpperCase(),
        ),
        changeLanguage: (l) => {
          setLng(l);
          tr.i18n.changeLanguage(l);
        },
      }}
    >
      {props.children}
    </I18nContext.Provider>
  );
};

export const useCustomTranslation = (prefix: string) => {
  const ctx = useContext(I18nContext);

  return {
    t: (key: string | string[], params?: any) =>
      ctx.t(`${prefix}.${key}`, params) as string,
    lng: ctx.lng,
    changeLanguage: ctx.changeLanguage,
    supportedLanguages: ctx.supportedLanguages,
  };
};
