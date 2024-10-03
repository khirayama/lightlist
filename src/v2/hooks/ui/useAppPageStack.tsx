import { useRef, useEffect } from "react";
import qs from "query-string";
import { useRouter } from "next/router";

export function useAppPageStack() {
  const router = useRouter();

  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const query = qs.parse(window.location.search);
      if (query.sheet || query.drawer === "opened") {
        const tmp = window.location.href;
        router.replace(window.location.origin + window.location.pathname);
        router.push(tmp);
      }
    }
    isInitialRender.current = false;
  }, []);
}
