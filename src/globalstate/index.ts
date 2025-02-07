import { deepmerge } from "@fastify/deepmerge";

function replaceByClonedSource<T = any>(options: { clone: (source: T) => T }) {
  return (_: T, source: T) => options.clone(source);
}

const merge = deepmerge({ mergeArray: replaceByClonedSource });

class EventEmitter<T> {
  private callbacks: Function[] = [];

  private data: T;

  constructor(initialState: T) {
    this.data = initialState;
  }

  get() {
    return this.data;
  }

  set(data: DeepPartial<T>) {
    this.data = merge(this.data, data) as T;
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i](this.data);
    }
  }

  on(callback: Function) {
    this.callbacks.push(callback);
  }
}

export function createGlobalState<T>(initialState: T) {
  const emitter = new EventEmitter<T>(initialState);

  return {
    get: () => emitter.get(),
    set: (data: DeepPartial<T>) => emitter.set(data),
    subscribe: (callback: (data: T) => void) => {
      emitter.on(callback);
    },
  };
}
