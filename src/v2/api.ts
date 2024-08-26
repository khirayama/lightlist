import * as Y from "yjs";

import { config } from "v2/globalState";

export type Res<T> = Promise<{ data: T }>;

function loadGlobalState() {
  return (
    JSON.parse(window.localStorage.getItem("__tmp")) || config.initialValue()
  );
}

function getMock<T>(fn: (gs: GlobalStateV2) => T) {
  return new Promise<{ data: T }>((resolve) => {
    setTimeout(
      () => {
        const gs = loadGlobalState();
        resolve({ data: fn(gs) });
      },
      200 + Math.random() * 1000,
    );
  });
}

function setMock<T>(gs: GlobalStateV2, fn: (gs: GlobalStateV2) => T) {
  window.localStorage.setItem("__tmp", JSON.stringify(gs));
  return new Promise<{ data: T }>((resolve) => {
    setTimeout(
      () => {
        resolve({ data: fn(gs) });
      },
      200 + Math.random() * 1000,
    );
  });
}

export function getApp() {
  return getMock((gs) => gs.app);
}

export function updateApp(newApp: Partial<AppV2>) {
  const gs = loadGlobalState();

  const doc = new Y.Doc();
  if (gs.app.update) {
    const u = Uint8Array.from(Object.values(gs.app.update));
    Y.applyUpdate(doc, u);
  }
  if (newApp.update) {
    const u = Uint8Array.from(Object.values(newApp.update));
    Y.applyUpdate(doc, u);
  }

  gs.app = { ...gs.app, ...newApp, update: Y.encodeStateAsUpdate(doc) };
  return setMock(gs, (gs) => gs.app);
}

export function getTaskLists() {
  return getMock((gs) => gs.taskLists);
}

export function updateTaskList(newTaskList: Partial<TaskListV2>) {
  const gs = loadGlobalState();
  const newTaskLists = { ...gs.taskLists };
  const taskList = newTaskLists[newTaskList.id];

  const doc = new Y.Doc();
  if (taskList?.update) {
    const u = Uint8Array.from(Object.values(taskList.update));
    Y.applyUpdate(doc, u);
  }
  if (newTaskList?.update) {
    const u = Uint8Array.from(Object.values(newTaskList.update));
    Y.applyUpdate(doc, u);
  }

  newTaskLists[newTaskList.id] = {
    ...newTaskLists[newTaskList.id],
    ...doc.getMap(newTaskList.id).toJSON(),
    update: Y.encodeStateAsUpdate(doc),
  };
  gs.taskLists = newTaskLists;
  return setMock(gs, (gs) => gs.taskLists[newTaskList.id]);
}

export function deleteTaskList(taskListId: string) {
  const gs = loadGlobalState();
  const newTaskLists = { ...gs.taskLists };
  delete newTaskLists[taskListId];
  gs.taskLists = newTaskLists;
  return setMock(gs, () => {});
}
