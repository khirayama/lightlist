import clsx from "clsx";
import { BrandLogo } from "./BrandLogo";

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
      <div className="animate-pulse">
        <BrandLogo alt="" aria-hidden="true" className="h-14 w-auto" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background dark:bg-background-dark">
        {content}
      </div>
    );
  }

  return content;
}
