import type { TFunction } from "i18next";
import type { Task, TaskList } from "@lightlist/sdk/types";
import type { Theme } from "../styles/theme";

export type AppScreenProps = {
  t: TFunction;
  theme: Theme;
  userEmail: string;
  taskLists: TaskList[];
  selectedTaskList: TaskList | null;
  selectedTaskListId: string | null;
  appErrorMessage: string | null;
  createListName: string;
  createListBackground: string | null;
  editListName: string;
  editListBackground: string | null;
  newTaskText: string;
  joinListInput: string;
  joinListError: string | null;
  isCreatingList: boolean;
  isSavingList: boolean;
  isDeletingList: boolean;
  isJoiningList: boolean;
  shareCode: string | null;
  shareErrorMessage: string | null;
  isGeneratingShareCode: boolean;
  isRemovingShareCode: boolean;
  onOpenSettings: () => void;
  onOpenShareCode: () => void;
  onSelectTaskList: (taskListId: string) => void;
  onChangeCreateListName: (value: string) => void;
  onChangeCreateListBackground: (color: string | null) => void;
  onChangeEditListName: (value: string) => void;
  onChangeEditListBackground: (color: string | null) => void;
  onChangeNewTaskText: (value: string) => void;
  onChangeJoinListInput: (value: string) => void;
  onClearJoinListError: () => void;
  onCreateList: () => Promise<boolean>;
  onSaveList: () => void | Promise<void>;
  onJoinList: () => Promise<boolean>;
  onConfirmDeleteList: () => void;
  onAddTask: () => void | Promise<void>;
  onToggleTask: (task: Task) => void | Promise<void>;
  onConfirmSignOut: () => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => void | Promise<void>;
  onReorderTask: (
    draggedTaskId: string,
    targetTaskId: string,
  ) => void | Promise<void>;
  onSortTasks: () => void | Promise<void>;
  onDeleteCompletedTasks: () => void | Promise<void>;
  onReorderTaskList: (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => void | Promise<void>;
  onGenerateShareCode: () => void | Promise<void>;
  onRemoveShareCode: () => void | Promise<void>;
};
