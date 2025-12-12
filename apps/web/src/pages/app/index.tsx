import { useEffect, useState } from "react";
import { useRef } from "react";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { appStore } from "@lightlist/sdk/store";
import { AppState, TaskList, Task } from "@lightlist/sdk/types";
import {
  createTaskList,
  updateTaskListOrder,
  updateTask,
  deleteTask,
  addTask,
  updateTaskList,
  deleteTaskList,
  updateTasksOrder,
  generateShareCode,
  removeShareCode,
} from "@lightlist/sdk/mutations/app";
import clsx from "clsx";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { TaskListPanel } from "@/components/app/TaskListPanel";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/Carousel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/Drawer";
import { DrawerPanel } from "./_DrawerPanel";

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

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

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
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
  ) as TaskList | undefined;

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
    setEditingTaskId(null);
    setEditingTaskText("");
  }, [selectedTaskListId]);

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

  const drawerHistoryEntryAdded = useRef(false);

  useEffect(() => {
    if (isWideLayout || !isDrawerOpen) return;

    drawerHistoryEntryAdded.current = true;

    const handlePopState = () => {
      setIsDrawerOpen(false);
      drawerHistoryEntryAdded.current = false;
    };

    window.addEventListener("popstate", handlePopState);
    const currentState = window.history.state;
    window.history.pushState(currentState, "");

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (drawerHistoryEntryAdded.current) {
        window.history.back();
        drawerHistoryEntryAdded.current = false;
      }
    };
  }, [isDrawerOpen, isWideLayout]);

  const isLoading = !state || !state.user;
  const hasTaskLists = Boolean(state?.taskLists?.length);
  const userEmail = state?.user?.email || t("app.drawerNoEmail");
  const taskLists = state?.taskLists ?? [];

  const handleDragEndTaskList = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const draggedTaskListId = getStringId(active.id);
      const targetTaskListId = getStringId(over.id);
      if (!draggedTaskListId || !targetTaskListId) return;

      setError(null);
      try {
        await updateTaskListOrder(draggedTaskListId, targetTaskListId);
      } catch (err) {
        setError(resolveErrorMessage(err, t, "common.error"));
      }
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

  const handleDragEndTask = async (event: DragEndEvent) => {
    if (!selectedTaskListId) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const draggedTaskId = getStringId(active.id);
      const targetTaskId = getStringId(over.id);
      if (!draggedTaskId || !targetTaskId) return;

      setError(null);
      try {
        await updateTasksOrder(selectedTaskListId, draggedTaskId, targetTaskId);
      } catch (err) {
        setError(resolveErrorMessage(err, t, "common.error"));
      }
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!selectedTaskListId) return;

    setError(null);
    try {
      await updateTask(selectedTaskListId, task.id, {
        completed: !task.completed,
      });
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleAddTask = async () => {
    if (!selectedTaskListId || !newTaskText.trim()) return;

    setError(null);

    try {
      await addTask(selectedTaskListId, newTaskText.trim());
      setNewTaskText("");
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleEditTask = async (task: Task) => {
    if (!selectedTaskListId) return;

    if (!editingTaskText.trim() || editingTaskText === task.text) {
      setEditingTaskId(null);
      return;
    }

    setError(null);
    try {
      await updateTask(selectedTaskListId, task.id, {
        text: editingTaskText.trim(),
      });
      setEditingTaskId(null);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedTaskListId) return;

    setError(null);
    try {
      await deleteTask(selectedTaskListId, taskId);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "common.error"));
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

  const drawerPanel = (
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
      taskLists={taskLists}
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
    <div
      className={clsx(
        "flex gap-4 p-4",
        isWideLayout ? "flex-row items-start" : "flex-col",
      )}
    >
      {isWideLayout && (
        <aside className="sticky top-4 w-[360px] max-w-[420px] shrink-0 self-stretch">
          <div className="flex h-full max-h-[calc(100vh-32px)] flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-4 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-50">
            {drawerPanel}
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header
          className={clsx(
            "flex flex-wrap items-center gap-3",
            isWideLayout ? "justify-start" : "justify-between",
          )}
        >
          <h1 className="m-0 text-2xl font-bold">{t("app.title")}</h1>
          {!isWideLayout && (
            <Drawer
              direction="left"
              open={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
            >
              <DrawerTrigger asChild>
                <button type="button">{t("app.openMenu")}</button>
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

        {error && <Alert variant="error">{error}</Alert>}

        {hasTaskLists ? (
          <Carousel
            wheelGestures={!isTaskSorting}
            setApi={setTaskListCarouselApi}
            opts={{
              align: "start",
              containScroll: "trimSnaps",
            }}
          >
            <CarouselPrevious aria-label={t("common.previous")} />
            <CarouselNext aria-label={t("common.next")} />
            <CarouselContent>
              {state.taskLists.map((taskList) => {
                const isActive = selectedTaskListId === taskList.id;
                return (
                  <CarouselItem key={taskList.id}>
                    <section
                      className={clsx(
                        "border-b",
                        isActive
                          ? "pointer-events-auto"
                          : "pointer-events-none",
                      )}
                      style={{ backgroundColor: taskList.background }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          <h2 className="m-0 text-xl font-semibold">
                            {taskList.name}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span
                              aria-label={t("taskList.selectColor")}
                              className="h-4 w-4 rounded border border-[#cccccc]"
                              style={{ backgroundColor: taskList.background }}
                            />
                            <span>{taskList.background}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Dialog
                            open={isActive && showEditListDialog}
                            onOpenChange={(open: boolean) => {
                              setSelectedTaskListId(taskList.id);
                              setShowEditListDialog(open);
                              if (open) {
                                setEditListName(taskList.name);
                                setEditListBackground(taskList.background);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedTaskListId(taskList.id)
                                }
                              >
                                {t("taskList.editDetails")}
                              </button>
                            </DialogTrigger>
                            <DialogContent
                              title={t("taskList.editDetails")}
                              description={t("app.taskListName")}
                            >
                              <div className="mt-4 flex flex-col gap-3">
                                <label className="flex flex-col gap-1">
                                  <span>{t("app.taskListName")}</span>
                                  <input
                                    type="text"
                                    value={editListName}
                                    onChange={(e) =>
                                      setEditListName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveListDetails();
                                      }
                                    }}
                                    placeholder={t(
                                      "app.taskListNamePlaceholder",
                                    )}
                                  />
                                </label>
                                <div className="flex flex-col gap-2">
                                  <span>{t("taskList.selectColor")}</span>
                                  <div className="flex flex-wrap gap-2">
                                    {colors.map((color) => (
                                      <button
                                        key={color}
                                        type="button"
                                        aria-pressed={
                                          editListBackground === color
                                        }
                                        aria-label={`${t("taskList.selectColor")} ${color}`}
                                        onClick={() =>
                                          setEditListBackground(color)
                                        }
                                        className={clsx(
                                          "h-8 w-8 rounded-[10px]",
                                          editListBackground === color
                                            ? "border-2 border-[#111111]"
                                            : "border border-[#cccccc]",
                                        )}
                                        style={{ backgroundColor: color }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <button
                                  type="button"
                                  onClick={handleDeleteList}
                                  disabled={deletingList}
                                >
                                  {deletingList
                                    ? t("common.deleting")
                                    : t("taskList.deleteList")}
                                </button>
                                <DialogClose asChild>
                                  <button type="button">
                                    {t("common.cancel")}
                                  </button>
                                </DialogClose>
                                <button
                                  type="button"
                                  onClick={handleSaveListDetails}
                                  disabled={!editListName.trim()}
                                >
                                  {t("taskList.editDetails")}
                                </button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Dialog
                            open={isActive && showShareDialog}
                            onOpenChange={(open: boolean) => {
                              setSelectedTaskListId(taskList.id);
                              setShowShareDialog(open);
                              if (open) {
                                setShareCode(taskList.shareCode || null);
                                setShareCopySuccess(false);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedTaskListId(taskList.id)
                                }
                              >
                                {t("taskList.share")}
                              </button>
                            </DialogTrigger>
                            <DialogContent
                              title={t("taskList.shareTitle")}
                              description={t("taskList.shareDescription")}
                            >
                              {shareCode ? (
                                <div className="mt-4 flex flex-col gap-3">
                                  <label className="flex flex-col gap-1.5">
                                    <span>{t("taskList.shareCode")}</span>
                                    <div className="flex flex-wrap gap-2">
                                      <input
                                        type="text"
                                        value={shareCode}
                                        readOnly
                                      />
                                      <button
                                        type="button"
                                        onClick={handleCopyShareLink}
                                        disabled={!shareCode}
                                      >
                                        {shareCopySuccess
                                          ? t("common.copied")
                                          : t("common.copy")}
                                      </button>
                                    </div>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={handleRemoveShareCode}
                                    disabled={removingShareCode}
                                  >
                                    {removingShareCode
                                      ? t("common.deleting")
                                      : t("taskList.removeShare")}
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-4 flex flex-col gap-3">
                                  <button
                                    type="button"
                                    onClick={handleGenerateShareCode}
                                    disabled={generatingShareCode}
                                  >
                                    {generatingShareCode
                                      ? t("common.loading")
                                      : t("taskList.generateShare")}
                                  </button>
                                </div>
                              )}
                              <DialogFooter>
                                <DialogClose asChild>
                                  <button type="button">
                                    {t("common.close")}
                                  </button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <TaskListPanel
                        tasks={taskList.tasks}
                        sensors={sensorsList}
                        onDragEnd={handleDragEndTask}
                        editingTaskId={editingTaskId}
                        editingText={editingTaskText}
                        onEditingTextChange={setEditingTaskText}
                        onEditStart={(t) => {
                          setEditingTaskId(t.id);
                          setEditingTaskText(t.text);
                        }}
                        onEditEnd={handleEditTask}
                        onToggle={handleToggleTask}
                        onDelete={handleDeleteTask}
                        newTaskText={newTaskText}
                        onNewTaskTextChange={setNewTaskText}
                        onAddTask={handleAddTask}
                        addButtonLabel={t("taskList.addTask")}
                        addPlaceholder={t("taskList.addTaskPlaceholder")}
                        deleteLabel={t("common.delete")}
                        dragHintLabel={t("taskList.dragHint")}
                        emptyLabel={t("pages.tasklist.noTasks")}
                        historySuggestions={taskList.history}
                        onSortingChange={setIsTaskSorting}
                      />
                    </section>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        ) : (
          <p>{t("app.emptyState")}</p>
        )}
      </div>
    </div>
  );
}
