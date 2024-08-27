import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";

import { useGlobalState } from "v2/globalState";
import {
  getApp,
  updateApp,
  getTaskLists,
  updateTaskList,
  deleteTaskList,
  type Res,
} from "v2/api";

const docs: { app: Y.Doc; taskLists: { [taskListId: string]: Y.Doc } } = {
  app: null,
  taskLists: {},
};

const fetchStatus = {
  app: {
    intervalId: null,
    isInitialized: false,
    isLoading: false,
  },
  taskLists: {
    intervalId: null,
    isInitialized: false,
    isLoading: false,
  },
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
      fetchStatus.app.isLoading = true;
      setIsLoading(fetchStatus.app.isLoading);
      getApp().then((res) => {
        fetchStatus.app.isInitialized = true;
        setIsInitialized(fetchStatus.app.isInitialized);
        fetchStatus.app.isLoading = false;
        setIsLoading(fetchStatus.app.isLoading);

        const app = res.data;
        if (!docs.app) {
          docs.app = new Y.Doc();
        }
        const doc = docs.app;
        const u = Uint8Array.from(Object.values(app.update));
        if (!u.length) {
          const a = doc.getMap("app");
          a.set("taskInsertPosition", app.taskInsertPosition);
          a.set("taskListIds", new Y.Array());
          a.set("online", app.online);
        } else {
          Y.applyUpdate(doc, u);
        }
        setGlobalState({ app: doc.getMap("app").toJSON() as AppV2 });
      });
    };

    if (!fetchStatus.app.isInitialized) {
      fetch();
      if (!fetchStatus.app.intervalId) {
        fetchStatus.app.intervalId = setInterval(() => {
          fetch();
        }, 1000);
      }
    }
  }, []);

  const insertTaskListId = (
    idx: number,
    taskListId: string,
  ): [AppV2, Res<AppV2>] => {
    const ad = docs.app.getMap("app");
    const taskListIds = ad.get("taskListIds") as Y.Array<string>;
    taskListIds.insert(idx, [taskListId]);
    const na = { ...ad.toJSON(), update: Y.encodeStateAsUpdate(docs.app) };
    setGlobalState({ app: na });
    const f = () => {
      fetchStatus.app.isLoading = true;
      setIsLoading(fetchStatus.app.isLoading);
      return updateApp(na).finally(() => {
        fetchStatus.app.isLoading = false;
        setIsLoading(fetchStatus.app.isLoading);
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
        const ad = docs.app.getMap("app");
        const taskListIds = ad.get("taskListIds") as Y.Array<string>;
        taskListIds.delete(taskListIds.toJSON().indexOf(taskListId));
        const na = { ...snapshot.app, update: Y.encodeStateAsUpdate(docs.app) };
        setGlobalState({ app: na });
        const f = () => {
          fetchStatus.app.isLoading = true;
          setIsLoading(fetchStatus.app.isLoading);
          return updateApp(na).finally(() => {
            fetchStatus.app.isLoading = false;
            setIsLoading(fetchStatus.app.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.app, f()];
      },
      updateApp: (newApp) => {
        const doc = docs.app;
        const ad = doc.getMap("app");
        const tmp = { ...ad.toJSON(), ...newApp };
        ad.set("taskInsertPosition", tmp.taskInsertPosition);
        ad.set("online", tmp.online);
        const na = { ...ad.toJSON(), update: Y.encodeStateAsUpdate(doc) };
        setGlobalState({ app: na });
        const f = () => {
          fetchStatus.app.isLoading = true;
          setIsLoading(fetchStatus.app.isLoading);
          return updateApp(na).finally(() => {
            fetchStatus.app.isLoading = false;
            setIsLoading(fetchStatus.app.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.app, f()];
      },
    },
  ];
}

export function useTaskLists(taskListIds: string[] = []): [
  {
    data: TaskListV2[];
    isInitialized: boolean;
    isLoading: boolean;
  },
  {
    insertTaskList: (
      idx: number,
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    prependTaskList: (
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    appendTaskList: (
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    updateTaskList: (
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    deleteTaskList: (taskListId: string) => Res<void>;
    insertTask: (
      taskListId: string,
      idx: number,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    prependTask: (
      taskListId: string,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    appendTask: (
      taskListId: string,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    updateTask: (
      taskListId: string,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Res<TaskListV2>];
    // moveTask: (idx: number, taskId: string) => [TaskListV2, Res<TaskListV2>];
    deleteTask: (taskListId: string, taskId: string) => Res<TaskListV2>;
    sortTasks: (taskListId: string) => [TaskListV2, Res<TaskListV2>];
  },
] {
  const [, setGlobalState, getGlobalStateSnapshot] = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [, { insertTaskListId, deleteTaskListId }] = useApp();

  const snapshot = getGlobalStateSnapshot();

  useEffect(() => {
    const fetch = () => {
      fetchStatus.taskLists.isLoading = true;
      setIsLoading(fetchStatus.taskLists.isLoading);
      getTaskLists()
        .then((res) => {
          fetchStatus.taskLists.isInitialized = true;
          setIsInitialized(fetchStatus.taskLists.isInitialized);
          fetchStatus.taskLists.isLoading = false;
          setIsLoading(fetchStatus.taskLists.isLoading);
          const taskLists = {};
          Object.values(res.data).forEach((tl: TaskListV2) => {
            if (!docs.taskLists[tl.id]) {
              const d = new Y.Doc();
              docs.taskLists[tl.id] = d;
            }
            const doc = docs.taskLists[tl.id];
            const u = Uint8Array.from(Object.values(tl.update));
            if (u.length) {
              Y.applyUpdate(doc, u);
            }
            taskLists[tl.id] = docs.taskLists[tl.id]
              .getMap(tl.id)
              .toJSON() as TaskListV2;
          });
          setGlobalState({ taskLists });
        })
        .finally(() => {
          fetchStatus.taskLists.isLoading = false;
          setIsLoading(fetchStatus.taskLists.isLoading);
        });
    };

    if (!fetchStatus.taskLists.isInitialized) {
      fetch();
      if (!fetchStatus.taskLists.intervalId) {
        fetchStatus.taskLists.intervalId = setInterval(() => {
          fetch();
        }, 1000);
      }
    }
  }, []);

  const insertTask = (
    taskListId: string,
    idx: number,
    newTask: Partial<TaskV2>,
  ): [TaskListV2, Res<TaskListV2>] => {
    const id = uuid();

    const task = new Y.Map();
    task.set("id", id);
    task.set("text", newTask.text);
    task.set("completed", newTask.completed);
    task.set("date", newTask.date);

    const doc = docs.taskLists[taskListId];
    const taskList = doc.getMap(taskListId);
    const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
    tasks.insert(idx, [task]);

    const tl = taskList.toJSON() as TaskListV2;
    tl.update = Y.encodeStateAsUpdate(doc);
    setGlobalState({ taskLists: { [tl.id]: tl } });
    const f = () => {
      fetchStatus.taskLists.isLoading = true;
      setIsLoading(fetchStatus.taskLists.isLoading);
      return updateTaskList(tl).finally(() => {
        fetchStatus.taskLists.isLoading = false;
        setIsLoading(fetchStatus.taskLists.isLoading);
      });
    };
    const ss = getGlobalStateSnapshot();
    return [ss.taskLists[tl.id], f()];
  };

  const insertTaskList = (
    idx: number,
    newTaskList: Partial<TaskListV2>,
  ): [TaskListV2, Res<TaskListV2>] => {
    const id = uuid();
    const doc = new Y.Doc();
    docs.taskLists[id] = doc;

    const taskList = doc.getMap(id);
    taskList.set("id", id);
    taskList.set("name", newTaskList.name);
    const tasks = new Y.Array();
    taskList.set("tasks", tasks);

    const tl = taskList.toJSON() as TaskListV2;
    const ss = getGlobalStateSnapshot();
    tl.update = Y.encodeStateAsUpdate(doc);
    insertTaskListId(idx, id);
    setGlobalState({
      taskLists: { [tl.id]: tl },
    });
    const f = () => {
      fetchStatus.taskLists.isLoading = true;
      setIsLoading(fetchStatus.taskLists.isLoading);
      return updateTaskList(tl).finally(() => {
        fetchStatus.taskLists.isLoading = false;
        setIsLoading(fetchStatus.taskLists.isLoading);
      });
    };
    return [ss.taskLists[tl.id], f()];
  };

  return [
    {
      data: taskListIds
        .map((tlid) => snapshot.taskLists[tlid])
        .filter((x) => !!x),
      isLoading,
      isInitialized,
    },
    {
      insertTaskList,
      prependTaskList: (newTaskList) => {
        return insertTaskList(0, newTaskList);
      },
      appendTaskList: (newTaskList) => {
        const app = getGlobalStateSnapshot().app;
        return insertTaskList(app.taskListIds.length, newTaskList);
      },
      updateTaskList: (newTaskList) => {
        const doc = docs.taskLists[newTaskList.id];
        const taskList = doc.getMap(newTaskList.id);
        taskList.set("name", newTaskList.name);

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const ss = getGlobalStateSnapshot();
        const f = () => {
          fetchStatus.taskLists.isLoading = true;
          setIsLoading(fetchStatus.taskLists.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.taskLists.isLoading = false;
            setIsLoading(fetchStatus.taskLists.isLoading);
          });
        };
        return [ss.taskLists[tl.id], f()];
      },
      deleteTaskList: (taskListId) => {
        delete docs.taskLists[taskListId];
        deleteTaskListId(taskListId);
        setGlobalState({
          taskLists: { [taskListId]: undefined },
        });
        const f = () => {
          fetchStatus.taskLists.isLoading = true;
          setIsLoading(fetchStatus.taskLists.isLoading);
          return deleteTaskList(taskListId).finally(() => {
            fetchStatus.taskLists.isLoading = false;
            setIsLoading(fetchStatus.taskLists.isLoading);
          });
        };
        return f();
      },
      insertTask,
      prependTask: (taskListId, newTask) => {
        return insertTask(taskListId, 0, newTask);
      },
      appendTask: (taskListId, newTask) => {
        const doc = docs.taskLists[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        return insertTask(taskListId, tasks.length, newTask);
      },
      updateTask: (taskListId, newTask) => {
        const doc = docs.taskLists[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        const task = Array.from(tasks).find((t) => t.get("id") === newTask.id);
        task.set("text", newTask.text);
        task.set("completed", newTask.completed);
        task.set("date", newTask.date);

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          fetchStatus.taskLists.isLoading = true;
          setIsLoading(fetchStatus.taskLists.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.taskLists.isLoading = false;
            setIsLoading(fetchStatus.taskLists.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.taskLists[tl.id], f()];
      },
      deleteTask: (taskListId, taskId) => {
        const doc = docs.taskLists[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        tasks.delete(
          Array.from(tasks).findIndex((t) => t.get("id") === taskId),
        );

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          fetchStatus.taskLists.isLoading = true;
          setIsLoading(fetchStatus.taskLists.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.taskLists.isLoading = false;
            setIsLoading(fetchStatus.taskLists.isLoading);
          });
        };
        return f();
      },
      sortTasks: (taskListId) => {
        const doc = docs.taskLists[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        tasks.doc.transact(() => {
          const sortedTasks = tasks.toJSON().sort((a, b) => {
            if (a.completed && !b.completed) {
              return 1;
            }
            if (!a.completed && b.completed) {
              return -1;
            }
            if (!a.date && b.date) {
              return 1;
            }
            if (a.date && !b.date) {
              return -1;
            }
            if (a.date > b.date) {
              return 1;
            }
            if (a.date < b.date) {
              return -1;
            }
            return 0;
          });
          for (let i = sortedTasks.length - 1; i >= 0; i--) {
            for (let j = 0; j < tasks.length; j++) {
              const task = tasks.get(j);
              if (task.get("id") === sortedTasks[i].id) {
                if (j !== i) {
                  const t = task.clone();
                  tasks.delete(j);
                  tasks.insert(0, [t]);
                }
                break;
              }
            }
          }
        });

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          fetchStatus.taskLists.isLoading = true;
          setIsLoading(fetchStatus.taskLists.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.taskLists.isLoading = false;
            setIsLoading(fetchStatus.taskLists.isLoading);
          });
        };
        return [tl, f()];
      },
    },
  ];
}
