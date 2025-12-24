import { ComponentPropsWithoutRef, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { appStore } from "@lightlist/sdk/store";
import { AppState, TaskList } from "@lightlist/sdk/types";
import {
  createTaskList,
  updateTaskListOrder,
  updateTaskList,
  deleteTaskList,
  generateShareCode,
  removeShareCode,
} from "@lightlist/sdk/mutations/app";
import clsx from "clsx";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/Carousel";
import { DrawerPanel } from "./DrawerPanel";
import { TaskListCard } from "./TaskListCard";

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type OptimisticOrder = {
  ids: string[];
  startedAt: number;
};

type DrawerPanelContent = ComponentPropsWithoutRef<
  typeof DrawerContent
>["children"];

type AppHeaderProps = {
  isWideLayout: boolean;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerPanel: DrawerPanelContent;
  openMenuLabel: string;
};

function AppHeader({
  isWideLayout,
  isDrawerOpen,
  onDrawerOpenChange,
  drawerPanel,
  openMenuLabel,
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
              aria-label={openMenuLabel}
              title={openMenuLabel}
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
  const { t } = useTranslation();
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#6C5CE7",
    "#A29BFE",
    "#74B9FF",
    "#81ECEC",
    "#55EFC4",
    "#FD79A8",
    "#FDCB6E",
    "#FFFFFF",
  ];

  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );

  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editListName, setEditListName] = useState("");
  const [editListBackground, setEditListBackground] = useState(colors[0]);
  const [showEditListDialog, setShowEditListDialog] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [generatingShareCode, setGeneratingShareCode] = useState(false);
  const [removingShareCode, setRemovingShareCode] = useState(false);
  const [shareCopySuccess, setShareCopySuccess] = useState(false);
  const [createListInput, setCreateListInput] = useState("");
  const [createListBackground, setCreateListBackground] = useState(colors[0]);
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [taskListCarouselApi, setTaskListCarouselApi] =
    useState<CarouselApi | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isTaskSorting, setIsTaskSorting] = useState(false);
  const [optimisticTaskListOrder, setOptimisticTaskListOrder] =
    useState<OptimisticOrder | null>(null);

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

  const selectedTaskList = state?.taskLists?.find(
    (tl) => tl.id === selectedTaskListId,
  );

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChange((user) => {
      if (!user) {
        router.push("/");
      }
    });

    const unsubscribeStore = appStore.subscribe((newState) => {
      setState(newState);
    });

    setState(appStore.getState());

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, [router]);

  useEffect(() => {
    if (state?.taskLists && state.taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(state.taskLists[0].id);
    }
  }, [state?.taskLists, selectedTaskListId]);

  useEffect(() => {
    if (!optimisticTaskListOrder) return;
    if (!state?.taskListOrderUpdatedAt) return;
    if (state.taskListOrderUpdatedAt >= optimisticTaskListOrder.startedAt) {
      setOptimisticTaskListOrder(null);
    }
  }, [optimisticTaskListOrder, state?.taskListOrderUpdatedAt]);

  useEffect(() => {
    if (selectedTaskList) {
      setEditListName(selectedTaskList.name);
      setEditListBackground(selectedTaskList.background);
      setShareCode(selectedTaskList.shareCode || null);
    }
  }, [selectedTaskList]);

  useEffect(() => {
    if (!taskListCarouselApi || !state?.taskLists) return;

    const handleSelect = () => {
      const index = taskListCarouselApi.selectedScrollSnap();
      const taskList = state.taskLists[index];
      if (taskList) {
        setSelectedTaskListId((prev) =>
          prev === taskList.id ? prev : taskList.id,
        );
      }
    };

    taskListCarouselApi.on("select", handleSelect);
    handleSelect();

    return () => {
      taskListCarouselApi.off("select", handleSelect);
    };
  }, [state?.taskLists, taskListCarouselApi]);

  useEffect(() => {
    if (!taskListCarouselApi || !state?.taskLists) return;
    const index = state.taskLists.findIndex(
      (taskList) => taskList.id === selectedTaskListId,
    );
    if (index >= 0) {
      taskListCarouselApi.scrollTo(index);
    }
  }, [selectedTaskListId, state?.taskLists, taskListCarouselApi]);

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
    if (isWideLayout || !isDrawerOpen) {
      router.beforePopState(() => true);
      return;
    }

    router.beforePopState(() => {
      setIsDrawerOpen(false);
      return false;
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [isDrawerOpen, isWideLayout, router]);

  const isLoading = !state || !state.user;
  const hasTaskLists = Boolean(state?.taskLists?.length);
  const userEmail = state?.user?.email || t("app.drawerNoEmail");
  const taskLists = state?.taskLists ?? [];
  const taskListsForDrawer = optimisticTaskListOrder
    ? optimisticTaskListOrder.ids
        .map((taskListId) =>
          taskLists.find((taskList) => taskList.id === taskListId),
        )
        .filter((taskList): taskList is TaskList => Boolean(taskList))
    : taskLists;
  const selectedTaskListIndex = Math.max(
    0,
    taskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );
  const showTaskListLocator = hasTaskLists && taskLists.length > 1;

  const handleDragEndTaskList = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;
    const draggedTaskListId = getStringId(active.id);
    const targetTaskListId = getStringId(over.id);
    if (!draggedTaskListId || !targetTaskListId) return;

    const currentIds = taskListsForDrawer.map((taskList) => taskList.id);
    const oldIndex = currentIds.indexOf(draggedTaskListId);
    const newIndex = currentIds.indexOf(targetTaskListId);
    if (oldIndex === -1 || newIndex === -1) return;

    setOptimisticTaskListOrder({
      ids: arrayMove(currentIds, oldIndex, newIndex),
      startedAt: Date.now(),
    });

    setError(null);
    try {
      await updateTaskListOrder(draggedTaskListId, targetTaskListId);
    } catch (err) {
      setOptimisticTaskListOrder(null);
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleCreateList = async () => {
    if (!createListInput.trim()) return;

    setError(null);

    try {
      await createTaskList(createListInput.trim(), createListBackground);
      setCreateListInput("");
      setCreateListBackground(colors[0]);
      setShowCreateListDialog(false);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "app.error"));
    }
  };

  const handleSaveListDetails = async () => {
    if (!selectedTaskListId || !selectedTaskList) return;

    const trimmedName = editListName.trim();
    const updates: { name?: string; background?: string } = {};

    if (trimmedName && trimmedName !== selectedTaskList.name) {
      updates.name = trimmedName;
    }

    if (
      editListBackground &&
      editListBackground !== selectedTaskList.background
    ) {
      updates.background = editListBackground;
    }

    if (!updates.name && !updates.background) {
      setShowEditListDialog(false);
      return;
    }

    setError(null);
    try {
      await updateTaskList(selectedTaskListId, updates);
      setShowEditListDialog(false);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDeleteList = async () => {
    if (!selectedTaskListId) return;

    setDeletingList(true);
    setError(null);

    try {
      await deleteTaskList(selectedTaskListId);

      const remainingLists = state?.taskLists?.filter(
        (tl) => tl.id !== selectedTaskListId,
      );
      if (remainingLists && remainingLists.length > 0) {
        setSelectedTaskListId(remainingLists[0].id);
      } else {
        setSelectedTaskListId(null);
      }
      setShowEditListDialog(false);
      setDeletingList(false);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
      setDeletingList(false);
    }
  };

  const handleGenerateShareCode = async () => {
    if (!selectedTaskListId) return;

    setGeneratingShareCode(true);
    setError(null);

    try {
      const code = await generateShareCode(selectedTaskListId);
      setShareCode(code);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    } finally {
      setGeneratingShareCode(false);
    }
  };

  const handleRemoveShareCode = async () => {
    if (!selectedTaskListId) return;

    setRemovingShareCode(true);
    setError(null);

    try {
      await removeShareCode(selectedTaskListId);
      setShareCode(null);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    } finally {
      setRemovingShareCode(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareCode) return;

    const shareUrl = `${window.location.origin}/sharecodes/${shareCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopySuccess(true);
      setTimeout(() => setShareCopySuccess(false), 2000);
    } catch (err) {
      setError(t("common.error"));
    }
  };

  const handleEditDialogOpenChange = (taskList: TaskList, open: boolean) => {
    setSelectedTaskListId(taskList.id);
    setShowEditListDialog(open);
    if (open) {
      setEditListName(taskList.name);
      setEditListBackground(taskList.background);
    }
  };

  const handleShareDialogOpenChange = (taskList: TaskList, open: boolean) => {
    setSelectedTaskListId(taskList.id);
    setShowShareDialog(open);
    if (open) {
      setShareCode(taskList.shareCode || null);
      setShareCopySuccess(false);
    }
  };

  const drawerPanel: DrawerPanelContent = (
    <DrawerPanel
      isWideLayout={isWideLayout}
      userEmail={userEmail}
      showCreateListDialog={showCreateListDialog}
      onCreateListDialogChange={setShowCreateListDialog}
      createListInput={createListInput}
      onCreateListInputChange={setCreateListInput}
      createListBackground={createListBackground}
      onCreateListBackgroundChange={setCreateListBackground}
      colors={colors}
      onCreateList={handleCreateList}
      hasTaskLists={hasTaskLists}
      taskLists={taskListsForDrawer}
      sensorsList={sensorsList}
      onDragEndTaskList={handleDragEndTaskList}
      selectedTaskListId={selectedTaskListId}
      onSelectTaskList={(taskListId) => setSelectedTaskListId(taskListId)}
      onCloseDrawer={() => setIsDrawerOpen(false)}
      onOpenSettings={() => {
        setIsDrawerOpen(false);
        router.push("/settings");
      }}
      t={t}
    />
  );

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="h-full min-h-full w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50 overflow-hidden">
      <div
        className={clsx(
          "flex h-full",
          isWideLayout ? "flex-row items-start" : "flex-col",
        )}
      >
        {isWideLayout && (
          <aside className="sticky top-0 w-[360px] max-w-[420px] shrink-0 self-stretch border-l border-gray-200">
            <div className="flex h-full flex-col overflow-y-auto bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              {drawerPanel}
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col w-full h-full min-h-0">
          {!isWideLayout && (
            <div className="sticky top-0 z-20 w-full">
              <AppHeader
                isWideLayout={isWideLayout}
                isDrawerOpen={isDrawerOpen}
                onDrawerOpenChange={setIsDrawerOpen}
                drawerPanel={drawerPanel}
                openMenuLabel={t("app.openMenu")}
              />
              {error && <Alert variant="error">{error}</Alert>}
            </div>
          )}

          <div className="flex-1 flex flex-col relative overflow-hidden">
            {showTaskListLocator && (
              <nav
                aria-label={t("app.taskListLocator.label")}
                className="flex justify-center absolute top-0 z-20 center-x-0 w-full"
              >
                <ul className="flex items-center gap-1">
                  {taskLists.map((taskList, index) => {
                    const isSelected = index === selectedTaskListIndex;
                    return (
                      <li key={taskList.id}>
                        <button
                          type="button"
                          aria-label={t("app.taskListLocator.goTo", {
                            index: index + 1,
                            total: taskLists.length,
                          })}
                          aria-current={isSelected ? "page" : undefined}
                          onClick={() => setSelectedTaskListId(taskList.id)}
                          className={clsx(
                            "inline-flex h-4 w-4 items-center justify-center rounded-full",
                            "transition-colors",
                            "hover:bg-gray-200/60 dark:hover:bg-gray-800/60",
                          )}
                        >
                          <span
                            className={clsx(
                              "h-2 w-2 rounded-full transition-colors",
                              isSelected
                                ? "bg-gray-900 dark:bg-gray-50"
                                : "bg-gray-300 dark:bg-gray-700",
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

            <div className="h-full overflow-y-scroll">
              {hasTaskLists ? (
                <Carousel
                  className="h-full"
                  wheelGestures={!isTaskSorting}
                  setApi={setTaskListCarouselApi}
                  opts={{
                    align: "start",
                    containScroll: "trimSnaps",
                  }}
                >
                  <CarouselContent>
                    {taskLists.map((taskList) => {
                      const isActive = selectedTaskListId === taskList.id;
                      return (
                        <CarouselItem key={taskList.id}>
                          <div
                            className="h-4"
                            style={{ background: taskList.background }}
                          />

                          <TaskListCard
                            taskList={taskList}
                            taskInsertPosition={
                              state?.settings?.taskInsertPosition ?? "bottom"
                            }
                            isActive={isActive}
                            onActivate={(taskListId) =>
                              setSelectedTaskListId(taskListId)
                            }
                            colors={colors}
                            showEditListDialog={showEditListDialog}
                            onEditDialogOpenChange={handleEditDialogOpenChange}
                            editListName={editListName}
                            onEditListNameChange={setEditListName}
                            editListBackground={editListBackground}
                            onEditListBackgroundChange={setEditListBackground}
                            onSaveListDetails={handleSaveListDetails}
                            deletingList={deletingList}
                            onDeleteList={handleDeleteList}
                            showShareDialog={showShareDialog}
                            onShareDialogOpenChange={
                              handleShareDialogOpenChange
                            }
                            shareCode={shareCode}
                            shareCopySuccess={shareCopySuccess}
                            generatingShareCode={generatingShareCode}
                            onGenerateShareCode={handleGenerateShareCode}
                            removingShareCode={removingShareCode}
                            onRemoveShareCode={handleRemoveShareCode}
                            onCopyShareLink={handleCopyShareLink}
                            sensorsList={sensorsList}
                            onSortingChange={setIsTaskSorting}
                            t={t}
                          />
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("app.emptyState")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
