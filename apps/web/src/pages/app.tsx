"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { TaskListPanel } from "@/components/app/TaskListPanel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";

interface SortableTaskListItemProps {
  taskList: TaskList;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
}

function SortableTaskListItem({
  taskList,
  onSelect,
  dragHintLabel,
}: SortableTaskListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskList.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button {...attributes} {...listeners} title={dragHintLabel}>
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      </button>
      <span
        aria-hidden="true"
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "4px",
          backgroundColor: taskList.background,
          border: "1px solid #cccccc",
        }}
      />

      <button onClick={() => onSelect(taskList.id)}>
        {taskList.name} {taskList.tasks.length} {taskList.background}
      </button>
    </div>
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

  const isLoading = !state || !state.user;

  const handleDragEndTaskList = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const draggedTaskListId = active.id as string;
      const targetTaskListId = over.id as string;

      setError(null);
      try {
        await updateTaskListOrder(draggedTaskListId, targetTaskListId);
      } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "app.error"));
    }
  };

  const handleDragEndTask = async (event: DragEndEvent) => {
    if (!selectedTaskListId) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const draggedTaskId = active.id as string;
      const targetTaskId = over.id as string;

      setError(null);
      try {
        await updateTasksOrder(selectedTaskListId, draggedTaskId, targetTaskId);
      } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleAddTask = async () => {
    if (!selectedTaskListId || !newTaskText.trim()) return;

    setError(null);

    try {
      await addTask(selectedTaskListId, newTaskText.trim());
      setNewTaskText("");
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedTaskListId) return;

    setError(null);
    try {
      await deleteTask(selectedTaskListId, taskId);
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(t("common.error"));
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <div>
        <button onClick={() => router.push("/settings")}>
          {t("settings.title")}
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <section className="border-b">
        <div>
          <Dialog
            open={showCreateListDialog}
            onOpenChange={(open: boolean) => {
              setShowCreateListDialog(open);
              if (!open) {
                setCreateListInput("");
                setCreateListBackground(colors[0]);
              }
            }}
          >
            <DialogTrigger asChild>
              <button type="button">{t("app.createNew")}</button>
            </DialogTrigger>
            <DialogContent
              titleId="create-task-list-title"
              descriptionId="create-task-list-description"
            >
              <DialogHeader
                title={
                  <DialogTitle id="create-task-list-title">
                    {t("app.createTaskList")}
                  </DialogTitle>
                }
                description={
                  <DialogDescription id="create-task-list-description">
                    {t("app.taskListName")}
                  </DialogDescription>
                }
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span>{t("app.taskListName")}</span>
                  <input
                    type="text"
                    value={createListInput}
                    onChange={(e) => setCreateListInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateList();
                      }
                    }}
                    placeholder={t("app.taskListNamePlaceholder")}
                  />
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <span>{t("taskList.selectColor")}</span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-pressed={createListBackground === color}
                        aria-label={`${t("taskList.selectColor")} ${color}`}
                        onClick={() => setCreateListBackground(color)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          border:
                            createListBackground === color
                              ? "2px solid #111111"
                              : "1px solid #cccccc",
                          backgroundColor: color,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <button type="button">{t("app.cancel")}</button>
                </DialogClose>
                <button
                  type="button"
                  onClick={handleCreateList}
                  disabled={!createListInput.trim()}
                >
                  {t("app.create")}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {state?.taskLists && state.taskLists.length > 0 ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndTaskList}
          >
            <SortableContext items={state.taskLists.map((t) => t.id)}>
              {state.taskLists.map((taskList) => (
                <SortableTaskListItem
                  key={taskList.id}
                  taskList={taskList}
                  onSelect={(taskListId) => {
                    setSelectedTaskListId(taskListId);
                  }}
                  dragHintLabel={t("app.dragHint")}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p>{t("app.emptyState")}</p>
        )}
      </section>

      {selectedTaskList ? (
        <section
          className="border-b"
          style={{ backgroundColor: selectedTaskList.background }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <h2 style={{ margin: 0 }}>{selectedTaskList.name}</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  aria-label={t("taskList.selectColor")}
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: selectedTaskList.background,
                    border: "1px solid #cccccc",
                  }}
                />
                <span>{selectedTaskList.background}</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Dialog
                open={showEditListDialog}
                onOpenChange={(open: boolean) => {
                  setShowEditListDialog(open);
                  if (open && selectedTaskList) {
                    setEditListName(selectedTaskList.name);
                    setEditListBackground(selectedTaskList.background);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <button type="button">{t("taskList.editDetails")}</button>
                </DialogTrigger>
                <DialogContent
                  titleId="edit-task-list-title"
                  descriptionId="edit-task-list-description"
                >
                  <DialogHeader
                    title={
                      <DialogTitle id="edit-task-list-title">
                        {t("taskList.editDetails")}
                      </DialogTitle>
                    }
                    description={
                      <DialogDescription id="edit-task-list-description">
                        {t("app.taskListName")}
                      </DialogDescription>
                    }
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span>{t("app.taskListName")}</span>
                      <input
                        type="text"
                        value={editListName}
                        onChange={(e) => setEditListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveListDetails();
                          }
                        }}
                        placeholder={t("app.taskListNamePlaceholder")}
                      />
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <span>{t("taskList.selectColor")}</span>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {colors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-pressed={editListBackground === color}
                            aria-label={`${t("taskList.selectColor")} ${color}`}
                            onClick={() => setEditListBackground(color)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "10px",
                              border:
                                editListBackground === color
                                  ? "2px solid #111111"
                                  : "1px solid #cccccc",
                              backgroundColor: color,
                            }}
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
                      <button type="button">{t("common.cancel")}</button>
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
                open={showShareDialog}
                onOpenChange={(open: boolean) => {
                  setShowShareDialog(open);
                  if (open) {
                    setShareCode(selectedTaskList.shareCode || null);
                    setShareCopySuccess(false);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <button type="button">{t("taskList.share")}</button>
                </DialogTrigger>
                <DialogContent
                  titleId="share-task-list-title"
                  descriptionId="share-task-list-description"
                >
                  <DialogHeader
                    title={
                      <DialogTitle id="share-task-list-title">
                        {t("taskList.shareTitle")}
                      </DialogTitle>
                    }
                    description={
                      <DialogDescription id="share-task-list-description">
                        {t("taskList.shareDescription")}
                      </DialogDescription>
                    }
                  />
                  {shareCode ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginTop: "16px",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <span>{t("taskList.shareCode")}</span>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <input type="text" value={shareCode} readOnly />
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
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginTop: "16px",
                      }}
                    >
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
                      <button type="button">{t("common.close")}</button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TaskListPanel
            tasks={selectedTaskList.tasks}
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
            historySuggestions={selectedTaskList.history}
          />
        </section>
      ) : (
        <p>{t("app.emptyState")}</p>
      )}
    </div>
  );
}
