export const config = {
  appBaseUrl: "/app",
};

export function createInitialState(): GlobalState {
  return {
    auth: {
      session: null,
    },
    app: {
      taskInsertPosition: "BOTTOM",
      taskListIds: [],
      update: new Uint8Array(),
    },
    profile: {
      displayName: "",
    },
    preferences: {
      lang: "EN",
      theme: "SYSTEM",
      autoSort: false,
    },
    taskLists: {},
    isInitialized: {
      auth: false,
      app: false,
      profile: false,
      preferences: false,
      taskLists: false,
    },
  };
}

export const routes: {
  [path: string]: {
    isDrawerOpen: boolean;
    isSharingSheetOpen: boolean;
    isDatePickerSheetOpen: boolean;
  };
} = {
  "/home": {
    isDrawerOpen: false,
    isSharingSheetOpen: false,
    isDatePickerSheetOpen: false,
  },
  "/menu": {
    isDrawerOpen: true,
    isSharingSheetOpen: false,
    isDatePickerSheetOpen: false,
  },
  "/settings": {
    isDrawerOpen: false,
    isSharingSheetOpen: false,
    isDatePickerSheetOpen: false,
  },
  "/sharing/:taskListId": {
    isDrawerOpen: false,
    isSharingSheetOpen: true,
    isDatePickerSheetOpen: false,
  },
  "/task-lists/:taskListId/tasks/:taskId/date": {
    isDrawerOpen: false,
    isSharingSheetOpen: false,
    isDatePickerSheetOpen: true,
  },
};
