import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";

import { useGlobalState, config } from "v2/globalState";

type Mock<T> = Promise<{ data: T }>;

function getMock<T>(fn: (gs: GlobalStateV2) => T) {
  return new Promise<{ data: T }>((resolve) => {
    setTimeout(
      () => {
        const gs =
          JSON.parse(window.localStorage.getItem("__tmp")) ||
          config.initialValue();
        resolve({ data: fn(gs) });
      },
      200 + Math.random() * 1000,
    );
  });
}

function setMock<T>(gs: GlobalStateV2, fn: (gs: GlobalStateV2) => T) {
  return new Promise<{ data: T }>((resolve) => {
    setTimeout(
      () => {
        window.localStorage.setItem("__tmp", JSON.stringify(gs));
        resolve({ data: fn(gs) });
      },
      200 + Math.random() * 1000,
    );
  });
}

export function useApp(): [
  {
    data: AppV2;
    isInitialized: boolean;
    isLoading: boolean;
  },
  {
    updateApp: (newApp: Partial<AppV2>) => [AppV2, Mock<AppV2>];
  },
] {
  const [, setGlobalState, getGlobalStateSnapshot] = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const snapshot = getGlobalStateSnapshot();

  useEffect(() => {
    getMock((gs) => gs.app).then((res) => {
      setIsInitialized(true);
      setGlobalState({ app: res.data });
    });
  }, []);

  return [
    {
      data: snapshot.app,
      isLoading,
      isInitialized,
    },
    {
      updateApp: (newApp) => {
        setGlobalState({ app: newApp });
        const ss = getGlobalStateSnapshot();
        const f = () => {
          setIsLoading(true);
          return setMock<AppV2>(ss, (gs) => gs.app).finally(() => {
            setIsLoading(false);
          });
        };
        return [ss.app, f()];
      },
    },
  ];
}

const docs: { [taskListId: string]: Y.Doc } = {};
let intervalId = null;

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
    ) => [TaskListV2, Mock<TaskListV2>];
    prependTaskList: (
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    appendTaskList: (
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    updateTaskList: (
      newTaskList: Partial<TaskListV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    deleteTaskList: (taskListId: string) => Mock<TaskListV2>;
    insertTask: (
      taskListId: string,
      idx: number,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    prependTask: (
      taskListId: string,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    appendTask: (
      taskListId: string,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    updateTask: (
      taskListId: string,
      newTask: Partial<TaskV2>,
    ) => [TaskListV2, Mock<TaskListV2>];
    deleteTask: (taskListId: string, taskId: string) => Mock<TaskListV2>;
    sortTasks: (taskListId: string) => [TaskListV2, Mock<TaskListV2>];
  },
] {
  const [, setGlobalState, getGlobalStateSnapshot] = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const snapshot = getGlobalStateSnapshot();

  useEffect(() => {
    const fetch = () => {
      getMock((gs) => gs.taskLists)
        .then((res) => {
          setIsInitialized(true);
          setIsLoading(true);
          const taskLists = {};
          Object.values(res.data).forEach((tl: TaskListV2) => {
            // if (docs[tl.id]) {
            //   const doc = docs[tl.id];
            //   const u = Uint8Array.from(Object.values(tl.update));
            //   if (u.length) {
            //     Y.applyUpdate(doc, u);
            //   }
            // } else {
            //   const doc = new Y.Doc();
            //   docs[tl.id] = doc;
            //   const taskList = doc.getMap(tl.id);
            //   taskList.set("id", tl.id);
            //   taskList.set("name", tl.name);
            //   const tasks = new Y.Array();
            //   taskList.set("tasks", tasks);
            //   taskList.set("update", []);
            //   tl.tasks.forEach((task) => {
            //     const t = new Y.Map();
            //     t.set("id", task.id);
            //     t.set("text", task.text);
            //     t.set("completed", task.completed);
            //     t.set("date", task.date);
            //     tasks.push([t]);
            //   });
            // }
            if (!docs[tl.id]) {
              const d = new Y.Doc();
              docs[tl.id] = d;
            }
            const doc = docs[tl.id];
            const u = Uint8Array.from(Object.values(tl.update));
            if (u.length) {
              Y.applyUpdate(doc, u);
            }
            taskLists[tl.id] = docs[tl.id].getMap(tl.id).toJSON() as TaskListV2;
          });
          setGlobalState({ taskLists });
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    fetch();

    if (!intervalId) {
      intervalId = setInterval(() => {
        fetch();
      }, 5000);
    }
  }, []);

  const insertTask = (
    taskListId: string,
    idx: number,
    newTask: Partial<TaskV2>,
  ): [TaskListV2, Mock<TaskListV2>] => {
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
      setIsLoading(true);
      const ss = getGlobalStateSnapshot();
      return setMock<TaskListV2>(ss, (gs) => gs.taskLists[tl.id]).finally(
        () => {
          setIsLoading(false);
        },
      );
    };
    const ss = getGlobalStateSnapshot();
    return [ss.taskLists[tl.id], f()];
  };

  const insertTaskList = (
    idx: number,
    newTaskList: Partial<TaskListV2>,
  ): [TaskListV2, Mock<TaskListV2>] => {
    const id = uuid();
    const doc = new Y.Doc();
    docs[id] = doc;

    const taskList = doc.getMap(id);
    taskList.set("id", id);
    taskList.set("name", newTaskList.name);
    const tasks = new Y.Array();
    taskList.set("tasks", tasks);
    taskList.set("update", []);

    const tl = taskList.toJSON() as TaskListV2;
    const ss = getGlobalStateSnapshot();
    tl.update = Y.encodeStateAsUpdate(doc);
    setGlobalState({
      app: {
        ...ss.app,
        taskListIds: [
          ...ss.app.taskListIds.slice(0, idx),
          id,
          ...ss.app.taskListIds.slice(idx),
        ],
      },
      taskLists: { [tl.id]: tl },
    });
    const f = () => {
      setIsLoading(true);
      const ss = getGlobalStateSnapshot();
      return setMock<TaskListV2>(ss, (gs) => gs.taskLists[tl.id]).finally(
        () => {
          setIsLoading(false);
        },
      );
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
        const doc = docs[newTaskList.id];
        const taskList = doc.getMap(newTaskList.id);
        taskList.set("name", newTaskList.name);

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const ss = getGlobalStateSnapshot();
        const f = () => {
          setIsLoading(true);
          const ss = getGlobalStateSnapshot();
          return setMock<TaskListV2>(ss, (gs) => gs.taskLists[tl.id]).finally(
            () => {
              setIsLoading(false);
            },
          );
        };
        return [ss.taskLists[tl.id], f()];
      },
      deleteTaskList: (taskListId) => {
        delete docs[taskListId];
        const ss = getGlobalStateSnapshot();
        setGlobalState({
          app: {
            ...ss.app,
            taskListIds: ss.app.taskListIds.filter(
              (tlid: string) => tlid !== taskListId,
            ),
          },
          taskLists: { [taskListId]: undefined },
        });
        const f = () => {
          setIsLoading(true);
          const ss = getGlobalStateSnapshot();
          return setMock<TaskListV2>(
            ss,
            (gs) => gs.taskLists[taskListId],
          ).finally(() => {
            setIsLoading(false);
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
          setIsLoading(true);
          const ss = getGlobalStateSnapshot();
          return setMock<TaskListV2>(ss, (gs) => gs.taskLists[tl.id]).finally(
            () => {
              setIsLoading(false);
            },
          );
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
          setIsLoading(true);
          const ss = getGlobalStateSnapshot();
          return setMock<TaskListV2>(ss, (gs) => gs.taskLists[tl.id]).finally(
            () => {
              setIsLoading(false);
            },
          );
        };
        return f();
      },
      sortTasks: (taskListId) => {
        const doc = docs[taskListId];
        const taskList = doc.getMap(taskListId);
        const tasks = taskList.get("tasks") as Y.Array<Y.Map</* FIXME */ any>>;
        tasks.doc.transact(() => {
          let i = 0;
          const visited = new Set();
          while (i < tasks.length) {
            const task = tasks.get(i);
            if (visited.has(task.get("id"))) {
              break;
            }
            visited.add(task.get("id"));
            if (task.get("completed")) {
              const t = task.clone();
              tasks.delete(i);
              tasks.insert(tasks.length, [t]);
            } else {
              i += 1;
            }
          }
        });

        const tl = taskList.toJSON() as TaskListV2;
        tl.update = Y.encodeStateAsUpdate(doc);
        setGlobalState({ taskLists: { [tl.id]: tl } });
        const f = () => {
          setIsLoading(true);
          const ss = getGlobalStateSnapshot();
          return setMock<TaskListV2>(ss, (gs) => gs.taskLists[tl.id]).finally(
            () => {
              setIsLoading(false);
            },
          );
        };
        const ss = getGlobalStateSnapshot();
        return [ss.taskLists[tl.id], f()];
      },
    },
  ];
}
