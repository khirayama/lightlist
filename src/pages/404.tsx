import { useCustomTranslation } from "ui/i18n";

export default function NotFound() {
  const { t } = useCustomTranslation("pages.NotFound");

  return (
    <div>
      <a href="/">Go to Home</a>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}
