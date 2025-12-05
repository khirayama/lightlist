import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
  closestCenter,
} from "@dnd-kit/core";
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
      className={`rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.35)] transition-all p-4 flex items-center gap-3 ${
        isDragging
          ? "opacity-60 scale-[0.99]"
          : "hover:shadow-[0_24px_70px_rgba(15,23,42,0.35)]"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg bg-white/50 dark:bg-white/10 border border-white/30"
        title={dragHintLabel}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      </button>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        className="w-5 h-5 rounded border border-white/40 bg-white/60 dark:bg-white/10 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
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
          className="flex-1 px-4 py-2 rounded-xl border border-cyan-300/60 bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      ) : (
        <span
          className={`flex-1 cursor-pointer px-3 py-2 rounded-lg transition-colors ${
            task.completed
              ? "line-through text-slate-400"
              : "text-slate-900 dark:text-white"
          } ${task.completed ? "" : "hover:bg-white/60 dark:hover:bg-white/10"}`}
          onClick={() => onEditStart(task)}
        >
          {task.text}
        </span>
      )}

      <button
        onClick={() => onDelete(task.id)}
        className="px-3 py-2 text-sm rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-white font-semibold shadow-[0_14px_35px_rgba(251,113,133,0.28)] hover:opacity-90 transition-opacity"
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
  addDisabled?: boolean;
  inputDisabled?: boolean;
  addError?: string | null;
  variant?: "split" | "card";
}

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
      <p className="text-slate-500 dark:text-slate-300 text-center py-10 tracking-tight">
        {emptyLabel}
      </p>
    ) : (
      <div className="space-y-3">
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

  const inputSection = (
    <>
      <div className="flex gap-2">
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
          className="flex-1 px-4 py-3 rounded-xl bg-white/85 dark:bg-white/10 border border-white/60 dark:border-white/10 text-slate-900 dark:text-white shadow-[0_18px_60px_rgba(15,23,42,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-60 placeholder:text-slate-400"
        />
        {historyListId ? (
          <datalist id={historyListId}>
            {historySuggestions?.map((text) => (
              <option key={text} value={text} />
            ))}
          </datalist>
        ) : null}
        <button
          onClick={onAddTask}
          disabled={isAddDisabled}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400 text-white font-semibold shadow-[0_18px_60px_rgba(56,189,248,0.35)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addButtonLabel}
        </button>
      </div>
      {addError ? (
        <Alert variant="error" className="mt-4">
          {addError}
        </Alert>
      ) : null}
    </>
  );

  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-2xl shadow-[0_24px_90px_rgba(15,23,42,0.32)] p-6 mb-6">
        {inputSection}
        <div className="mt-6">
          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={strategyValue}
            >
              {listContent}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={strategyValue}
        >
          <div className="space-y-3 mb-6">{listContent}</div>
        </SortableContext>
      </DndContext>

      <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 backdrop-blur-2xl shadow-[0_24px_90px_rgba(15,23,42,0.32)] p-5 mb-10">
        {inputSection}
      </div>
    </>
  );
}
