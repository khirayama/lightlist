import { useEffect } from "react";

import { useApp } from "v2/hooks/useApp";

export function useActiveStatus() {
  const [, { updateApp }] = useApp();

  useEffect(() => {
    const handleVisibilityChange = () => {
      updateApp({ online: document.visibilityState === "visible" });
    };

    handleVisibilityChange();
    window.addEventListener("beforeunload", () => updateApp({ online: false }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
