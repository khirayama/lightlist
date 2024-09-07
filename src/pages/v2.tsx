import { useRouter } from "next/router";

import { useAuth, AuthProvider } from "v2/auth";
import { GlobalStateProvider } from "v2/globalState";
import { App } from "v2/components/App";
import { useApp } from "v2/hooks/useApp";
import { usePreferences } from "v2/hooks/usePreferences";
import { useTaskLists } from "v2/hooks/useTaskLists";

function Content() {
  const router = useRouter();
  const [{ isInitialized, isLoggedIn }] = useAuth();
  const [{ isInitialized: isAppInitialized }] = useApp();
  const [{ isInitialized: isPreferencesInitialized }] = usePreferences();
  const [{ isInitialized: isTaskListsInitialized }] = useTaskLists();

  if (isInitialized && !isLoggedIn) {
    router.push("/login");
    return null;
  }

  return isInitialized &&
    isAppInitialized &&
    isPreferencesInitialized &&
    isTaskListsInitialized ? (
    <App />
  ) : (
    <div>Loading...</div>
  );
}

export default function AppV2Page() {
  return (
    <AuthProvider>
      <GlobalStateProvider>
        <Content />
      </GlobalStateProvider>
    </AuthProvider>
  );
}
