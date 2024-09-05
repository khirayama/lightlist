import { useRouter } from "next/router";

import { useAuth, AuthProvider } from "v2/auth";
import { GlobalStateProvider } from "v2/globalState";
import { App } from "v2/components/App";

function Content() {
  const router = useRouter();
  const [{ isInitialized, isLoggedIn }] = useAuth();

  if (isInitialized && !isLoggedIn) {
    router.push("/login");
    return null;
  }

  return isInitialized ? <App /> : <div>Loading...</div>;
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
