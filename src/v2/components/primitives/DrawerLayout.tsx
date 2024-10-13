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

function isDrawerOpen() {
  return qs.parse(window.location.search).drawer === "opened";
}

export const Drawer = (props: { children?: ReactNode }) => {
  // TODO: Replace with dialog element to block user action in Main section
  return (
    <section
      data-sectiondrawer
      className={clsx(
        "bg absolute z-30 h-full w-full min-w-[320px] -translate-x-full transition-transform duration-[320ms] md:relative md:block md:w-[auto] md:max-w-sm md:translate-x-0",
        isDrawerOpen() && "translate-x-0",
        !isNarrowLayout() && "border-r",
      )}
    >
      {props.children}
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

export const DrawerLayout = (props: { children: ReactNode }) => {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(isDrawerOpen());
  const [isNarrow, setIsNarrow] = useState(isNarrowLayout());

  useEffect(() => {
    const handleResize = () => {
      if (isDrawerOpen() && !isNarrowLayout()) {
        router.back();
      }
      setIsNarrow(isNarrowLayout());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isNarrow, isOpen]);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(isDrawerOpen());
      setTimeout(() => {
        const p = isDrawerOpen()
          ? document.querySelector<HTMLElement>("[data-sectiondrawer]")
          : document.querySelector<HTMLElement>("[data-sectionmain]");
        p?.focus();
      }, 1);
    };

    handleRouteChange();
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  return (
    <DrawerLayoutContext.Provider
      value={{
        isDrawerOpen: isOpen,
        isNarrowLayout: isNarrow,
      }}
    >
      <div className="bg flex h-full w-full overflow-hidden">
        {props.children}
      </div>
    </DrawerLayoutContext.Provider>
  );
};

export const useDrawerLayout = () => {
  return useContext(DrawerLayoutContext);
};
