type TaskV2 = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type TaskListV2 = {
  id: string;
  name: string;
  tasks: TaskV2[];
  shareCode: string;
  update: Uint8Array;
};

type AppV2 = {
  taskInsertPosition: "BOTTOM" | "TOP";
  taskListIds: string[];
  online: boolean;
};

type ProfileV2 = {
  displayName: string;
  email: string;
};

type PreferencesV2 = {
  lang: "EN" | "JA";
  theme: "SYSTEM" | "LIGHT" | "DARK";
};

type GlobalStateV2 = {
  app: AppV2;
  profile: ProfileV2;
  preferences: PreferencesV2;
  taskLists: {
    [id: string]: TaskListV2;
  };
};
