import type { ReactNode } from "react";
import clsx from "clsx";

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";

type AppHeaderProps = {
  isWideLayout: boolean;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerPanel: ReactNode;
};

export function AppHeader({
  isWideLayout,
  isDrawerOpen,
  onDrawerOpenChange,
  drawerPanel,
}: AppHeaderProps) {
  return (
    <header
      className={clsx(
        "flex flex-wrap items-center gap-3 bg-white py-2 px-3 dark:bg-gray-900",
        isWideLayout ? "justify-start" : "justify-between",
      )}
    >
      {!isWideLayout && (
        <Drawer
          direction="left"
          handleOnly
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded bg-white p-2 text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
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
