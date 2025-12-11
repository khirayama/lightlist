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
    <div ref={setNodeRef} style={style}>
      <button {...attributes} {...listeners} title={dragHintLabel}>
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      </button>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
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
        />
      ) : (
        <button type="button" onClick={() => onEditStart(task)}>
          {task.text}
        </button>
      )}

      <button onClick={() => onDelete(task.id)}>{deleteLabel}</button>
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
      <p>{emptyLabel}</p>
    ) : (
      <div>
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
      <div>
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
        />
        {historyListId ? (
          <datalist id={historyListId}>
            {historySuggestions?.map((text) => (
              <option key={text} value={text} />
            ))}
          </datalist>
        ) : null}
        <button onClick={onAddTask} disabled={isAddDisabled}>
          {addButtonLabel}
        </button>
      </div>
      {addError ? <Alert variant="error">{addError}</Alert> : null}
    </>
  );

  if (variant === "card") {
    return (
      <div>
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

      <div>{inputSection}</div>
    </>
  );
}
