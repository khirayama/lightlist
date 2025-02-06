import {
  createContext,
  useRef,
  useEffect,
  useContext,
  ReactNode,
  useState,
} from "react";

import { createGlobalState } from "./index";

const GlobalStateContext = createContext(null);

export const GlobalStateProvider = <T,>(props: {
  initialState: T;
  children: ReactNode;
}) => {
  const ref = useRef(createGlobalState<T>(props.initialState));
  const [state, setNativeState] = useState(ref.current.get());

  useEffect(() => {
    const globalState = ref.current;
    globalState.subscribe((newState) => {
      setNativeState(newState);
    });
  }, []);

  const setState = (state: DeepPartial<T>) => {
    const globalState = ref.current;
    globalState.set(state);
  };

  return (
    <GlobalStateContext.Provider value={[state, setState]}>
      {props.children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const [state, setState] = useContext(GlobalStateContext);
  return [state, setState] as const;
};
