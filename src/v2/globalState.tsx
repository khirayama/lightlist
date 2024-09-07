import { createContext, useContext, ReactNode, useState } from "react";
import { deepmerge } from "@fastify/deepmerge";

function replaceByClonedSource<T = any>(options: { clone: (source: T) => T }) {
  return (_: T, source: T) => options.clone(source);
}

const merge = deepmerge({ mergeArray: replaceByClonedSource });

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export const config = {
  initialValue: (): GlobalStateV2 => {
    return {
      app: {
        taskInsertPosition: "BOTTOM",
        taskListIds: [],
        online: true,
        update: new Uint8Array(),
      },
      profile: {
        displayName: "",
        email: "",
      },
      preferences: {
        lang: "EN",
        theme: "SYSTEM",
      },
      taskLists: {},
    };
  },
};

let snapshot: GlobalStateV2 = null;

const GlobalStateContext = createContext<
  [GlobalStateV2, (newState: GlobalStateV2) => void, () => GlobalStateV2]
>([snapshot, () => {}, () => snapshot]);

export const GlobalStateProvider = (props: { children: ReactNode }) => {
  const [globalState, nativeSetGlobalState] = useState(config.initialValue());
  snapshot = globalState;

  const setGlobalState = (newState: DeepPartial<GlobalStateV2>) => {
    const mergedState = merge(snapshot, newState) as GlobalStateV2;
    snapshot = mergedState;
    nativeSetGlobalState(snapshot);
  };

  const getGlobalStateSnapshot = () => snapshot;

  return (
    <GlobalStateContext.Provider
      value={[globalState, setGlobalState, getGlobalStateSnapshot]}
    >
      {props.children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = (): [
  GlobalStateV2,
  (newState: DeepPartial<GlobalStateV2>) => void,
  () => GlobalStateV2,
] => {
  return useContext(GlobalStateContext);
};