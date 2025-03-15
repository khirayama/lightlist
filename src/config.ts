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
      email: "",
    },
    preferences: {
      lang: "EN",
      theme: "SYSTEM",
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
