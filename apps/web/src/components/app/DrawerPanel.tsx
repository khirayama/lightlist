import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { Task, TaskList } from "@lightlist/sdk/types";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
} from "@/components/ui/Drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { ColorPicker, type ColorOption } from "@/components/ui/ColorPicker";
import { CalendarSheet } from "./CalendarSheet";

const COLORS: readonly ColorOption[] = [
  {
    value: null,
    preview: "var(--tasklist-theme-bg)",
  },
  { value: "#F87171" },
  { value: "#FBBF24" },
  { value: "#34D399" },
  { value: "#38BDF8" },
  { value: "#818CF8" },
  { value: "#A78BFA" },
];

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

export const resolveTaskListBackground = (background: string | null): string =>
  background ?? "var(--tasklist-theme-bg)";

export type DatedTask = {
  taskListId: string;
  taskListName: string;
  taskListBackground: string;
  task: Task;
  dateValue: Date;
  dateKey: string;
};

export const getDatedTaskId = (task: DatedTask): string =>
  `${task.taskListId}:${task.task.id}`;

export const parseTaskDate = (
  dateStr: string | null | undefined,
): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const formatTaskDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const createDateFromKey = (dateKey: string): Date | null => {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
};

export type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  sensorsList: SensorDescriptor<SensorOptions>[];
  onReorderTaskList: (
    draggedId: string,
    targetId: string,
  ) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  onCreateList: (name: string, background: string | null) => Promise<string>;
  onJoinList: (code: string) => Promise<void>;
};

type SortableTaskListItemProps = {
  taskList: TaskList;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
  taskCountLabel: string;
  isActive: boolean;
};

function SortableTaskListItem({
  taskList,
  onSelect,
  dragHintLabel,
  taskCountLabel,
  isActive,
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
      className={clsx(
        "flex items-center gap-2 rounded-[10px] p-2",
        isActive ? "bg-background dark:bg-surface-dark" : "bg-transparent",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="flex touch-none items-center rounded-lg p-1 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
      >
        <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
      </button>

      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-border dark:border-border-dark"
        style={{
          backgroundColor: resolveTaskListBackground(taskList.background),
        }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="flex-1 flex flex-col items-start gap-0.5 text-start"
      >
        <span className={clsx(isActive ? "font-bold" : "font-medium")}>
          {taskList.name}
        </span>
        <span className="text-xs text-muted dark:text-muted-dark">
          {taskCountLabel}
        </span>
      </button>
    </div>
  );
}

type CalendarTaskItemProps = {
  task: DatedTask;
  onOpenTaskList: (taskListId: string) => void;
  onSelectDate: (date: Date) => void;
  itemRef: (element: HTMLDivElement | null) => void;
  isHighlighted: boolean;
};

export function CalendarTaskItem({
  task,
  onOpenTaskList,
  onSelectDate,
  itemRef,
  isHighlighted,
}: CalendarTaskItemProps) {
  const dateDisplayValue = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(task.dateValue);

  return (
    <div
      ref={itemRef}
      className={clsx(
        "flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0 dark:border-border-dark",
        isHighlighted && "bg-background dark:bg-surface-dark",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(task.dateValue)}
            className="shrink-0 rounded-md text-xs text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:focus-visible:outline-muted-dark"
          >
            {dateDisplayValue}
          </button>
          <button
            type="button"
            onClick={() => onOpenTaskList(task.taskListId)}
            className="inline-flex min-w-0 items-center justify-end gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rounded-full border border-border dark:border-border-dark"
              style={{ backgroundColor: task.taskListBackground }}
            />
            <span className="truncate text-xs font-medium text-text dark:text-text-dark">
              {task.taskListName}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelectDate(task.dateValue)}
          className="truncate rounded-md text-start font-medium leading-6 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-text-dark dark:focus-visible:outline-muted-dark"
        >
          {task.task.text}
        </button>
      </div>
    </div>
  );
}

export function DrawerPanel({
  isWideLayout,
  userEmail,
  hasTaskLists,
  taskLists,
  sensorsList,
  onReorderTaskList,
  selectedTaskListId,
  onSelectTaskList,
  onCloseDrawer,
  onOpenSettings,
  onCreateList,
  onJoinList,
}: DrawerPanelProps) {
  const { t } = useTranslation();

  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [createListInput, setCreateListInput] = useState("");
  const [createListBackground, setCreateListBackground] = useState<
    string | null
  >(COLORS[0].value);

  const [showJoinListDialog, setShowJoinListDialog] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [joiningList, setJoiningList] = useState(false);
  const [joinListError, setJoinListError] = useState<string | null>(null);

  const createListInputRef = useRef(createListInput);
  createListInputRef.current = createListInput;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = getStringId(active.id);
    const targetId = getStringId(over.id);

    if (draggedId && targetId) {
      await onReorderTaskList(draggedId, targetId);
    }
  };

  const handleCreateList = async () => {
    const name = createListInput.trim();
    if (!name) return;
    await onCreateList(name, createListBackground);
    setCreateListInput("");
    setCreateListBackground(COLORS[0].value);
    setShowCreateListDialog(false);
  };

  const handleJoinList = async () => {
    const code = joinListInput.trim();
    if (!code) return;
    setJoiningList(true);
    setJoinListError(null);
    try {
      await onJoinList(code);
      setJoinListInput("");
      setShowJoinListDialog(false);
    } catch (err) {
      setJoinListError(
        err instanceof Error ? err.message : t("pages.sharecode.error"),
      );
    } finally {
      setJoiningList(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <DrawerHeader>
        {isWideLayout ? (
          <h2 id="drawer-task-lists-title" className="sr-only">
            {t("app.drawerTitle")}
          </h2>
        ) : (
          <DrawerTitle id="drawer-task-lists-title" className="sr-only">
            {t("app.drawerTitle")}
          </DrawerTitle>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isWideLayout ? (
              <p
                id="drawer-task-lists-description"
                className="m-0 min-w-0 flex-1 truncate text-sm text-muted dark:text-muted-dark"
              >
                {userEmail}
              </p>
            ) : (
              <DrawerDescription
                id="drawer-task-lists-description"
                className="min-w-0 flex-1 truncate"
              >
                {userEmail}
              </DrawerDescription>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              title={t("settings.title")}
              aria-label={t("settings.title")}
              data-vaul-no-drag
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:bg-surface-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
            >
              <AppIcon name="settings" aria-hidden="true" focusable="false" />
            </button>
          </div>
          {!isWideLayout && (
            <button
              type="button"
              onClick={onCloseDrawer}
              title={t("common.close")}
              aria-label={t("common.close")}
              data-vaul-no-drag
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:bg-surface-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
            >
              <AppIcon name="close" aria-hidden="true" focusable="false" />
            </button>
          )}
        </div>
      </DrawerHeader>

      <CalendarSheet
        isWideLayout={isWideLayout}
        taskLists={taskLists}
        onSelectTaskList={onSelectTaskList}
        onCloseDrawer={onCloseDrawer}
      />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {hasTaskLists ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={taskLists.map((t) => t.id)}>
              {taskLists.map((taskList) => (
                <SortableTaskListItem
                  key={taskList.id}
                  taskList={taskList}
                  onSelect={(taskListId) => {
                    onSelectTaskList(taskListId);
                    onCloseDrawer();
                  }}
                  dragHintLabel={t("app.dragHint")}
                  taskCountLabel={t("taskList.taskCount", {
                    count: taskList.tasks.length,
                  })}
                  isActive={selectedTaskListId === taskList.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted dark:text-muted-dark">
            {t("app.emptyState")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Dialog
            open={Boolean(showCreateListDialog)}
            onOpenChange={(open: boolean) => {
              setShowCreateListDialog(open);
              if (!open) {
                setCreateListInput("");
                setCreateListBackground(COLORS[0].value);
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark"
              >
                {t("app.createNew")}
              </button>
            </DialogTrigger>
            <DialogContent
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreateList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => setCreateListInput(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <span>{t("taskList.selectColor")}</span>
                    <ColorPicker
                      colors={COLORS}
                      selectedColor={createListBackground}
                      onSelect={setCreateListBackground}
                      ariaLabelPrefix={t("taskList.selectColor")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!createListInput.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark"
                  >
                    {t("app.create")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(showJoinListDialog)}
            onOpenChange={(open: boolean) => {
              setShowJoinListDialog(open);
              if (!open) {
                setJoinListInput("");
                setJoinListError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
              >
                {t("app.joinList")}
              </button>
            </DialogTrigger>
            <DialogContent
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleJoinList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  {joinListError && (
                    <Alert variant="error">{joinListError}</Alert>
                  )}
                  <label className="flex flex-col gap-1">
                    <span>{t("taskList.shareCode")}</span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => {
                        setJoinListInput(e.target.value);
                        setJoinListError(null);
                      }}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                    />
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      disabled={joiningList}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!joinListInput.trim() || joiningList}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark"
                  >
                    {joiningList ? t("app.joining") : t("app.join")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
