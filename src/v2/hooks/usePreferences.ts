import { useEffect, useState } from "react";

import { useGlobalState } from "v2/libs/globalState";
import {
  getPreferences,
  updatePreferences,
  type Res,
} from "v2/common/services";

const fetchStatus = {
  intervalId: null,
  isInitialized: false,
  isLoading: false,
};

export function usePreferences(): [
  {
    data: PreferencesV2;
    isInitialized: boolean;
    isLoading: boolean;
  },
  {
    updatePreferences: (
      newPreferences: Partial<PreferencesV2>,
    ) => [PreferencesV2, Res<PreferencesV2>];
  },
] {
  const [, setGlobalState, getGlobalStateSnapshot] = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const snapshot = getGlobalStateSnapshot();

  useEffect(() => {
    const fetch = () => {
      fetchStatus.isLoading = true;
      setIsLoading(fetchStatus.isLoading);
      getPreferences().then((res) => {
        fetchStatus.isInitialized = true;
        setIsInitialized(fetchStatus.isInitialized);
        fetchStatus.isLoading = false;
        setIsLoading(fetchStatus.isLoading);

        const preferences = res.data.preferences;
        setGlobalState({ preferences });
      });
    };

    if (!fetchStatus.isInitialized) {
      fetch();
      if (!fetchStatus.intervalId) {
        fetchStatus.intervalId = setInterval(() => {
          fetch();
        }, 10000);
      }
    }

    window.document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        fetchStatus.intervalId = null;
        clearInterval(fetchStatus.intervalId);
      } else {
        fetch();
        if (!fetchStatus.intervalId) {
          fetchStatus.intervalId = setInterval(() => {
            fetch();
          }, 10000);
        }
      }
    });

    return () => {
      fetchStatus.intervalId = null;
      clearInterval(fetchStatus.intervalId);
    };
  }, []);

  return [
    {
      data: snapshot.preferences,
      isLoading,
      isInitialized,
    },
    {
      updatePreferences: (newPreferences) => {
        const np = {
          ...snapshot.preferences,
          ...newPreferences,
        };
        setGlobalState({
          preferences: np,
        });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updatePreferences(np).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.preferences, f()];
      },
    },
  ];
}
