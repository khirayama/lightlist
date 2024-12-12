import { createContext, useContext, ReactNode, useState } from "react";
import { deepmerge } from "@fastify/deepmerge";

function replaceByClonedSource<T = any>(options: { clone: (source: T) => T }) {
  return (_: T, source: T) => options.clone(source);
}

const merge = deepmerge({ mergeArray: replaceByClonedSource });

type DeepPartial<T> = {
  [P in keyof T]?: T[P] | DeepPartial<T[P]>;
};

const GlobalStateContext = createContext(null);

export function createConfig<T>(config: { initialValue: () => T }) {
  return {
    ...config,
    snapshot: null as T,
  };
}

export const GlobalStateProvider = (props: {
  config: ReturnType<typeof createConfig>;
  children: ReactNode;
}) => {
  const config = props.config;

  const [globalState, nativeSetGlobalState] = useState<typeof config.snapshot>(
    config.initialValue(),
  );
  config.snapshot = globalState as typeof config.snapshot;

  const setGlobalState = (newState: DeepPartial<typeof config.snapshot>) => {
    const mergedState = merge(
      config.snapshot,
      newState,
    ) as typeof config.snapshot;
    config.snapshot = mergedState;
    nativeSetGlobalState(config.snapshot);
  };

  const getGlobalStateSnapshot = () => config.snapshot;

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
    typeof config.snapshot,
    (newState: DeepPartial<typeof config.snapshot>) => void,
    () => typeof config.snapshot,
  ];
};
