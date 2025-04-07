import { useRouter } from "next/router";

import { GlobalStateProvider, useGlobalState } from "globalstate/react";
import { AuthWorker, PollingWorker } from "worker";
import { App } from "components/App";
import { NavigationProvider } from "navigation/react";
import { createInitialState, routes } from "config";

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
export default function AppPage() {
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
