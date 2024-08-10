import { diff, patch } from "jsondiffpatch";

import { useGlobalState } from "libs/globalState";
import { createDebounce } from "libs/common";
import { useClient } from "hooks/common";

// useResouce: () => [Resouce, { mutations }, { selectors }]
// App, Profile, Preferences, TaskList, Task

const updateDebounce = createDebounce();

export const useTaskLists = (
  url: string,
): [
  {
    data: { [id: string]: TaskList };
    isInitialized: boolean;
    isLoading: boolean;
  },
  {
    createTaskList: (newTaskList: TaskList) => void;
    updateTaskList: (newTaskList: TaskList) => void;
    deleteTaskList: (deletedTaskListId: string) => void;
    refreshShareCode: (taskListId: string) => void;
  },
  {
    getTaskListsById: (taskListIds: string[]) => TaskList[];
  },
] => {
  const [, setGlobalState, getGlobalStateSnapshot] = useGlobalState();
  const { sent, polling, isInitialized, isLoading } = useClient(url, {
    resolve: (res) => {
      const newTaskLists = res.data.taskLists.reduce(
        (acc: {}, tl: TaskList) => {
          const tmp = new Set(tl.taskIds);
          if (tl.taskIds.length !== tmp.size) {
            console.warn("duplicate task ids");
          }
          return { ...acc, [tl.id]: { ...tl, taskIds: Array.from(tmp) } };
        },
        {},
      );
      setGlobalState({
        taskLists: newTaskLists,
      });
    },
  });

  const createTaskList = (newTaskList: TaskList) => {
    polling.restart();

    setGlobalState({
      taskLists: {
        [newTaskList.id]: newTaskList,
      },
    });
    sent({
      method: "POST",
      url: "/api/task-lists",
      data: newTaskList,
    }).catch((err) => {
      console.log(err);
    });
  };

  const updateTaskList = (newTaskList: TaskList) => {
    polling.restart();

    setGlobalState({
      taskLists: {
        [newTaskList.id]: newTaskList,
      },
    });
    updateDebounce(() => {
      sent({
        method: "PATCH",
        url: `/api/task-lists/${newTaskList.id}`,
        data: newTaskList,
      }).catch((err) => {
        console.log(err);
      });
    }, 600);
  };

  const deleteTaskList = (deletedTaskListId: string) => {
    polling.restart();

    setGlobalState({
      taskLists: {
        [deletedTaskListId]: undefined,
      },
    });
    sent({
      method: "DELETE",
      url: `/api/task-lists/${deletedTaskListId}`,
    }).catch((err) => {
      console.log(err);
    });
  };

  const refreshShareCode = (taskListId: string) => {
    polling.restart();

    const shareCode = getGlobalStateSnapshot().taskLists[taskListId].shareCode;
    sent({
      method: "PUT",
      url: `/api/share-codes/${shareCode}`,
    })
      .then((res) => {
        setGlobalState({
          taskLists: {
            [taskListId]: {
              shareCode: res.data.shareCode.code,
            },
          },
        });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const snapshot = getGlobalStateSnapshot();
  return [
    {
      data: snapshot.taskLists,
      isInitialized,
      isLoading,
    },
    {
      createTaskList,
      updateTaskList,
      deleteTaskList,
      refreshShareCode,
    },
    {
      getTaskListsById: (taskListIds: string[]) => {
        return taskListIds
          .map((tlid) => snapshot.taskLists[tlid])
          .filter((tl) => !!tl);
      },
    },
  ];
};
