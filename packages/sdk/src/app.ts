export type SettingsStore = {
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
  taskInsertPosition: 'top' | 'bottom';
  autoSort: boolean;
};

export type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

export type TaskListStore = {
  id: string;
  name: string;
  background: string;
  tasks: Task[];
  history: string[];
  shareToken: string;
}

export type FullStore = {
  tasklists: TaskListStore[];
  settings: SettingsStore;
}

function f() {
  // session lotation and fetcher with bearer token
}

export function createStore() {
  let state: FullStore = {
    tasklists: [],
    settings: {
      theme: 'system',
      language: 'ja',
      taskInsertPosition: 'top',
      autoSort: false,
    },
  };

  // let docs: {
  //   taskListDocOrderDoc: any;
  //   taskListDocs: { [taskListId: string]: any };
  // } = {
  //   taskListDocs: {},
  //   taskListDocOrderDoc: {},
  // };

  const subscribers: ((state: FullStore) => void)[] = [];

  const emit = () => {
    subscribers.forEach((callback) => callback(state));
  }

  return {
    getState: () => state,
    subscribe: (callback: (state: FullStore) => void) => {
    subscribers.push(callback);
    callback(state);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
    },
    // settings
    updateSettings: (newSettings: Partial<SettingsStore>) => {
    },
    // tasklist
    addTaskList: () => {},
    updateTaskList: () => {},
    sortTasks: () => {},
    deleteCompletedTasks: () => {},
    moveTaskList: () => {},
    // task
    addTask: () => {},
    updateTask: () => {},
    moveTask: () => {},
  };  
}
