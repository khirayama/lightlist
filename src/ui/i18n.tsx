import { createContext, useContext, useState, ReactNode, useRef } from "react";

import i18n from "i18next";

const I18nContext = createContext(null);

export const init = (options) => i18n.init(options);

export const I18nProvider = (props: { children: ReactNode }) => {
  const [lng, setLng] = useState(i18n.resolvedLanguage);

  return (
    <I18nContext.Provider
      value={{
        t: i18n.t,
        lng,
        supportedLanguages: Object.keys(i18n.options.resources).map((l) =>
          l.toUpperCase(),
        ),
        changeLanguage: (l) => {
          if (l !== i18n.resolvedLanguage) {
            i18n.changeLanguage(l);
            setLng(i18n.resolvedLanguage);
          }
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
