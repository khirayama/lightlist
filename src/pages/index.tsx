import i18n from "i18next";

import { useCustomTranslation } from "ui/i18n";

export default function IndexPage({ lang }) {
  i18n.changeLanguage(lang);

  const { t } = useCustomTranslation("pages.index");

  return (
    <div className="bg-primary">
      <header className="mx-auto max-w-2xl py-4 text-right">
        <a
          href="/?lang=en"
          className="rounded-sm px-4 py-2 focus-visible:bg-gray-200"
        >
          English
        </a>
        <a
          href="/?lang=ja"
          className="rounded-sm px-4 py-2 focus-visible:bg-gray-200"
        >
          日本語
        </a>
      </header>
      <div className="pb-8">
        <div className="pt-24 pb-4 text-center">
          <img
            src="/logo.svg"
            alt="Lightlist"
            className="m-auto w-[80px] py-4"
          />
          <h1 className="p-4 text-center">Lightlist</h1>
        </div>
        <div className="p-4 text-center">
          <a
            href={`/login?lang=${lang}`}
            className="rounded-full border px-4 py-2 focus-visible:bg-gray-200"
          >
            {t("Get started")}
          </a>
        </div>
        <div className="m-auto max-w-lg p-8 text-justify">
          <p className="my-4">
            {t("Lightlist is a simple task list service.")}
          </p>
          <p>
            {t(
              "It can be used as a ToDo list for task management or a shopping list. You can share lists with people who are not registered.",
            )}
          </p>
        </div>
      </div>

      <div className="bg-gray-100 pt-8">
        <div className="relative mx-auto aspect-video max-w-3xl overflow-hidden">
          <img
            className="absolute bottom-[-100px] left-[32px] w-[80%] min-w-[320px] shadow-2xl"
            src={`/screenshot_${lang}_desktop.png`}
          />
          <img
            className="absolute right-[32px] bottom-[-60px] w-[24%] min-w-[105px] rotate-6 shadow-2xl"
            src={`/screenshot_${lang}_mobile.png`}
          />
        </div>
      </div>

      <footer className="p-12 text-center">
        <div className="p-4 text-center">
          <a
            href={`/login?lang=${lang}`}
            className="rounded-full border px-4 py-2 focus-visible:bg-gray-200"
          >
            {t("Get started")}
          </a>
        </div>
      </footer>
    </div>
  );
}

export const getServerSideProps = async ({ query }) => {
  let lang = query.lang?.toUpperCase() || "JA";
  const supportedLngs = Object.keys(i18n.options.resources).map((l) =>
    l.toUpperCase(),
  );
  if (!supportedLngs.includes(lang)) {
    lang = i18n.resolvedLanguage.toUpperCase();
  }

  return {
    props: { lang: lang.toLowerCase() },
  };
};
