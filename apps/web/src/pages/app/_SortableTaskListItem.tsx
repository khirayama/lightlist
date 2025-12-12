import { TaskList } from "@lightlist/sdk/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";

interface SortableTaskListItemProps {
  taskList: TaskList;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
  taskCountLabel: string;
  isActive: boolean;
}

export function SortableTaskListItem({
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
        isActive ? "bg-gray-100 dark:bg-gray-800" : "bg-transparent",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        type="button"
        className="flex items-center"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      </button>
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-[6px] border border-[#cccccc]"
        style={{ backgroundColor: taskList.background }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="flex flex-col items-start gap-0.5 text-left"
      >
        <span className={clsx(isActive ? "font-bold" : "font-medium")}>
          {taskList.name}
        </span>
        <span className="text-xs text-gray-600">{taskCountLabel}</span>
      </button>
    </div>
  );
}

export default SortableTaskListItem;
