import clsx from "clsx";
import { useTranslation } from "react-i18next";

type SpinnerProps = {
  label?: string;
  className?: string;
};

export function Spinner({ label, className }: SpinnerProps) {
  const { t } = useTranslation();
  const text = label ?? t("common.loading");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={clsx(
        "inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200",
        className,
      )}
    >
      {text}
    </div>
  );
}
