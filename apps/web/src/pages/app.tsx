"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useSwipeable } from "react-swipeable";
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
import { signOut, deleteAccount } from "@lightlist/sdk/mutations/auth";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { TaskListPanel } from "@/components/app/TaskListPanel";

interface SortableTaskListItemProps {
  taskList: TaskList;
  isSelected: boolean;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
  taskCountLabel: string;
}

function SortableTaskListItem({
  taskList,
  isSelected,
  onSelect,
  dragHintLabel,
  taskCountLabel,
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.32)] transition-all
        ${isSelected ? "ring-2 ring-cyan-400" : ""}
        ${isDragging ? "opacity-60 scale-[0.99]" : "hover:shadow-[0_24px_70px_rgba(15,23,42,0.32)]"}
      `}
    >
      <div className="flex items-center gap-3 p-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg bg-white/50 dark:bg-white/10 border border-white/30 flex-shrink-0"
          title={dragHintLabel}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        </button>

        <button
          onClick={() => onSelect(taskList.id)}
          className="flex-1 text-left p-2 hover:bg-white/60 dark:hover:bg-white/10 transition-colors rounded-xl"
        >
          <div
            className="w-full h-1.5 rounded-full mb-2"
            style={{ backgroundColor: taskList.background || "#ffffff" }}
          />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {taskList.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {taskList.tasks.length} {taskCountLabel}
          </p>
        </button>
      </div>
    </div>
  );
}

export default function AppPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );

  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [showEditListModal, setShowEditListModal] = useState(false);
  const [editListName, setEditListName] = useState("");
  const [editListColor, setEditListColor] = useState("");
  const [editingListName, setEditingListName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [generatingShareCode, setGeneratingShareCode] = useState(false);
  const [removingShareCode, setRemovingShareCode] = useState(false);
  const [shareCopySuccess, setShareCopySuccess] = useState(false);
  const [showCreateListForm, setShowCreateListForm] = useState(false);
  const [createListInput, setCreateListInput] = useState("");

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

  const selectedTaskList = state?.taskLists?.find(
    (tl) => tl.id === selectedTaskListId,
  ) as TaskList | undefined;

  const isLoading = !state || !state.user;

  const swipeHandlersDrawer = useSwipeable({
    onSwipedLeft: () => setIsDrawerOpen(false),
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  const swipeHandlersMain = useSwipeable({
    onSwipedRight: () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsDrawerOpen(true);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

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
      await createTaskList(createListInput.trim());
      setCreateListInput("");
      setShowCreateListForm(false);
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

  const handleEditListName = async () => {
    if (!selectedTaskListId || !selectedTaskList) return;

    if (!editListName.trim() || editListName === selectedTaskList.name) {
      setEditingListName(false);
      return;
    }

    setError(null);
    try {
      await updateTaskList(selectedTaskListId, { name: editListName.trim() });
      setEditingListName(false);
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, t, "common.error"));
    }
  };

  const handleEditListColor = async (color: string) => {
    if (!selectedTaskListId) return;

    setError(null);
    try {
      await updateTaskList(selectedTaskListId, { background: color });
      setShowEditListModal(false);
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
      setShowDeleteConfirm(false);
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
  ];

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden text-slate-900 dark:text-white">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 dark:from-[#0b1020] dark:via-[#0b1020] dark:to-[#0b1020]" />
        <div
          className="absolute inset-0 -z-10 opacity-60 pointer-events-none"
          style={{ backgroundImage: "var(--glow)" }}
        />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden text-slate-900 dark:text-white">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 dark:from-[#0b1020] dark:via-[#0b1020] dark:to-[#0b1020]" />
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-60"
        style={{ backgroundImage: "var(--glow)" }}
      />
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div
        {...swipeHandlersDrawer}
        className={`
          fixed left-0 top-0 h-full w-80 bg-white/80 dark:bg-white/5 backdrop-blur-2xl border border-white/20 shadow-[0_24px_90px_rgba(15,23,42,0.4)] z-50
          transform transition-transform duration-300 ease-in-out
          ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:shadow-none md:transform-none md:border-r md:border-white/15
          flex flex-col overflow-hidden
        `}
      >
        <div className="p-5 border-b border-white/20 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t("app.title")}
          </h1>
          <button
            onClick={() => router.push("/settings")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 shadow hover:border-white/60 transition-colors"
            title={t("settings.title")}
          >
            <svg
              className="w-5 h-5 text-slate-800 dark:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        {state?.taskLists && state.taskLists.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <DndContext
                sensors={sensorsList}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndTaskList}
              >
                <SortableContext items={state.taskLists.map((t) => t.id)}>
                  <div className="space-y-2">
                    {state.taskLists.map((taskList) => (
                      <SortableTaskListItem
                        key={taskList.id}
                        taskList={taskList}
                        isSelected={taskList.id === selectedTaskListId}
                        onSelect={(taskListId) => {
                          setSelectedTaskListId(taskListId);
                          if (
                            typeof window !== "undefined" &&
                            window.innerWidth < 768
                          ) {
                            setIsDrawerOpen(false);
                          }
                        }}
                        dragHintLabel={t("app.dragHint")}
                        taskCountLabel={t("taskList.taskCount")}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowCreateListForm(true)}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold px-4 py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t("app.createNew")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <p className="text-gray-600 mb-4 text-center">
              {t("app.emptyState")}
            </p>
            <button
              onClick={() => setShowCreateListForm(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold px-6 py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("app.createNew")}
            </button>
          </div>
        )}
      </div>

      <div
        {...swipeHandlersMain}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {selectedTaskList ? (
          <>
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-2xl border-b border-white/15 shadow-[0_12px_60px_rgba(15,23,42,0.28)]">
              <div className="px-4 py-4 flex items-center gap-4">
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 shadow hover:border-white/60 transition-colors"
                  title={t("app.openMenu")}
                >
                  <svg
                    className="w-6 h-6 text-slate-800 dark:text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                <div className="flex-1 flex items-start justify-between gap-4">
                  <div>
                    {editingListName ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          onBlur={() => handleEditListName()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEditListName();
                            }
                          }}
                          autoFocus
                          className="text-2xl font-bold text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-cyan-300/60 bg-white/80 dark:bg-white/10 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </div>
                    ) : (
                      <h1
                        className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                        onClick={() => {
                          setEditListName(selectedTaskList.name);
                          setEditingListName(true);
                        }}
                      >
                        {selectedTaskList.name}
                      </h1>
                    )}
                    <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                      {selectedTaskList.tasks.length} {t("taskList.taskCount")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditListColor(
                          selectedTaskList.background || "#ffffff",
                        );
                        setShowEditListModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 text-slate-900 dark:text-white hover:border-white/60 transition-colors text-sm font-semibold"
                    >
                      {t("taskList.editColor")}
                    </button>
                    <button
                      onClick={() => {
                        setShowShareModal(true);
                        setShareCode(selectedTaskList?.shareCode || null);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold shadow-[0_14px_40px_rgba(56,189,248,0.28)] hover:opacity-90 transition-opacity text-sm"
                    >
                      {t("taskList.share")}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="error" className="mx-4 mb-4">
                  {error}
                </Alert>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 py-8">
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
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-white font-semibold shadow-[0_14px_40px_rgba(251,113,133,0.3)] hover:opacity-90 transition-opacity"
                >
                  {t("taskList.deleteList")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                {t("app.emptyState")}
              </p>
              <button
                onClick={() => setShowCreateListForm(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold px-6 py-3 rounded-xl shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t("app.createNew")}
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditListModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-panel-strong)] border border-white/10 rounded-2xl shadow-[0_30px_120px_rgba(15,23,42,0.55)] p-6 max-w-sm w-full text-white">
            <h2 className="text-lg font-semibold mb-4">
              {t("taskList.selectColor")}
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleEditListColor(color)}
                  className="w-12 h-12 rounded-lg border-2 border-transparent transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      editListColor === color ? "#fff" : "transparent",
                  }}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={() => setShowEditListModal(false)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:border-white/40 transition-all"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteList}
        title={t("taskList.deleteConfirm")}
        message={t("common.confirmDelete")}
        additionalInfo={selectedTaskList?.name}
        confirmText={deletingList ? t("common.deleting") : t("common.delete")}
        cancelText={t("common.cancel")}
        isDestructive={true}
        disabled={deletingList}
      />

      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-panel-strong)] border border-white/10 rounded-2xl shadow-[0_30px_120px_rgba(15,23,42,0.55)] p-6 max-w-sm w-full text-white">
            <h2 className="text-lg font-semibold mb-4">
              {t("taskList.shareTitle")}
            </h2>

            {shareCode ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-200/80 mb-2">
                    {t("taskList.shareCode")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareCode}
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                    />
                    <button
                      onClick={handleCopyShareLink}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold shadow-[0_14px_40px_rgba(56,189,248,0.28)] hover:opacity-90 transition-opacity text-sm"
                    >
                      {shareCopySuccess ? t("common.copied") : t("common.copy")}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRemoveShareCode}
                  disabled={removingShareCode}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-white font-semibold shadow-[0_14px_40px_rgba(251,113,133,0.3)] hover:opacity-90 transition-opacity text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {removingShareCode
                    ? t("common.deleting")
                    : t("taskList.removeShare")}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-200/80 mb-4">
                  {t("taskList.shareDescription")}
                </p>
                <button
                  onClick={handleGenerateShareCode}
                  disabled={generatingShareCode}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold shadow-[0_14px_40px_rgba(56,189,248,0.28)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {generatingShareCode
                    ? t("common.loading")
                    : t("taskList.generateShare")}
                </button>
              </div>
            )}

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:border-white/40 transition-all"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      {showCreateListForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-panel-strong)] border border-white/10 rounded-2xl shadow-[0_30px_120px_rgba(15,23,42,0.55)] p-6 max-w-sm w-full text-white">
            <h2 className="text-lg font-semibold mb-4">
              {t("app.createTaskList")}
            </h2>
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
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white mb-4 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateListForm(false);
                  setCreateListInput("");
                }}
                className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl hover:border-white/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("app.cancel")}
              </button>
              <button
                onClick={handleCreateList}
                disabled={!createListInput.trim()}
                className="flex-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold py-3 rounded-xl shadow-[0_14px_40px_rgba(56,189,248,0.28)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t("app.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
