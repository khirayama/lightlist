import {
  createContext,
  useEffect,
  ReactNode,
  useRef,
  useContext,
  useState,
} from "react";
import { match, MatchFunction } from "path-to-regexp";

type RouteDefinition = {};

export type RouteDefinitions = Record<string, RouteDefinition>;

function getPathnameAndSearchFromHash() {
  const hash = window.location.hash.split("#")[1] || "";
  const pathname = hash.split("?")[0];
  const search = hash.split("?")[1] || "";
  return { pathname, search };
}

type Navigation = {
  navigate: (path: string) => void;
  push: (path: string) => void;
  goBack: () => void;
  popTo: (path: string) => void;
  popToTop: () => void;
  getAttr: () => Record<string, any>;
};

type NavigationProviderProps = {
  children: ReactNode;
  initialPath: string;
  routes: RouteDefinitions;
};

const NavigationContext = createContext<Navigation | null>(null);

export function NavigationProvider({
  children,
  initialPath,
  routes,
}: NavigationProviderProps) {
  const ref = useRef<string[]>([]);
  const referrer = useRef<string>("");
  const [isInBrowser, setIsInBrowser] = useState(false);
  const [, setRender] = useState(Date.now());

  useEffect(() => {
    setIsInBrowser(true);
  }, []);

  useEffect(() => {
    if (isInBrowser) {
      window.addEventListener("popstate", (e) => {
        e.preventDefault();
        ref.current = e.state?.stack || [initialPath];
        setRender(Date.now());
      });

      const { pathname: pathname, search } = getPathnameAndSearchFromHash();
      const path = !pathname ? initialPath : pathname;
      ref.current.push(path);
      window.history.pushState(
        { stack: ref.current },
        "",
        `#${path}?${search}`,
      );
      setRender(Date.now());
    }
  }, [isInBrowser]);

  const navigation: Navigation = {
    push: (path: string) => {
      referrer.current = ref.current[ref.current.length - 1];
      ref.current.push(path);
      window.history.pushState({ stack: ref.current }, "", `#${path}`);
      setRender(Date.now());
    },
    navigate: (path: string) => {
      if (ref.current[ref.current.length - 1] !== path) {
        navigation.push(path);
      }
    },
    goBack: () => {
      if (ref.current.length > 1) {
        window.history.back();
        ref.current.pop();
      }
      setRender(Date.now());
    },
    popTo: (targetPath: string) => {
      const hasTargetPath = ref.current.includes(targetPath);
      if (hasTargetPath) {
        while (ref.current[ref.current.length - 1] !== targetPath) {
          window.history.back();
          ref.current.pop();
        }
      } else {
        ref.current[ref.current.length - 1] = targetPath;
        window.history.replaceState(
          { stack: ref.current },
          "",
          `#${targetPath}`,
        );
      }
      setRender(Date.now());
    },
    popToTop: () => {
      const hasTargetPath = ref.current.includes(initialPath);
      if (hasTargetPath) {
        while (ref.current[ref.current.length - 1] !== initialPath) {
          window.history.back();
          ref.current.pop();
        }
      } else {
        ref.current[ref.current.length - 1] = initialPath;
        window.history.replaceState(
          { stack: ref.current },
          "",
          `#${initialPath}`,
        );
      }
      setRender(Date.now());
    },
    getAttr: () => {
      if (!isInBrowser) {
        return {};
      }

      const { pathname } = getPathnameAndSearchFromHash();
      const route = Object.keys(routes).find((r) => {
        const m: MatchFunction<Record<string, string>> = match(r);
        return m(pathname);
      });
      if (route) {
        const params = match<Record<string, string>>(route)(pathname) as {
          path: string;
          params: Record<string, any>;
        };
        return {
          routes,
          stack: ref.current,
          match: route,
          path: params.path,
          params: params.params,
          props: routes[route],
          referrer: referrer.current,
        };
      }
      return {};
    },
  };

  return (
    <NavigationContext.Provider value={navigation}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

export function NavigateLink(props: {
  to: string;
  children: ReactNode;
  className?: string;
  method?: "navigate" | "push" | "goBack" | "popTo" | "popToTop";
  tabIndex?: number;
  onKeyPress?: (e: React.KeyboardEvent<HTMLAnchorElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLAnchorElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLAnchorElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const navigation = useNavigation();
  const method = props.method || "navigate";

  return (
    <a
      tabIndex={props.tabIndex}
      className={props.className}
      href={props.to}
      onClick={(e) => {
        e.preventDefault();
        if (method === "navigate") {
          navigation.navigate(props.to);
        } else if (method === "push") {
          navigation.push(props.to);
        } else if (method === "goBack") {
          navigation.goBack();
        } else if (method === "popTo") {
          navigation.popTo(props.to);
        } else if (method === "popToTop") {
          navigation.popToTop();
        }
      }}
    >
      {props.children}
    </a>
  );
}
