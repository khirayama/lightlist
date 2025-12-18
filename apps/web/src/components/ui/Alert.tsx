import { ReactNode } from "react";
import clsx from "clsx";

type AlertVariant = "info" | "error" | "success" | "warning";

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100",
};

export function Alert({ children, variant = "info", className }: AlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-xl border px-3 py-2 text-sm",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
