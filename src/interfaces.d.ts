type Query = { [key: string]: string | string[] | null };

type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type TaskList = {
  id: string;
  name: string;
  taskIds: string[];
  shareCode: string;
};

type App = {
  taskInsertPosition: "BOTTOM" | "TOP";
  taskListIds: string[];
  online: boolean;
};

type Profile = {
  displayName: string;
  email: string;
};

type Preferences = {
  lang: "EN" | "JA";
  theme: "SYSTEM" | "LIGHT" | "DARK";
};

type FetchingStatus = {
  isInitialized: boolean;
  isLoading: boolean;
};

type State = {
  app: App;
  profile: Profile;
  preferences: Preferences;
  taskLists: {
    [id: string]: TaskList;
  };
  tasks: {
    [id: string]: Task;
  };
  fetching: {
    [key: string]: FetchingStatus;
  };
};
