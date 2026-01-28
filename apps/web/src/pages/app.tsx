import {
  ComponentPropsWithoutRef,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { appStore } from "@lightlist/sdk/store";
import type { TaskList } from "@lightlist/sdk/types";
import {
  createTaskList,
  updateTaskList,
  updateTaskListOrder,
  deleteTaskList,
  generateShareCode,
  removeShareCode,
  fetchTaskListIdByShareCode,
  addSharedTaskListToOrder,
} from "@lightlist/sdk/mutations/app";
import clsx from "clsx";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";
import { Carousel } from "@/components/ui/Carousel";
import { DrawerPanel } from "@/components/app/DrawerPanel";
import type { ColorOption } from "@/components/ui/ColorPicker";
import { TaskListCard } from "@/components/app/TaskListCard";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";

const resolveTaskListBackground = (background: string | null): string =>
  background ?? "var(--tasklist-theme-bg)";

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
        "flex flex-wrap items-center py-1.5 px-3",
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
              aria-label={openMenuLabel}
              title={openMenuLabel}
              className="inline-flex items-center justify-center rounded p-3 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:text-gray-50 dark:focus-visible:outline-gray-500"
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
  const renderStartTime = performance.now();
  const router = useRouter();

  useEffect(() => {
    const duration = performance.now() - renderStartTime;
    console.log(`[Web AppPage] Render duration: ${duration.toFixed(2)}ms`);
  });
  const { t } = useTranslation();
  const colors: ColorOption[] = [
    {
      value: null,
      label: t("taskList.backgroundNone"),
      shortLabel: t("taskList.backgroundNoneShort"),
      preview: "var(--tasklist-theme-bg)",
    },
    { value: "#F87171" }, // Coral
    { value: "#FBBF24" }, // Amber
    { value: "#34D399" }, // Emerald
    { value: "#38BDF8" }, // Sky
    { value: "#818CF8" }, // Indigo
    { value: "#A78BFA" }, // Violet
  ];

  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );

  const state = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
    appStore.getServerSnapshot,
  );
  const [error, setError] = useState<string | null>(null);

  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    state.taskLists,
    updateTaskListOrder,
  );

  const [editListName, setEditListName] = useState("");
  const [editListBackground, setEditListBackground] = useState<string | null>(
    null,
  );
  const [showEditListDialog, setShowEditListDialog] = useState(false);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [generatingShareCode, setGeneratingShareCode] = useState(false);
  const [removingShareCode, setRemovingShareCode] = useState(false);
  const [shareCopySuccess, setShareCopySuccess] = useState(false);
  const [createListInput, setCreateListInput] = useState("");
  const [createListBackground, setCreateListBackground] = useState(
    colors[0].value,
  );
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [showJoinListDialog, setShowJoinListDialog] = useState(false);
  const [joiningList, setJoiningList] = useState(false);
  const [joinListError, setJoinListError] = useState<string | null>(null);

  // Embla関連のstate削除
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

  const selectedTaskList = state?.taskLists?.find(
    (tl) => tl.id === selectedTaskListId,
  );

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChange((user) => {
      if (!user) {
        router.push("/");
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [router]);

  useEffect(() => {
    if (state?.taskLists && state.taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(state.taskLists[0].id);
    }
  }, [state?.taskLists, selectedTaskListId]);

  useEffect(() => {
    if (selectedTaskList) {
      setEditListName(selectedTaskList.name);
      setShareCode(selectedTaskList.shareCode || null);
    }
  }, [selectedTaskList]);

  // Embla関連のuseEffect削除

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

    const handlePopState = () => {
      setIsDrawerOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDrawerOpen, isWideLayout]);

  const isLoading =
    !state.user || !state.settings || state.taskListOrderUpdatedAt === null;
  const hasTaskLists = Boolean(state.user && taskLists.length > 0);
  const userEmail = state.user?.email || t("app.drawerNoEmail");
  const selectedTaskListIndex = Math.max(
    0,
    taskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );

  const handleReorderTaskList = async (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => {
    setError(null);
    try {
      await reorderTaskList(draggedTaskListId, targetTaskListId);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleCreateList = async () => {
    if (!createListInput.trim()) return;

    setError(null);

    try {
      const newTaskListId = await createTaskList(
        createListInput.trim(),
        createListBackground,
      );
      setCreateListInput("");
      setCreateListBackground(colors[0].value);
      setShowCreateListDialog(false);
      setSelectedTaskListId(newTaskListId);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "app.error"));
    }
  };

  const handleJoinList = async () => {
    if (!joinListInput.trim()) return;

    setJoiningList(true);
    setJoinListError(null);

    try {
      const taskListId = await fetchTaskListIdByShareCode(joinListInput.trim());
      if (!taskListId) {
        setJoinListError(t("pages.sharecode.notFound"));
        setJoiningList(false);
        return;
      }

      if (state?.taskLists.some((tl) => tl.id === taskListId)) {
        setSelectedTaskListId(taskListId);
        setShowJoinListDialog(false);
        setJoinListInput("");
        setJoiningList(false);
        return;
      }

      await addSharedTaskListToOrder(taskListId);

      setJoinListInput("");
      setShowJoinListDialog(false);
      setSelectedTaskListId(taskListId);
    } catch (err) {
      setJoinListError(resolveErrorMessage(err, t, "pages.sharecode.error"));
    } finally {
      setJoiningList(false);
    }
  };

  const handleSaveListDetails = async () => {
    if (!selectedTaskListId || !selectedTaskList) return;

    const trimmedName = editListName.trim();
    const updates: { name?: string; background?: string | null } = {};

    if (trimmedName && trimmedName !== selectedTaskList.name) {
      updates.name = trimmedName;
    }

    if (editListBackground !== selectedTaskList.background) {
      updates.background = editListBackground;
    }

    if (Object.keys(updates).length === 0) {
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
      setShowDeleteListConfirm(false);
      setDeletingList(false);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
      setDeletingList(false);
    }
  };

  const handleRequestDeleteList = () => {
    setShowDeleteListConfirm(true);
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

  const handleCloseDrawer = () => {
    const drawerStateKey = "drawer-open";
    const currentState = window.history.state;
    if (currentState?.drawer === drawerStateKey) {
      window.history.back();
    } else {
      setIsDrawerOpen(false);
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
      showJoinListDialog={showJoinListDialog}
      onJoinListDialogChange={(open) => {
        setShowJoinListDialog(open);
        if (!open) setJoinListError(null);
      }}
      joinListInput={joinListInput}
      onJoinListInputChange={setJoinListInput}
      onJoinList={handleJoinList}
      joinListError={joinListError}
      joiningList={joiningList}
      hasTaskLists={hasTaskLists}
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
      t={t}
    />
  );

  if (isLoading) {
    return <Spinner fullPage />;
  }

  return (
    <div className="h-full min-h-full w-full text-gray-900 dark:text-gray-50 overflow-hidden">
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
            <div className="absolute z-20 w-full">
              <AppHeader
                isWideLayout={isWideLayout}
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
                <div className="px-3">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}
            </div>
          )}

          <ConfirmDialog
            isOpen={showDeleteListConfirm}
            onClose={() => setShowDeleteListConfirm(false)}
            onConfirm={handleDeleteList}
            title={t("taskList.deleteListConfirm.title")}
            message={t("taskList.deleteListConfirm.message")}
            confirmText={t("auth.button.delete")}
            cancelText={t("common.cancel")}
            isDestructive
            disabled={deletingList}
          />

          <div className="h-full overflow-hidden">
            {hasTaskLists ? (
              <Carousel
                className="h-full"
                index={selectedTaskListIndex}
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
                          t={t}
                          enableEditDialog
                          colors={colors}
                          showEditListDialog={showEditListDialog}
                          onEditDialogOpenChange={handleEditDialogOpenChange}
                          editListName={editListName}
                          onEditListNameChange={setEditListName}
                          editListBackground={editListBackground}
                          onEditListBackgroundChange={setEditListBackground}
                          onSaveListDetails={handleSaveListDetails}
                          deletingList={deletingList}
                          onDeleteList={handleRequestDeleteList}
                          enableShareDialog
                          showShareDialog={showShareDialog}
                          onShareDialogOpenChange={handleShareDialogOpenChange}
                          shareCode={shareCode}
                          shareCopySuccess={shareCopySuccess}
                          generatingShareCode={generatingShareCode}
                          onGenerateShareCode={handleGenerateShareCode}
                          removingShareCode={removingShareCode}
                          onRemoveShareCode={handleRemoveShareCode}
                          onCopyShareLink={handleCopyShareLink}
                        />
                      </div>
                    </div>
                  );
                })}
              </Carousel>
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {t("app.emptyState")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
