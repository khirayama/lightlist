import {
  useEffect,
  ReactNode,
  createContext,
  useContext,
  useState,
} from "react";
import { clsx } from "clsx";
import { useRouter } from "next/router";
import qs from "query-string";

const DrawerLayoutContext = createContext({
  isNarrowLayout: false,
  isDrawerOpen: false,
});

export function isNarrowLayout() {
  const el = document.querySelector<HTMLElement>("[data-sectionmain]");
  return window.innerWidth === el?.clientWidth;
}

export const Drawer = (props: { children?: ReactNode }) => {
  const da = useDrawerLayout();

  return (
    <section
      data-sectiondrawer
      className={clsx(
        "absolute z-30 h-full w-full min-w-[320px] -translate-x-full transition-transform duration-[320ms] md:relative md:block md:w-[auto] md:max-w-sm md:translate-x-0",
        da.isDrawerOpen && "translate-x-0",
      )}
    >
      <div className="bg-secondary h-full w-full">{props.children}</div>
    </section>
  );
};

export const Main = (props: { children?: ReactNode }) => {
  return (
    <section data-sectionmain className="h-full w-full min-w-[375px]">
      {props.children}
    </section>
  );
};

export const DrawerLayout = (props: {
  isDrawerOpen: boolean;
  children: ReactNode;
}) => {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(props.isDrawerOpen);
  const [isNarrow, setIsNarrow] = useState(isNarrowLayout());

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(isNarrowLayout());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isNarrow, isOpen]);

  useEffect(() => {
    const handleHashChange = () => {
      setIsOpen(props.isDrawerOpen);
      setTimeout(() => {
        const p = props.isDrawerOpen
          ? document.querySelector<HTMLElement>("[data-sectiondrawer]")
          : document.querySelector<HTMLElement>("[data-sectionmain]");
        p?.focus();
      }, 1);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [props.isDrawerOpen]);

  return (
    <DrawerLayoutContext.Provider
      value={{
        isDrawerOpen: isOpen,
        isNarrowLayout: isNarrow,
      }}
    >
      <div className="bg-primary flex h-full w-full overflow-hidden">
        {props.children}
      </div>
    </DrawerLayoutContext.Provider>
  );
};

export const useDrawerLayout = () => {
  return useContext(DrawerLayoutContext);
};
