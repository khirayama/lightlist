import { createContext, useContext, ReactNode, useState } from "react";
import { deepmerge } from "@fastify/deepmerge";

function replaceByClonedSource<T = any>(options: { clone: (source: T) => T }) {
  return (_: T, source: T) => options.clone(source);
}

const merge = deepmerge({ mergeArray: replaceByClonedSource });

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

const GlobalStateContext = createContext(null);

export const GlobalStateProvider = (props: {
  config: { initialValue: () => unknown };
  children: ReactNode;
}) => {
  const config = props.config;

  const [globalState, nativeSetGlobalState] = useState(config.initialValue());
  let snapshot: ReturnType<typeof config.initialValue> = globalState;

  const setGlobalState = (
    newState: DeepPartial<ReturnType<typeof config.initialValue>>,
  ) => {
    const mergedState = merge(snapshot, newState) as ReturnType<
      typeof config.initialValue
    >;
    snapshot = mergedState;
    nativeSetGlobalState(snapshot);
  };

  const getGlobalStateSnapshot = () => snapshot;

  return (
    <GlobalStateContext.Provider
      value={{
        payload: [globalState, setGlobalState, getGlobalStateSnapshot],
        config: props.config,
      }}
    >
      {props.children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const { payload, config } = useContext(GlobalStateContext);
  return payload as [
    ReturnType<typeof config.initialValue>,
    (newState: DeepPartial<ReturnType<typeof config.initialValue>>) => void,
    () => ReturnType<typeof config.initialValue>,
    ReturnType<typeof config.initialValue>,
  ];
};
