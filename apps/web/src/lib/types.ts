export type Theme = "system" | "light" | "dark";

export type Language =
  | "ja"
  | "en"
  | "es"
  | "de"
  | "fr"
  | "ko"
  | "zh-CN"
  | "hi"
  | "ar"
  | "pt-BR"
  | "id";

export type TaskInsertPosition = "bottom" | "top";
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type DataLoadStatus = "idle" | "loading" | "ready" | "error";

export type User = {
  uid: string;
  email: string | null;
};

export type SettingsStore = {
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TaskListOrderStore = {
  [taskListId: string]: {
    order: number;
  };
} & {
  createdAt: number;
  updatedAt: number;
};

export type TaskListStoreTask = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  order: number;
};

export type TaskListStore = {
  id: string;
  name: string;
  tasks: {
    [taskId: string]: TaskListStoreTask;
  };
  history: string[];
  shareCode: string | null;
  background: string | null;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
};

// For App
// User, SettingsStore, TaskListOrderStore, TaskListStoreのデータを利用して、生成される
export type Settings = {
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
};

export type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

export type TaskList = {
  id: string;
  name: string;
  tasks: Task[];
  history: string[];
  shareCode: string | null;
  background: string | null;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
};

export type AppState = {
  user: User | null;
  authStatus: AuthStatus;
  settings: Settings | null;
  settingsStatus: DataLoadStatus;
  taskLists: TaskList[];
  taskListOrderStatus: DataLoadStatus;
  taskListOrderUpdatedAt: number | null;
  sharedTaskListsById: Record<string, TaskList>;
  startupError: string | null;
};
