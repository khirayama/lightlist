import { useCustomTranslation } from "ui/i18n";

export default function NotFound() {
  const { t } = useCustomTranslation("pages.404");

  return (
    <div>
      <a href="/">{t("Go to Home")}</a>
      <h1>404 - {t("Page Not Found")}</h1>
      <p>{t("The page you are looking for ddoes not exist.")}</p>
    </div>
  );
}
