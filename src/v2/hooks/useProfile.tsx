import { useEffect, useState } from "react";

import { useGlobalState } from "v2/libs/globalState";
import { getProfile, updateProfile, type Res } from "v2/common/services";

const fetchStatus = {
  intervalId: null,
  isInitialized: false,
  isLoading: false,
};

export function useProfile(): [
  {
    data: ProfileV2;
    isInitialized: boolean;
    isLoading: boolean;
  },
  {
    updateProfile: (
      newProfile: Partial<ProfileV2>,
    ) => [ProfileV2, Res<ProfileV2>];
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
      getProfile().then((res) => {
        fetchStatus.isInitialized = true;
        setIsInitialized(fetchStatus.isInitialized);
        fetchStatus.isLoading = false;
        setIsLoading(fetchStatus.isLoading);

        const profile = res.data.profile;
        setGlobalState({ profile });
      });
    };

    if (!fetchStatus.isInitialized) {
      fetch();
      if (!fetchStatus.intervalId) {
        fetchStatus.intervalId = setInterval(() => {
          fetch();
        }, 5000);
      }
    }
  }, []);

  return [
    {
      data: snapshot.profile,
      isLoading,
      isInitialized,
    },
    {
      updateProfile: (newProfile) => {
        const np = {
          ...snapshot.profile,
          ...newProfile,
        };
        setGlobalState({
          profile: np,
        });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateProfile(np).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.profile, f()];
      },
    },
  ];
}
