import {
  createContext,
  useEffect,
  ReactNode,
  useRef,
  useContext,
  KeyboardEvent,
} from "react";
import qs from "query-string";
import { useRouter } from "next/router";
import Link from "next/link";

// - useNavigation
// - Navigation
//  - navigate
//  - push
//  - goBack
//  - popTo
//  - popToTop
// - Link
type Query = { [key: string]: string | string[] | null };

const AppPageStackContext = createContext(null);

export const AppPageStackProvider = (props: { children: ReactNode }) => {
  const router = useRouter();

  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const startUrl = window.location.origin + window.location.pathname;
      const shouldStack = startUrl !== window.location.href;
      if (shouldStack) {
        const tmp = window.location.href;
        router.replace(window.location.origin + window.location.pathname);
        setTimeout(() => {
          router.push(tmp);
        }, 80);
      }
    }
    isInitialRender.current = false;
  }, []);

  // Disable swipe back gesture
  useEffect(() => {
    document.addEventListener("touchstart", (event) => {
      if (event.touches.length === 1) {
        const touchStartX = event.touches[0].clientX;
        let isSwipeBack = false;

        document.addEventListener(
          "touchmove",
          (moveEvent) => {
            moveEvent.preventDefault();
            const touchEndX = moveEvent.touches[0].clientX;
            const deltaX = touchEndX - touchStartX;

            if (deltaX > 50) {
              isSwipeBack = true;
            }
          },
          { passive: false },
        );

        document.addEventListener(
          "touchend",
          () => {
            if (isSwipeBack) {
              window.history.back();
            }
          },
          { passive: false },
        );
      }
    });
  }, []);

  return (
    <AppPageStackContext.Provider
      value={{
        pop: () => {
          router.back();
        },
        push: (url: string) => {
          router.push(url);
        },
        pushWithParams: (
          pathname: string,
          options?: {
            params?: Query;
            mergeParams?: boolean;
          },
        ) => {
          const q = options.mergeParams
            ? { ...qs.parse(window.location.search), ...(options.params || {}) }
            : options.params || {};
          const s = qs.stringify(q);
          const url = pathname + (s ? `?${s}` : "");
          router.push(url);
        },
        replace: (url: string) => {
          router.replace(url);
        },
        replaceWithParams: (
          pathname: string,
          options?: {
            params?: Query;
            mergeParams?: boolean;
          },
        ) => {
          const q = options.mergeParams
            ? { ...qs.parse(window.location.search), ...(options.params || {}) }
            : options.params || {};
          const s = qs.stringify(q);
          const url = pathname + (s ? `?${s}` : "");
          router.replace(url);
        },
      }}
    >
      {props.children}
    </AppPageStackContext.Provider>
  );
};

export const useAppPageStack = () => {
  return useContext(AppPageStackContext);
};

export function AppPageLink(props: {
  href?: string;
  params?: Query;
  mergeParams?: boolean;
  replace?: boolean;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
  onKeyDown?: (e?: KeyboardEvent<HTMLAnchorElement>) => void;
}) {
  const p = { ...props };
  const q = props.mergeParams
    ? { ...qs.parse(window.location.search), ...props.params }
    : props.params;
  const s = qs.stringify(q);
  const href = (props.href || window.location.pathname) + (s ? `?${s}` : "");
  delete p.mergeParams;
  delete p.params;
  return <Link {...{ ...p, href }}>{props.children}</Link>;
}
