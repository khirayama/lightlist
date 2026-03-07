import { createContext, type ReactNode, useContext } from "react";

type AppDirection = "ltr" | "rtl";

const AppDirectionContext = createContext<AppDirection>("ltr");

type AppDirectionProviderProps = {
  value: AppDirection;
  children: ReactNode;
};

export const AppDirectionProvider = ({
  value,
  children,
}: AppDirectionProviderProps) => {
  return (
    <AppDirectionContext.Provider value={value}>
      {children}
    </AppDirectionContext.Provider>
  );
};

export const useAppDirection = () => {
  return useContext(AppDirectionContext);
};
