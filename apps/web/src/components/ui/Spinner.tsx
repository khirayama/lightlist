import clsx from "clsx";
import { AppIcon } from "./AppIcon";

type SpinnerProps = {
  className?: string;
  fullPage?: boolean;
};

export function Spinner({ className, fullPage }: SpinnerProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={clsx("flex items-center justify-center", className)}
    >
      <AppIcon
        name="logo"
        className="h-12 w-12 animate-pulse text-gray-900 dark:text-gray-50"
      />
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
        {content}
      </div>
    );
  }

  return content;
}
