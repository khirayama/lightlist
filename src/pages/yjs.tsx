import { v4 as uuid } from "uuid";
import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";

import { supabase } from "libs/supabase";

const channel = supabase
  .channel("all", {
    config: {
      broadcast: {
        self: true,
      },
    },
  })
  .subscribe();
console.log(channel);

const emit = (event: string, payload = {}) => {
  channel.send({ type: "broadcast", event, payload });
};

const listener = (event: string, callback: any) => {
  channel.on("broadcast", { event }, callback);
};

const createTaskList = (taskListName: string) => {
  const id = uuid();
  const taskList = new Y.Map();
  taskList.set("id", id);
  const name = new Y.Text(taskListName);
  taskList.set("name", name);
  const taskIds = new Y.Array();
  taskList.set("taskIds", taskIds);

  const globalState = doc.getMap("globalState");
  const taskLists = globalState.get("taskLists") as Y.Map<any>;
  taskLists.set(id, taskList);
  const app = globalState.get("app") as Y.Map<any>;
  const taskListIds = app.get("taskListIds") as Y.Array<any>;
  taskListIds.push([id]);
};

const createTask = (taskListId: string, taskText: string) => {
  const id = uuid();
  const task = new Y.Map();
  task.set("id", id);
  const text = new Y.Text(taskText);
  task.set("text", text);
  task.set("completed", false);

  const globalState = doc.getMap("globalState");
  const tasks = globalState.get("tasks") as Y.Map<any>;
  tasks.set(id, task);
  const taskLists = globalState.get("taskLists") as Y.Map<any>;
  const taskList = taskLists.get(taskListId) as Y.Map<any>;
  const taskIds = taskList.get("taskIds") as Y.Array<any>;
  taskIds.push([id]);
};

type TaskList = {
  id: string;
  name: string;
  taskIds: string[];
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

type AppState = {
  taskListIds: string[];
};

type GlobalState = {
  app: AppState;
  taskLists: { [key: string]: TaskList };
  tasks: { [key: string]: Task };
};

const doc = new Y.Doc();
const globalState = doc.getMap("globalState");
const app = new Y.Map();
globalState.set("app", app);
const taskListIds = new Y.Array();
app.set("taskListIds", taskListIds);
const taskLists = new Y.Map();
globalState.set("taskLists", taskLists);
const tasks = new Y.Map();
globalState.set("tasks", tasks);

function TaskListItem(props: { task: Task }) {
  return (
    <div>
      <input
        type="checkbox"
        checked={props.task.completed}
        onChange={() => {}}
      />
      <input type="text" value={props.task.text} onChange={() => {}} />
    </div>
  );
}

function TaskList(props: { taskList: TaskList; tasks: Task[] }) {
  const [taskText, setTaskText] = useState("");
  return (
    <div>
      <p>{props.taskList.name}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createTask(props.taskList.id, taskText);
          setTaskText("");
        }}
      >
        <input
          className="border"
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.currentTarget.value)}
        />
        <button>タスクを作成</button>
      </form>
      <div>
        {props.tasks.map((task) => {
          return <TaskListItem key={task.id} task={task} />;
        })}
      </div>
    </div>
  );
}

export default function YjsPage() {
  const [taskListName, setTaskListName] = useState("");
  const [state, setState] = useState<GlobalState>(
    doc.getMap("globalState").toJSON() as GlobalState,
  );
  console.log(state);

  useEffect(() => {
    const f = (update) => {
      emit("update", { update });
    };

    doc.on("update", f);
    return () => {
      doc.off("update", f);
    };
  }, []);

  useEffect(() => {
    listener("update", ({ payload }) => {
      const update = Uint8Array.from(Object.values(payload.update));
      Y.applyUpdate(doc, update);
      const globalState = doc.getMap("globalState").toJSON() as GlobalState;
      setState(globalState);
    });

    emit("initialized");
    listener("initialized", () => {
      emit("update", { update: Y.encodeStateAsUpdate(doc) });
    });
  }, [channel]);

  const taskLists = state.app.taskListIds.map((tlid) => {
    return state.taskLists[tlid];
  });
  console.log(taskLists);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createTaskList(taskListName);
          setTaskListName("");
        }}
      >
        <input
          className="border"
          type="text"
          value={taskListName}
          onChange={(e) => setTaskListName(e.currentTarget.value)}
        />
        <button>リストを作成</button>
      </form>
      <div className="flex">
        {taskLists.map((taskList) => {
          const tasks = taskList.taskIds.map((tid) => {
            return state.tasks[tid];
          });
          return (
            <div className="flex-1" key={taskList.id}>
              <TaskList taskList={taskList} tasks={tasks} />
            </div>
          );
        })}
      </div>
    </div>
  );
}