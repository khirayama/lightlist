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

const fallbackLng = "ja";

type Translation = {
  [key: string]: string | Translation;
};

export const I18nProvider = (props: {
  lang?: string;
  children: ReactNode;
  resources: {
    [lang: string]: {
      translation: Translation;
    };
  };
}) => {
  const tr = useTranslation();
  const [lng, setLng] = useState(props.lang || fallbackLng);

  useEffect(() => {
    i18n.use(initReactI18next).init({
      resources: props.resources,
      lng: fallbackLng,
      fallbackLng,
      interpolation: {
        escapeValue: false,
      },
    });
  }, []);

  useEffect(() => {
    const l = props.lang.toLowerCase();
    setLng(l);
    tr.i18n.changeLanguage(l);
  }, [props.lang]);

  return (
    <I18nContext.Provider
      value={{
        t: tr.t,
        lng,
        supportedLanguages: Object.keys(tr.i18n.options.resources).map((lang) =>
          lang.toUpperCase(),
        ),
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
    supportedLanguages: ctx.supportedLanguages,
  };
};
