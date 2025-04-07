type DeepPartial<T> = {
  [P in keyof T]?: T[P] | DeepPartial<T[P]>;
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type TaskList = {
  id: string;
  name: string;
  tasks: Task[];
  shareCode: string;
  update: Uint8Array;
};

type Auth = {
  session: Session;
};

type App = {
  taskInsertPosition: "BOTTOM" | "TOP";
  taskListIds: string[];
  update: Uint8Array;
};

type Profile = {
  displayName: string;
};

type Preferences = {
  lang: "EN" | "JA";
  theme: "SYSTEM" | "LIGHT" | "DARK";
  autoSort: boolean;
};

type GlobalState = {
  auth: Auth;
  app: App;
  profile: Profile;
  preferences: Preferences;
  taskLists: {
    [id: string]: TaskList;
  };
  isInitialized: {
    auth: boolean;
    app: boolean;
    profile: boolean;
    preferences: boolean;
    taskLists: boolean;
  };
};
