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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { TaskListPanel } from "@/components/app/TaskListPanel";

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
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button {...attributes} {...listeners} title={dragHintLabel}>
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      </button>

      <button onClick={() => onSelect(taskList.id)}>
        {taskList.name} {taskList.tasks.length} {taskList.background}
      </button>
    </div>
  );
}

export default function AppPage() {
  const router = useRouter();
  const { t } = useTranslation();

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
          <button onClick={() => setShowCreateListForm(true)}>
            {t("app.createNew")}
          </button>
          {showCreateListForm && (
            <div>
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
              <div>
                <button
                  onClick={handleCreateList}
                  disabled={!createListInput.trim()}
                >
                  {t("app.create")}
                </button>
                <button
                  onClick={() => {
                    setShowCreateListForm(false);
                    setCreateListInput("");
                  }}
                >
                  {t("app.cancel")}
                </button>
              </div>
            </div>
          )}
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
        <section className="border-b">
          <div>
            {editingListName ? (
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
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditListName(selectedTaskList.name);
                  setEditingListName(true);
                }}
              >
                {selectedTaskList.name}
              </button>
            )}
            <div>
              <button
                onClick={() => {
                  setShowEditListModal(true);
                }}
              >
                {t("taskList.editColor")}
              </button>
              <button
                onClick={() => {
                  setShowShareModal(true);
                  setShareCode(selectedTaskList?.shareCode || null);
                }}
              >
                {t("taskList.share")}
              </button>
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
          <button onClick={() => setShowDeleteConfirm(true)}>
            {t("taskList.deleteList")}
          </button>
        </section>
      ) : (
        <p>{t("app.emptyState")}</p>
      )}

      {showEditListModal && (
        <div>
          <h2>{t("taskList.selectColor")}</h2>
          <div>
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleEditListColor(color)}
                title={color}
              >
                {color}
              </button>
            ))}
          </div>
          <button onClick={() => setShowEditListModal(false)}>
            {t("common.close")}
          </button>
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
        <div>
          <h2>{t("taskList.shareTitle")}</h2>

          {shareCode ? (
            <div>
              <div>
                <p>{t("taskList.shareCode")}</p>
                <div>
                  <input type="text" value={shareCode} readOnly />
                  <button onClick={handleCopyShareLink}>
                    {shareCopySuccess ? t("common.copied") : t("common.copy")}
                  </button>
                </div>
              </div>

              <button
                onClick={handleRemoveShareCode}
                disabled={removingShareCode}
              >
                {removingShareCode
                  ? t("common.deleting")
                  : t("taskList.removeShare")}
              </button>
            </div>
          ) : (
            <div>
              <p>{t("taskList.shareDescription")}</p>
              <button
                onClick={handleGenerateShareCode}
                disabled={generatingShareCode}
              >
                {generatingShareCode
                  ? t("common.loading")
                  : t("taskList.generateShare")}
              </button>
            </div>
          )}

          <button onClick={() => setShowShareModal(false)}>
            {t("common.close")}
          </button>
        </div>
      )}
    </div>
  );
}
