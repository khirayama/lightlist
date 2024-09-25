import { useEffect, useState } from "react";
import * as Y from "yjs";

import { useGlobalState } from "v2/hooks/ui/useGlobalState";
import { getApp, updateApp, type Res } from "v2/common/services";

let doc: Y.Doc = null;

const fetchStatus = {
  intervalId: null,
  isInitialized: false,
  isLoading: false,
};

export function useApp(): [
  {
    data: AppV2;
    isInitialized: boolean;
    isLoading: boolean;
  },
  {
    insertTaskListId: (idx: number, taskListId: string) => [AppV2, Res<AppV2>];
    deleteTaskListId: (taskListId: string) => [AppV2, Res<AppV2>];
    // moveTaskListId: (idx: number, taskListId: string) => [AppV2, Res<AppV2>];
    updateApp: (newApp: Partial<AppV2>) => [AppV2, Res<AppV2>];
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
      getApp().then((res) => {
        fetchStatus.isInitialized = true;
        setIsInitialized(fetchStatus.isInitialized);
        fetchStatus.isLoading = false;
        setIsLoading(fetchStatus.isLoading);

        const app = res.data;
        if (!doc) {
          doc = new Y.Doc();
        }
        const u = Uint8Array.from(Object.values(app.update));
        if (u.length) {
          Y.applyUpdate(doc, u);
        }
        const na = {
          ...doc.getMap("app").toJSON(),
          update: new Uint8Array(),
        } as AppV2;
        setGlobalState({ app: na });
      });
    };

    if (!fetchStatus.isInitialized) {
      fetch();
      if (!fetchStatus.intervalId) {
        fetchStatus.intervalId = setInterval(() => {
          fetch();
        }, 3000);
      }
    }
  }, []);

  const insertTaskListId = (
    idx: number,
    taskListId: string,
  ): [AppV2, Res<AppV2>] => {
    const ad = doc.getMap("app");
    const taskListIds = ad.get("taskListIds") as Y.Array<string>;
    taskListIds.insert(idx, [taskListId]);
    const na = { ...ad.toJSON(), update: Y.encodeStateAsUpdate(doc) };
    setGlobalState({ app: na });
    const f = () => {
      fetchStatus.isLoading = true;
      setIsLoading(fetchStatus.isLoading);
      return updateApp(na).finally(() => {
        fetchStatus.isLoading = false;
        setIsLoading(fetchStatus.isLoading);
      });
    };
    const ss = getGlobalStateSnapshot();
    return [ss.app, f()];
  };

  return [
    {
      data: snapshot.app,
      isLoading,
      isInitialized,
    },
    {
      insertTaskListId,
      deleteTaskListId: (taskListId) => {
        const ad = doc.getMap("app");
        const taskListIds = ad.get("taskListIds") as Y.Array<string>;
        taskListIds.delete(taskListIds.toJSON().indexOf(taskListId));
        const na = { ...ad.toJSON(), update: Y.encodeStateAsUpdate(doc) };
        setGlobalState({ app: na });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateApp(na).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.app, f()];
      },
      updateApp: (newApp) => {
        const ad = doc.getMap("app");
        const tmp = { ...ad.toJSON(), ...newApp };
        ad.set("taskInsertPosition", tmp.taskInsertPosition);
        ad.set("online", tmp.online);
        const na = { ...ad.toJSON(), update: Y.encodeStateAsUpdate(doc) };
        setGlobalState({ app: na });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateApp(na).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.app, f()];
      },
    },
  ];
}
