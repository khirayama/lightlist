import { ComponentPropsWithoutRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { useSessionState, useUser } from "@lightlist/sdk/session";
import { useTaskListIndexState } from "@lightlist/sdk/taskLists";
import {
  createTaskList,
  updateTaskListOrder,
  fetchTaskListIdByShareCode,
  addSharedTaskListToOrder,
} from "@lightlist/sdk/mutations/app";
import clsx from "clsx";
import { resolveErrorMessage } from "@lightlist/sdk/utils/errors";
import { getLanguageDirection } from "@lightlist/sdk/utils/language";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";
import type { CarouselProps } from "@/components/ui/Carousel";
import type { DrawerPanelProps } from "@/components/app/DrawerPanel";
import type { TaskListCardProps } from "@/components/app/TaskListCard";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";
import {
  logTaskListCreate,
  logShareCodeJoin,
  logTaskListReorder,
} from "@lightlist/sdk/analytics";

const AUTH_TIMEOUT_MS = 10_000;

const resolveTaskListBackground = (background: string | null): string =>
  background ?? "var(--tasklist-theme-bg)";

type DrawerPanelContent = ComponentPropsWithoutRef<
  typeof DrawerContent
>["children"];

const Carousel = dynamic<CarouselProps>(
  () => import("@/components/ui/Carousel").then((module) => module.Carousel),
  {
    loading: () => <div className="h-full w-full" />,
  },
);

const DrawerPanel = dynamic<DrawerPanelProps>(
  () =>
    import("@/components/app/DrawerPanel").then((module) => module.DrawerPanel),
  {
    loading: () => <div className="min-h-20 w-full" />,
  },
);

const TaskListCard = dynamic<TaskListCardProps>(
  () =>
    import("@/components/app/TaskListCard").then(
      (module) => module.TaskListCard,
    ),
  {
    loading: () => <div className="h-full w-full" />,
  },
);

type AppHeaderProps = {
  isWideLayout: boolean;
  isRtl: boolean;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerPanel: DrawerPanelContent;
  openMenuLabel: string;
};

function AppHeader({
  isWideLayout,
  isRtl,
  isDrawerOpen,
  onDrawerOpenChange,
  drawerPanel,
  openMenuLabel,
}: AppHeaderProps) {
  return (
    <header
      className={clsx(
        "flex flex-wrap items-center py-1.5 px-1",
        isWideLayout ? "justify-start" : "justify-between",
      )}
    >
      {!isWideLayout && (
        <Drawer
          direction={isRtl ? "right" : "left"}
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label={openMenuLabel}
              title={openMenuLabel}
              className="inline-flex items-center justify-center rounded p-3 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark"
            >
              <AppIcon
                className="h-6 w-6"
                name="menu"
                aria-hidden="true"
                focusable="false"
              />
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

export default function AppPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { authStatus } = useSessionState();
  const user = useUser();
  const {
    hasStartupError,
    taskListOrderStatus,
    taskLists: stateTaskLists,
  } = useTaskListIndexState();

  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    stateTaskLists,
    updateTaskListOrder,
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isTaskSorting, setIsTaskSorting] = useState(false);

  const sensorsList = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "loading") {
      return;
    }

    const timerId = window.setTimeout(() => {
      router.replace("/");
    }, AUTH_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [authStatus, router]);

  useEffect(() => {
    if (taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [selectedTaskListId, taskLists]);

  useEffect(() => {
    const updateLayout = () => {
      setIsWideLayout(window.innerWidth >= 1024);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    if (isWideLayout) {
      setIsDrawerOpen(false);
    }
  }, [isWideLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isWideLayout) return;
    if (!isDrawerOpen) return;

    const drawerStateKey = "drawer-open";
    const currentState = window.history.state;
    const hasDrawerState = currentState?.drawer === drawerStateKey;

    if (!hasDrawerState) {
      window.history.pushState({ ...currentState, drawer: drawerStateKey }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.drawer === drawerStateKey) return;
      setIsDrawerOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDrawerOpen, isWideLayout]);

  const isAuthLoading = authStatus === "loading";
  const isTaskListsHydrating = taskListOrderStatus === "loading";
  const hasTaskLists = taskLists.length > 0;
  const userEmail = user?.email || t("app.drawerNoEmail");
  const selectedTaskListIndex = Math.max(
    0,
    taskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );
  const carouselDirection = getLanguageDirection(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const isRtl = carouselDirection === "rtl";

  const handleReorderTaskList = async (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => {
    setError(null);
    try {
      await reorderTaskList(draggedTaskListId, targetTaskListId);
      logTaskListReorder();
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleCreateList = async (
    name: string,
    background: string | null,
  ): Promise<string> => {
    setError(null);
    const newTaskListId = await createTaskList(name, background);
    setSelectedTaskListId(newTaskListId);
    logTaskListCreate();
    return newTaskListId;
  };

  const handleJoinList = async (code: string): Promise<void> => {
    setError(null);
    try {
      const normalizedCode = code.trim().toUpperCase();
      const taskListId = await fetchTaskListIdByShareCode(normalizedCode);
      if (!taskListId) {
        throw new Error(t("pages.sharecode.notFound"));
      }

      if (stateTaskLists.some((tl) => tl.id === taskListId)) {
        setSelectedTaskListId(taskListId);
        return;
      }

      await addSharedTaskListToOrder(taskListId);
      setSelectedTaskListId(taskListId);
      logShareCodeJoin();
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleCloseDrawer = () => {
    const drawerStateKey = "drawer-open";
    const currentState = window.history.state;
    if (currentState?.drawer === drawerStateKey) {
      window.history.back();
    } else {
      setIsDrawerOpen(false);
    }
  };

  const handleDeleted = () => {
    const remainingLists = stateTaskLists.filter(
      (tl) => tl.id !== selectedTaskListId,
    );
    if (remainingLists.length > 0) {
      setSelectedTaskListId(remainingLists[0].id);
    } else {
      setSelectedTaskListId(null);
    }
  };

  const drawerPanel: DrawerPanelContent = (
    <DrawerPanel
      isWideLayout={isWideLayout}
      userEmail={userEmail}
      hasTaskLists={!isTaskListsHydrating && hasTaskLists}
      taskLists={taskLists}
      sensorsList={sensorsList}
      onReorderTaskList={handleReorderTaskList}
      selectedTaskListId={selectedTaskListId}
      onSelectTaskList={(taskListId) => setSelectedTaskListId(taskListId)}
      onCloseDrawer={handleCloseDrawer}
      onOpenSettings={() => {
        setIsDrawerOpen(false);
        const currentState = window.history.state;
        if (currentState?.drawer === "drawer-open") {
          window.history.replaceState({ ...currentState, drawer: null }, "");
        }
        router.push("/settings");
      }}
      onCreateList={handleCreateList}
      onJoinList={handleJoinList}
    />
  );

  if (isAuthLoading) {
    return <Spinner fullPage />;
  }

  if (authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  return (
    <div className="h-full min-h-full w-full text-text dark:text-text-dark overflow-hidden">
      <div
        className={clsx(
          "flex h-full",
          isWideLayout
            ? isRtl
              ? "flex-row-reverse items-start"
              : "flex-row items-start"
            : "flex-col",
        )}
      >
        {isWideLayout && (
          <aside
            className={clsx(
              "sticky top-0 w-[360px] max-w-[420px] shrink-0 self-stretch border-border",
              isRtl ? "border-l" : "border-r",
            )}
          >
            <div className="flex h-full flex-col overflow-y-auto bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
              {drawerPanel}
            </div>
          </aside>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col w-full h-full min-h-0"
        >
          {!isWideLayout && (
            <div className="absolute z-20 w-full">
              <AppHeader
                isWideLayout={isWideLayout}
                isRtl={isRtl}
                isDrawerOpen={isDrawerOpen}
                onDrawerOpenChange={(open) => {
                  if (open) {
                    setIsDrawerOpen(true);
                  } else if (isDrawerOpen) {
                    handleCloseDrawer();
                  }
                }}
                drawerPanel={drawerPanel}
                openMenuLabel={t("app.openMenu")}
              />
              {error && (
                <div className="px-1">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}
            </div>
          )}

          <div className="h-full overflow-hidden">
            {hasStartupError ? (
              <div className="flex h-full items-center justify-center p-4">
                <Alert variant="error">{t("app.error")}</Alert>
              </div>
            ) : isTaskListsHydrating ? (
              <div className="flex h-full items-center justify-center p-4">
                <Spinner />
              </div>
            ) : hasTaskLists ? (
              <Carousel
                className="h-full"
                index={selectedTaskListIndex}
                direction={carouselDirection}
                scrollEnabled={!isTaskSorting}
                onIndexChange={(index) => {
                  const taskList = taskLists[index];
                  if (taskList) {
                    setSelectedTaskListId(taskList.id);
                  }
                }}
                showIndicators={true}
                indicatorPosition="top"
                ariaLabel={t("app.taskListLocator.label")}
                getIndicatorLabel={(index, total) =>
                  t("app.taskListLocator.goTo", {
                    index: index + 1,
                    total,
                  })
                }
              >
                {taskLists.map((taskList) => {
                  const isActive = selectedTaskListId === taskList.id;
                  return (
                    <div
                      key={taskList.id}
                      className={clsx("h-full w-full flex flex-col")}
                      style={{
                        backgroundColor: resolveTaskListBackground(
                          taskList.background,
                        ),
                      }}
                    >
                      <div className="h-[88px]" />
                      <div
                        className={clsx(
                          "h-full overflow-y-auto",
                          isWideLayout && "mx-auto max-w-3xl min-w-[480px]",
                        )}
                      >
                        <TaskListCard
                          taskList={taskList}
                          isActive={isActive}
                          onActivate={(taskListId) =>
                            setSelectedTaskListId(taskListId)
                          }
                          sensorsList={sensorsList}
                          onSortingChange={setIsTaskSorting}
                          onDeleted={handleDeleted}
                        />
                      </div>
                    </div>
                  );
                })}
              </Carousel>
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-muted dark:text-muted-dark">
                  {t("app.emptyState")}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
