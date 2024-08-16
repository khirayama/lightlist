import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { getSession } from "libs/supabase";
import { useEffect } from "react";

const time = {
  polling: 8000,
};

const createPolling = () => {
  let intervalId = null;
  let f: Function;
  let i: number;
  const polling = {
    start: (fn: Function, interval: number) => {
      f = fn;
      i = interval;
      if (intervalId) {
        return;
      }
      polling.run();
    },
    stop: () => {
      clearInterval(intervalId);
      intervalId = null;
    },
    restart: () => {
      polling.stop();
      polling.run();
    },
    run: () => {
      intervalId = setInterval(f, i);
    },
  };
  return polling;
};

const fetchStatus: {
  [url: string]: {
    isLoading: boolean;
    isInitialized: boolean;
    polling: ReturnType<typeof createPolling>;
    isPolling: boolean;
  };
} = {};

export const resetFetchStatus = (url?: string) => {
  if (url) {
    fetchStatus[url].polling.stop();
    fetchStatus[url].isPolling = false;
    fetchStatus[url].isInitialized = false;
    fetchStatus[url].isLoading = false;
  } else {
    for (const key in fetchStatus) {
      fetchStatus[key].polling.stop();
      fetchStatus[url].isPolling = false;
      fetchStatus[key].isInitialized = false;
      fetchStatus[key].isLoading = false;
    }
  }
};

export const useClient = <T>(
  url: string,
  options: {
    interval?: number;
    before?: () => T;
    resolve?: (res: AxiosResponse, options: T) => void | Promise<void>;
    reject?: (
      res: AxiosResponse,
      options: AxiosRequestConfig,
    ) => void | Promise<void>;
    finally?: () => void | Promise<void>;
  } = {},
): {
  isInitialized: boolean;
  isLoading: boolean;
  isPolling: boolean;
  polling: ReturnType<typeof createPolling>;
  sent: (options: AxiosRequestConfig) => Promise<AxiosResponse>;
} => {
  if (!fetchStatus[url]) {
    fetchStatus[url] = {
      isLoading: false,
      isInitialized: false,
      isPolling: false,
      polling: createPolling(),
    };
  }

  useEffect(() => {
    if (url && !fetchStatus[url].isInitialized && !fetchStatus[url].isLoading) {
      const f = async () => {
        fetchStatus[url].isLoading = true;
        const tmp = options.before?.();
        return axios({
          method: "GET",
          url,
          withCredentials: true,
          headers: {
            "Cache-Control": "no-cache",
            Authorization: `Bearer ${getSession()?.access_token}`,
          },
        })
          .then((res) => {
            fetchStatus[url].isInitialized = true;
            fetchStatus[url].isLoading = false;
            if (!fetchStatus[url].isPolling) {
              fetchStatus[url].polling.start(
                f,
                options.interval || time.polling,
              );
              fetchStatus[url].isPolling = true;
            }
            options.resolve?.(res, tmp);
          })
          .catch((res) => {
            fetchStatus[url].isInitialized = true;
            fetchStatus[url].isLoading = false;
            fetchStatus[url].polling.stop();
            fetchStatus[url].isPolling = false;
            options.reject?.(res, tmp);
          })
          .finally(() => {
            fetchStatus[url].isLoading = false;
            options.finally?.();
          });
      };

      f();
    }
    return () => {
      fetchStatus[url].polling.stop();
      fetchStatus[url].isPolling = false;
    };
  }, [url]);

  return {
    sent: axios.create({
      withCredentials: true,
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${getSession()?.access_token}`,
      },
    }),
    isInitialized: fetchStatus[url]?.isInitialized || false,
    isLoading: fetchStatus[url]?.isLoading || false,
    polling: fetchStatus[url]?.polling || null,
    isPolling: fetchStatus[url]?.isPolling || null,
  };
};
