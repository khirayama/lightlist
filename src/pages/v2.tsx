import { useRouter } from "next/router";

import { GlobalStateProvider } from "v2/libs/globalState";
import { AppPageStackProvider } from "v2/libs/ui/navigation";
import { useAuth, AuthProvider } from "v2/common/auth";
import { config } from "v2/common/globalStateConfig";
import { useApp } from "v2/hooks/useApp";
import { usePreferences } from "v2/hooks/usePreferences";
import { useTaskLists } from "v2/hooks/useTaskLists";
import { useProfile } from "v2/hooks/useProfile";
import { App } from "v2/components/App";

function Loading() {
  return (
    <div className="bg flex h-full w-full items-center justify-center">
      Loading...
    </div>
  );
}

function AuthContent() {
  const router = useRouter();
  const [{ isInitialized, isLoggedIn }] = useAuth();

  if (isInitialized && !isLoggedIn) {
    router.push("/login");
    return null;
  }

  return isInitialized && isLoggedIn ? <Content /> : <Loading />;
}

function Content() {
  const [{ isInitialized: isAppInitialized }] = useApp();
  const [{ isInitialized: isPreferencesInitialized }] = usePreferences();
  const [{ isInitialized: isTaskListsInitialized }] = useTaskLists();
  const [{ isInitialized: isProfileInitialized }] = useProfile();

  return isAppInitialized &&
    isPreferencesInitialized &&
    isTaskListsInitialized &&
    isProfileInitialized ? (
    <App />
  ) : (
    <Loading />
  );
}

export default function AppV2Page() {
  return (
    <AuthProvider>
      <AppPageStackProvider>
        <GlobalStateProvider config={config}>
          <AuthContent />
        </GlobalStateProvider>
      </AppPageStackProvider>
    </AuthProvider>
  );
}
