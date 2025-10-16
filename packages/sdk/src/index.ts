type SettingsStore = {
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
  taskInsertPosition: 'top' | 'bottom';
  autoSort: boolean;
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type TaskListStore = {
  id: string;
  name: string;
  background: string;
  tasks: Task[];
  history: string[];
  shareToken: string;
}

type FullStore = {
  tasklists: TaskListStore[];
  settings: SettingsStore;
}

function getLoro(platform: string) {
  if (platform === 'web') {
    return require('loro-crdt').default;
  }
    return require('loro-react-native').default;
}

function createStore() {
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

  function subscribe(callback: (state: FullStore) => void) {
    subscribers.push(callback);
    callback(state);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  function getState() {
    return state;
  }

  return {
    subscribe,
    getState,
  };  
}
