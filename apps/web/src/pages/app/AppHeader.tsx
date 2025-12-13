import type { ReactNode } from "react";
import clsx from "clsx";

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";

type AppHeaderProps = {
  isWideLayout: boolean;
  title: string;
  openMenuLabel: string;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerPanel: ReactNode;
};

export function AppHeader({
  isWideLayout,
  title,
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
      <h1 className="m-0 text-xl font-semibold sm:text-2xl">{title}</h1>
      {!isWideLayout && (
        <Drawer
          direction="left"
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500"
            >
              {openMenuLabel}
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
