import { useRef, useEffect } from "react";
import qs from "query-string";

export function useAppPageStack() {
  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const query = qs.parse(window.location.search);
      if (query.sheet) {
        const tmp = window.location.href;
        window.history.replaceState({}, "", window.location.pathname);
        window.history.pushState({}, "", tmp);
      }
    }
    isInitialRender.current = false;
  }, []);
}
