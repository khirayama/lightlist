import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { arrayMove } from "@dnd-kit/sortable";

import { useGlobalState } from "v2/libs/globalState";
import {
  getTaskLists,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  refreshShareCode,
  type Res,
} from "v2/common/services";
import { useApp } from "v2/hooks/useApp";

const docs: { [taskListId: string]: Y.Doc } = {};

const fetchStatus = {
  intervalId: null,
  isInitialized: false,
  isLoading: false,
};

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
    moveTask: (
      taskListId: string,
      fromIndex: number,
      toIndex: number,
    ) => [TaskListV2, Res<TaskListV2>];
    deleteTask: (taskListId: string, taskId: string) => Res<TaskListV2>;
    sortTasks: (taskListId: string) => [TaskListV2, Res<TaskListV2>];
    clearCompletedTasks: (taskListId: string) => [TaskListV2, Res<TaskListV2>];
    refreshShareCode: (shareCode: string) => void;
  },
  {
    getTaskById: (taskId: string) => [TaskV2, TaskListV2];
    getTaskListById: (taskListId: string) => TaskListV2;
  },
] {
  const [, setGlobalState, getGlobalStateSnapshot] = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [, { insertTaskListId, deleteTaskListId }] = useApp();

  const snapshot = getGlobalStateSnapshot();

  useEffect(() => {
    const fetch = () => {
      fetchStatus.isLoading = true;
      setIsLoading(fetchStatus.isLoading);
      getTaskLists()
        .then((res) => {
          fetchStatus.isInitialized = true;
          setIsInitialized(fetchStatus.isInitialized);
          fetchStatus.isLoading = false;
          setIsLoading(fetchStatus.isLoading);
          const taskLists = {};
          Object.values(res.data.taskLists).forEach((tl: TaskListV2) => {
            if (!docs[tl.id]) {
              const d = new Y.Doc();
              docs[tl.id] = d;
            }
            const doc = docs[tl.id];
            const u = Uint8Array.from(Object.values(tl.update));
            if (u.length) {
              Y.applyUpdate(doc, u);
            }
            taskLists[tl.id] = {
              ...(docs[tl.id].getMap(tl.id).toJSON() as TaskListV2),
              shareCode: tl.shareCode,
            };
          });
          setGlobalState({ taskLists });
        })
        .finally(() => {
          fetchStatus.isLoading = false;
          setIsLoading(fetchStatus.isLoading);
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

    const doc = docs[taskListId];
    const taskList = doc.getMap(taskListId);
    const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
    tasks.insert(idx, [task]);

    const tl = taskList.toJSON() as TaskListV2;
    tl.update = Y.encodeStateAsUpdate(doc);
    setGlobalState({ taskLists: { [tl.id]: tl } });
    const f = () => {
      fetchStatus.isLoading = true;
      setIsLoading(fetchStatus.isLoading);
      return updateTaskList(tl).finally(() => {
        fetchStatus.isLoading = false;
        setIsLoading(fetchStatus.isLoading);
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
    docs[id] = doc;

    const taskList = doc.getMap(id);
    taskList.set("id", id);
    taskList.set("name", newTaskList.name);
    const tasks = new Y.Array();
    taskList.set("tasks", tasks);

    const tl = taskList.toJSON() as TaskListV2;
    tl.update = Y.encodeStateAsUpdate(doc);
    insertTaskListId(idx, id);
    setGlobalState({
      taskLists: { [tl.id]: tl },
    });
    const f = () => {
      fetchStatus.isLoading = true;
      setIsLoading(fetchStatus.isLoading);
      return createTaskList(tl).finally(() => {
        fetchStatus.isLoading = false;
        setIsLoading(fetchStatus.isLoading);
      });
    };
    return [tl, f()];
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
      appendTaskList: (newTaskList) => {
        const app = getGlobalStateSnapshot().app;
        return insertTaskList(app.taskListIds.length, newTaskList);
      },
      updateTaskList: (newTaskList) => {
        const doc = docs[newTaskList.id];
        const taskList = doc.getMap(newTaskList.id);
        taskList.set("name", newTaskList.name);

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const ss = getGlobalStateSnapshot();
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        return [ss.taskLists[tl.id], f()];
      },
      deleteTaskList: (taskListId) => {
        delete docs[taskListId];
        deleteTaskListId(taskListId);
        setGlobalState({
          taskLists: { [taskListId]: undefined },
        });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return deleteTaskList(taskListId).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        return f();
      },
      insertTask,
      prependTask: (taskListId, newTask) => {
        return insertTask(taskListId, 0, newTask);
      },
      appendTask: (taskListId, newTask) => {
        const doc = docs[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        return insertTask(taskListId, tasks.length, newTask);
      },
      updateTask: (taskListId, newTask) => {
        const doc = docs[taskListId];
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
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.taskLists[tl.id], f()];
      },
      moveTask: (taskListId, fromIndex, toIndex) => {
        const doc = docs[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        tasks.doc.transact(() => {
          const sortedTasks = arrayMove(tasks.toJSON(), fromIndex, toIndex);
          for (let i = sortedTasks.length - 1; i >= 0; i--) {
            for (let j = 0; j < tasks.length; j++) {
              const task = tasks.get(j);
              if (task.get("id") === sortedTasks[i].id) {
                const t = task.clone();
                tasks.delete(j);
                tasks.insert(0, [t]);
                break;
              }
            }
          }
        });

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        const ss = getGlobalStateSnapshot();
        return [ss.taskLists[tl.id], f()];
      },
      deleteTask: (taskListId, taskId) => {
        const doc = docs[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        tasks.delete(
          Array.from(tasks).findIndex((t) => t.get("id") === taskId),
        );

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        return f();
      },
      sortTasks: (taskListId) => {
        const doc = docs[taskListId];
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
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };
        return [tl, f()];
      },
      clearCompletedTasks: (taskListId) => {
        const doc = docs[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        tasks.doc.transact(() => {
          for (let i = tasks.length - 1; i >= 0; i--) {
            const task = tasks.get(i);
            if (task.get("completed")) {
              tasks.delete(i);
            }
          }
        });

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          fetchStatus.isLoading = true;
          setIsLoading(fetchStatus.isLoading);
          return updateTaskList(tl).finally(() => {
            fetchStatus.isLoading = false;
            setIsLoading(fetchStatus.isLoading);
          });
        };

        return [tl, f()];
      },
      refreshShareCode: (shareCode) => {
        refreshShareCode(shareCode).then((res) => {
          const taskListId = res.data.shareCode.taskListId;
          const newShareCode = res.data.shareCode.code;
          setGlobalState({
            taskLists: { [taskListId]: { shareCode: newShareCode } },
          });
        });
      },
    },
    {
      getTaskById: (taskId) => {
        const ss = getGlobalStateSnapshot();
        const taskList: TaskListV2 = Object.values(ss.taskLists).find(
          (tl: TaskListV2) => tl.tasks.some((t) => t.id === taskId),
        ) as TaskListV2;
        if (!taskList) {
          return [null, null];
        }
        const task = taskList.tasks.find((t) => t.id === taskId);
        return [task, taskList];
      },
      getTaskListById: (taskListId) => {
        return getGlobalStateSnapshot().taskLists[taskListId];
      },
    },
  ];
}
