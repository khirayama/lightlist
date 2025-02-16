import {
  createContext,
  useRef,
  useEffect,
  useContext,
  ReactNode,
  useState,
} from "react";

import { createGlobalState } from "./index";

export type MutationFunction<T = unknown, P = unknown> = (
  getState: () => T,
  commit: (s: DeepPartial<T>) => void,
  payload?: P,
) => unknown;

const GlobalStateContext = createContext(null);

function debounce(fn: Function, t: number) {
  let timerId = null;
  return (...args: unknown[]) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), t);
  };
}

export const GlobalStateProvider = <T,>(props: {
  initialGlobalState: T;
  children: ReactNode;
}) => {
  const { current: globalState } = useRef(
    createGlobalState<T>(props.initialGlobalState),
  );
  const [state, setNativeState] = useState(globalState.get());
  const setState = (s: DeepPartial<T>) => globalState.set(s);

  const { current: debouncedSetNativeState } = useRef(
    debounce(setNativeState, 0),
  );

  useEffect(() => {
    globalState.subscribe((newState: T) => {
      debouncedSetNativeState(newState);
    });
  }, []);

  return (
    <GlobalStateContext.Provider value={[state, setState, globalState]}>
      {props.children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const [state, setState, globalState] = useContext(GlobalStateContext);

  const mutate = (fn: MutationFunction<typeof state>, params?: unknown) => {
    fn(
      () => globalState.get(),
      (s) => globalState.set(s),
      params,
    );
  };

  return [state, setState, mutate] as const;
};
