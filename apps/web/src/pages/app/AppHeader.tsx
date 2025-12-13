import type { ReactNode } from "react";
import clsx from "clsx";

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";

type AppHeaderProps = {
  isWideLayout: boolean;
  openMenuLabel: string;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerPanel: ReactNode;
};

export function AppHeader({
  isWideLayout,
  openMenuLabel,
  isDrawerOpen,
  onDrawerOpenChange,
  drawerPanel,
}: AppHeaderProps) {
  return (
    <header
      className={clsx(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/60",
        isWideLayout ? "justify-start" : "justify-between",
      )}
    >
      {!isWideLayout && (
        <Drawer
          direction="left"
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              title={openMenuLabel}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white p-2 text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
              <span className="sr-only">{openMenuLabel}</span>
            </button>
          </DrawerTrigger>
          <DrawerContent
            aria-labelledby="drawer-task-lists-title"
            aria-describedby="drawer-task-lists-description"
          >
            {drawerPanel}
          </DrawerContent>
        </Drawer>
      )}
    </header>
  );
}

export default AppHeader;
