import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  SensorDescriptor,
  SensorOptions,
  closestCenter,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  SortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Alert } from "@/components/ui/Alert";

export interface TaskForSortable {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  order?: number;
}

interface TaskItemProps<T extends TaskForSortable = TaskForSortable> {
  task: T;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: T) => void;
  onEditEnd: (task: T) => void;
  onToggle: (task: T) => void;
  onDelete: (taskId: string) => void;
  deleteLabel: string;
  dragHintLabel: string;
}

function TaskItem<T extends TaskForSortable = TaskForSortable>({
  task,
  isEditing,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDelete,
  deleteLabel,
  dragHintLabel,
}: TaskItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="mt-0.5 rounded-lg p-1 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      </button>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
      />

      {isEditing ? (
        <input
          type="text"
          value={editingText}
          onChange={(e) => onEditingTextChange(e.target.value)}
          onBlur={() => onEditEnd(task)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditEnd(task);
            if (e.key === "Escape") {
              onEditingTextChange(task.text);
            }
          }}
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
        />
      ) : (
        <button
          type="button"
          onClick={() => onEditStart(task)}
          className={
            task.completed
              ? "min-w-0 flex-1 text-left text-sm font-medium text-gray-600 line-through underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-400 dark:focus-visible:outline-gray-500"
              : "min-w-0 flex-1 text-left text-sm font-medium text-gray-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-50 dark:focus-visible:outline-gray-500"
          }
        >
          {task.text}
        </button>
      )}

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="rounded-lg px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50 hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 dark:text-red-300 dark:hover:bg-red-950/30 dark:hover:text-red-200 dark:focus-visible:outline-red-700"
      >
        {deleteLabel}
      </button>
    </div>
  );
}

export type SortableTask = TaskForSortable;

export interface TaskListPanelProps<T extends SortableTask = SortableTask> {
  tasks: T[];
  sensors: SensorDescriptor<SensorOptions>[];
  collisionDetection?: CollisionDetection;
  strategy?: SortingStrategy;
  editingTaskId: string | null;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: T) => void;
  onEditEnd: (task: T) => void;
  onToggle: (task: T) => void;
  onDelete: (taskId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  newTaskText: string;
  onNewTaskTextChange: (text: string) => void;
  onAddTask: () => void;
  addButtonLabel: string;
  addPlaceholder: string;
  deleteLabel: string;
  dragHintLabel: string;
  emptyLabel: string;
  historySuggestions?: string[];
  onSortingChange?: (sorting: boolean) => void;
  addDisabled?: boolean;
  inputDisabled?: boolean;
  addError?: string | null;
  variant?: "split" | "card";
}

type SortableData = {
  sortable: {
    containerId: UniqueIdentifier;
    items: UniqueIdentifier[];
    index: number;
  };
};

const hasSortableData = (data: unknown): data is SortableData => {
  if (!data || typeof data !== "object") return false;
  const sortable = (data as { sortable?: unknown }).sortable;
  return Boolean(sortable && typeof sortable === "object");
};

export function TaskListPanel<T extends SortableTask = SortableTask>({
  tasks,
  sensors,
  collisionDetection,
  strategy,
  editingTaskId,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDelete,
  onDragEnd,
  newTaskText,
  onNewTaskTextChange,
  onAddTask,
  addButtonLabel,
  addPlaceholder,
  deleteLabel,
  dragHintLabel,
  emptyLabel,
  historySuggestions,
  onSortingChange,
  addDisabled = false,
  inputDisabled = false,
  addError = null,
  variant = "split",
}: TaskListPanelProps<T>) {
  const collision = collisionDetection ?? closestCenter;
  const strategyValue = strategy ?? verticalListSortingStrategy;
  const isAddDisabled =
    addDisabled || inputDisabled || newTaskText.trim() === "";
  const historyListId =
    historySuggestions && historySuggestions.length > 0
      ? "task-history-list"
      : undefined;

  const listContent =
    tasks.length === 0 ? (
      <p className="text-sm text-gray-600 dark:text-gray-300">{emptyLabel}</p>
    ) : (
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isEditing={editingTaskId === task.id}
            editingText={editingText}
            onEditingTextChange={onEditingTextChange}
            onEditStart={onEditStart}
            onEditEnd={onEditEnd}
            onToggle={onToggle}
            onDelete={onDelete}
            deleteLabel={deleteLabel}
            dragHintLabel={dragHintLabel}
          />
        ))}
      </div>
    );

  const handleSortingChange = (sorting: boolean) => {
    onSortingChange?.(sorting);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (hasSortableData(data)) {
      handleSortingChange(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    handleSortingChange(false);
    onDragEnd(event);
  };

  const handleDragCancel = () => {
    handleSortingChange(false);
  };

  const inputSection = (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          list={historyListId}
          value={newTaskText}
          onChange={(e) => onNewTaskTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddTask();
            }
          }}
          placeholder={addPlaceholder}
          disabled={inputDisabled}
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-800"
        />
        {historyListId ? (
          <datalist id={historyListId}>
            {historySuggestions?.map((text) => (
              <option key={text} value={text} />
            ))}
          </datalist>
        ) : null}
        <button
          type="button"
          onClick={onAddTask}
          disabled={isAddDisabled}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-200"
        >
          {addButtonLabel}
        </button>
      </div>
      {addError ? <Alert variant="error">{addError}</Alert> : null}
    </>
  );

  if (variant === "card") {
    return (
      <div className="flex flex-col gap-4">
        {inputSection}
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={strategyValue}
          >
            {listContent}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={strategyValue}
        >
          <div>{listContent}</div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/30">
        {inputSection}
      </div>
    </>
  );
}
