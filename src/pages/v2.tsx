import { useRouter } from "next/router";

import { useAuth, AuthProvider } from "v2/common/auth";
import { App } from "v2/components/app/App";
import { GlobalStateProvider } from "v2/hooks/ui/useGlobalState";
import { AppPageStackProvider } from "v2/hooks/ui/useAppNavigation";
import { useApp } from "v2/hooks/app/useApp";
import { usePreferences } from "v2/hooks/app/usePreferences";
import { useTaskLists } from "v2/hooks/app/useTaskLists";

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
    <div className="bg flex h-full w-full items-center justify-center">
      Loading...
    </div>
  );
}

export default function AppV2Page() {
  return (
    <AuthProvider>
      <AppPageStackProvider>
        <GlobalStateProvider>
          <Content />
        </GlobalStateProvider>
      </AppPageStackProvider>
    </AuthProvider>
  );
}
