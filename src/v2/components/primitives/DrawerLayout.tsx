import { useState, useEffect, ReactNode } from "react";
import { clsx } from "clsx";
import { useRouter } from "next/router";
import qs from "query-string";

export function isNarrowLayout() {
  const el = document.querySelector<HTMLElement>("[data-sectionmain]");
  return window.innerWidth === el?.clientWidth;
}

export function useDrawerLayout(): {
  open: boolean;
  isNarrowLayout: boolean;
  close: () => void;
} {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(isDrawerOpened());
  const [isNarrow, setIsNarrow] = useState(isNarrowLayout());

  useEffect(() => {
    const handleResize = () => setIsNarrow(isNarrowLayout());

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isNarrowLayout(), isDrawerOpen]);

  useEffect(() => {
    const handleRouteChange = () => {
      const isOpened = isDrawerOpened();
      setIsDrawerOpen(isOpened);
      setTimeout(() => {
        const p = isOpened
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

  return {
    open: isDrawerOpen,
    isNarrowLayout: isNarrow,
    close: () => {
      if (isDrawerOpen) {
        router.back();
      }
    },
  };
}

function isDrawerOpened() {
  return qs.parse(window.location.search).drawer === "opened";
}

export const Drawer = (props: {
  open: boolean;
  isNarrowLayout: boolean;
  close: () => void;
  children?: ReactNode;
}) => {
  return (
    <section
      data-sectiondrawer
      className={clsx(
        "bg absolute z-30 h-full w-full min-w-[320px] -translate-x-full transition-transform duration-[320ms] md:relative md:block md:w-[auto] md:max-w-sm md:translate-x-0",
        props.open && "translate-x-0",
        !props.isNarrowLayout && "border-r",
      )}
    >
      {props.children}
    </section>
  );
};

export const Main = (props: {
  open: boolean;
  close: () => void;
  children?: ReactNode;
}) => {
  return (
    <section data-sectionmain className="h-full w-full min-w-[375px]">
      {props.children}
    </section>
  );
};

export const DrawerLayout = (props: { children: ReactNode }) => {
  return (
    <div className="bg flex h-full w-full overflow-hidden">
      {props.children}
    </div>
  );
};
