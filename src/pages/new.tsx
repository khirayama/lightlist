import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";

import { GlobalStateProvider, useGlobalState } from "globalstate/react";
import { AuthWorker, PollingWorker } from "worker";

import { App } from "components/App";
import { NavigationProvider } from "navigation/react";

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
  email: string;
};

type Preferences = {
  lang: "EN" | "JA";
  theme: "SYSTEM" | "LIGHT" | "DARK";
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

function createInitialState(): GlobalState {
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

function Loading() {
  return (
    <div className="bg-primary flex h-full w-full items-center justify-center">
      Loading...
    </div>
  );
}

function Content() {
  const [
    {
      auth,
      app,
      profile,
      preferences,
      taskLists,
      isInitialized: {
        app: isAppInitialized,
        preferences: isPreferencesInitialized,
        profile: isProfileInitialized,
        taskLists: isTaskListsInitialized,
      },
    },
  ] = useGlobalState();

  return (
    <>
      <PollingWorker />
      {isAppInitialized &&
      isPreferencesInitialized &&
      isTaskListsInitialized &&
      isProfileInitialized ? (
        <App
          auth={auth}
          app={app}
          preferences={preferences}
          profile={profile}
          taskLists={taskLists}
        />
      ) : (
        <Loading />
      )}
    </>
  );
}

function AuthContent() {
  const router = useRouter();

  const [
    {
      auth: { session },
      isInitialized: { auth: isInitialized },
    },
    ,
  ] = useGlobalState();
  const isLoggedIn = !!session;

  if (isInitialized && !isLoggedIn) {
    router.push("/login");
    return null;
  }

  return (
    <>
      <AuthWorker />
      {isInitialized && isLoggedIn ? <Content /> : <Loading />}
    </>
  );
}

export default function AppV2Page() {
  // Define your route definitions.
  const routes = {
    "/home": { props: {} },
    "/profile/:userId": { props: { userId: "string" } },
    // Add more routes as needed.
  };

  return (
    <NavigationProvider initialPath="/home" routes={routes}>
      <GlobalStateProvider<GlobalState>
        initialGlobalState={createInitialState()}
      >
        <AuthContent />
      </GlobalStateProvider>
    </NavigationProvider>
  );
}
