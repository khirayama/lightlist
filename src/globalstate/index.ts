import { deepmerge } from "@fastify/deepmerge";

function replaceByClonedSource<T = any>(options: { clone: (source: T) => T }) {
  return (_: T, source: T) => options.clone(source);
}

const merge = deepmerge({ mergeArray: replaceByClonedSource });

class EventEmitter<T> {
  private callbacks: Function[] = [];

  public data: T;

  constructor(initialState: T) {
    this.data = initialState;
  }

  set(data: DeepPartial<T>) {
    this.data = merge(this.data, data) as T;
  }

  on(callback: Function) {
    this.callbacks.push(callback);
  }
}

export function createGlobalState<T>(initialState: T) {
  const emitter = new EventEmitter<T>(initialState);

  return {
    set: (data: DeepPartial<T>) => emitter.set(data),
    get: () => emitter.data,
    subscribe: (callback: (data: T) => void) => {
      emitter.on(callback);
    },
  };
}
