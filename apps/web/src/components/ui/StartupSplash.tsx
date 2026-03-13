import { BrandLogo } from "./BrandLogo";

const STARTUP_SPLASH_LABEL = "読み込み中";

export function StartupSplash() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background dark:bg-background-dark">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={STARTUP_SPLASH_LABEL}
        className="flex items-center justify-center"
      >
        <div className="animate-pulse">
          <BrandLogo
            alt=""
            aria-hidden="true"
            className="h-16 w-auto sm:h-20"
          />
        </div>
      </div>
    </div>
  );
}
