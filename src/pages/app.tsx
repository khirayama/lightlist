import { v4 as uuid } from "uuid";
import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { useRouter } from "next/router";
import Head from "next/head";
import qs from "query-string";

import { resetFetchStatus } from "hooks/common";
import { useApp } from "hooks/useApp";
import { useProfile } from "hooks/useProfile";
import { usePreferences } from "hooks/usePreferences";
import { useTaskLists } from "hooks/useTaskLists";
import { Icon } from "components/Icon";
import { TaskList } from "components/TaskList";
import { TaskListList } from "components/TaskListList";
import { UserSheet } from "components/UserSheet";
import { PreferencesSheet } from "components/PreferencesSheet";
import { DatePickerSheet } from "components/DatePickerSheet";
import { useCustomTranslation } from "libs/i18n";
import { createDebounce, isNarrowLayout } from "libs/common";
import { ParamsLink } from "components/ParamsLink";
import { useSupabase } from "libs/supabase";

const scrollDebounce = createDebounce();

function isDrawerOpened() {
  return qs.parse(window.location.search).drawer === "opened";
}

function isSettingsSheetOpened() {
  return qs.parse(window.location.search).sheet === "settings";
}

function isUserSheetOpened() {
  return qs.parse(window.location.search).sheet === "user";
}

function isDatePickerSheetOpened() {
  return qs.parse(window.location.search).sheet === "datepicker";
}

const AppPageContent = () => {
  const router = useRouter();
  const { t, i18n } = useCustomTranslation("pages.app");

  const [{ data: app, isInitialized: isAppInitialized }, { updateApp }] =
    useApp("/api/app");
  const [{ data: profile }] = useProfile("/api/profile");
  const [{ data: preferences }, { updatePreferences }] =
    usePreferences("/api/preferences");
  const [, { createTaskList }, { getTaskListsById }] =
    useTaskLists("/api/task-lists");

  const [isDrawerOpen, setIsDrawerOpen] = useState(isDrawerOpened());
  const [isDrawerDisabled, setIsDrawerDisabled] = useState(
    isNarrowLayout() && !isDrawerOpen,
  );
  const [sortingTaskListId, setSortingTaskListId] = useState<string>("");
  const [currentTaskListId, setCurrentTaskListId] = useState<string>(
    app?.taskListIds[0] || "",
  );
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const taskListContainerRef = useRef<HTMLElement>(null);
  const taskLists = getTaskListsById(app.taskListIds);
  const closeDrawer = () => router.back();

  useEffect(() => {
    document.documentElement.classList.add("bg");
  }, []);

  useEffect(() => {
    updateApp({ online: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateApp({ online: true });
      } else {
        updateApp({ online: false });
      }
    };
    window.addEventListener("beforeunload", () => {
      updateApp({ online: false });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (
      preferences.theme === "DARK" ||
      (preferences.theme === "SYSTEM" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [preferences]);

  useEffect(() => {
    setIsInstalledPWA(
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        window.matchMedia("(display-mode: standalone)").matches,
    );

    window.addEventListener("beforeinstallprompt", (e) => {
      setDeferredPrompt(e);
    });
  }, []);

  useEffect(() => {
    if (isAppInitialized && !app.taskListIds.length) {
      const newTaskList: TaskList = {
        id: uuid(),
        name: "📋 " + t("PERSONAL"),
        taskIds: [],
        shareCode: "",
      };
      const newTaskLists = [...taskLists, newTaskList];
      createTaskList(newTaskList);
      updateApp({ taskListIds: newTaskLists.map((tl) => tl.id) });

      const lang =
        (qs.parse(window.location.search).lang as string)?.toUpperCase() ||
        preferences.lang;
      const supportedLngs = Object.keys(i18n.options.resources).map((lang) =>
        lang.toUpperCase(),
      );
      if (supportedLngs.indexOf(lang) !== -1) {
        updatePreferences({ lang: lang as Preferences["lang"] });
      }
    }
  }, [isAppInitialized, app]);

  useEffect(() => {
    i18n.changeLanguage(preferences.lang.toLowerCase());
  }, [preferences.lang.toLowerCase()]);

  useEffect(() => {
    if (!currentTaskListId) {
      setCurrentTaskListId(app.taskListIds[0]);
    }
  }, [app]);

  useEffect(() => {
    const handleResize = () => {
      setIsDrawerDisabled(isNarrowLayout() && !isDrawerOpen);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isNarrowLayout(), isDrawerOpen]);

  useEffect(() => {
    const handleScroll = () => {
      scrollDebounce(() => {
        const parent = taskListContainerRef.current;
        if (parent) {
          const els = parent.querySelectorAll<HTMLElement>(`[data-tasklistid]`);
          for (let i = 0; i < els.length; i++) {
            if (Math.abs(els[i].offsetLeft - parent.scrollLeft) < 10) {
              const taskListId = els[i].dataset.tasklistid;
              if (taskListId !== currentTaskListId) {
                setCurrentTaskListId(taskListId);
                const el = window.document.activeElement as HTMLElement;
                el.blur();
              }
              break;
            }
          }
        }
      }, 30);
    };

    handleScroll();
    taskListContainerRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      taskListContainerRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, [app, currentTaskListId]);

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

  const scrollToTaskList = (taskListId: string) => {
    const parent = taskListContainerRef.current;
    const el = document.querySelector<HTMLElement>(
      `[data-tasklistid="${taskListId}"]`,
    );
    if (parent && el) {
      parent.scrollLeft = el.offsetLeft;
      setTimeout(() => {
        const text = el.querySelector<HTMLInputElement>("[data-tasktext]");
        text.focus();
      }, 100);
    }
  };

  const handleTaskListLinkClick = (taskListId: string) => {
    if (isNarrowLayout()) {
      closeDrawer();
    }
    scrollToTaskList(taskListId);
  };

  const handleSignedOut = () => {
    router.push("/login");
    resetFetchStatus();
  };

  const isDarkTheme =
    preferences.theme === "DARK" ||
    (preferences.theme === "SYSTEM" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <>
      <Head>
        <meta
          name="theme-color"
          content={isDarkTheme ? "rgb(31, 41, 55)" : "rgb(255, 255, 255)"}
        />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div className="bg flex h-full w-full overflow-hidden">
        <section
          data-sectiondrawer
          className={clsx(
            "bg absolute z-30 h-full w-full min-w-[320px] -translate-x-full transition-transform duration-[320ms] md:relative md:block md:w-[auto] md:max-w-sm md:translate-x-0",
            isDrawerOpen && "translate-x-0",
            !isNarrowLayout() && "border-r",
          )}
        >
          <div className="flex md:hidden">
            <div className="p-1">
              <button
                disabled={isDrawerDisabled}
                className="rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
                onClick={closeDrawer}
              >
                <Icon text="close" />
              </button>
            </div>
            <div className="flex-1" />
          </div>

          <div className="p-2">
            <ParamsLink
              data-trigger="user"
              tabIndex={isDrawerDisabled ? -1 : 0}
              className="flex w-full items-center justify-center rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              href="/app"
              params={{ sheet: "user", trigger: "user" }}
              mergeParams
            >
              <Icon text="person" />
              <div className="flex-1 pl-2 text-left">
                {profile?.displayName || profile?.email || t("Log in")}
              </div>
            </ParamsLink>

            <ParamsLink
              data-trigger="settings"
              tabIndex={isDrawerDisabled ? -1 : 0}
              className="flex w-full items-center justify-center rounded p-2 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
              href="/app"
              params={{ sheet: "settings", trigger: "settings" }}
              mergeParams
            >
              <Icon text="settings" />
              <div className="flex-1 pl-2 text-left">{t("Preferences")}</div>
            </ParamsLink>

            {!isInstalledPWA && deferredPrompt ? (
              <div className="p-2">
                <button
                  className="w-full rounded border bg-gray-100 px-2 py-1 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
                  onClick={() => {
                    deferredPrompt.prompt();
                  }}
                >
                  {t("Install app")}
                </button>
              </div>
            ) : null}
          </div>

          <div className="border-t pt-2">
            <TaskListList
              disabled={isDrawerDisabled}
              taskLists={taskLists}
              handleTaskListLinkClick={handleTaskListLinkClick}
            />
          </div>
        </section>

        <section
          data-sectionmain
          className="mx-auto flex h-full w-full min-w-[375px] flex-col md:max-w-xl"
        >
          <header className="flex p-1">
            <ParamsLink
              tabIndex={!isDrawerDisabled && isDrawerOpen ? -1 : 0}
              className="flex items-center justify-center rounded p-2 focus-visible:bg-gray-200 md:hidden dark:fill-white dark:focus-visible:bg-gray-700"
              href="/app"
              params={{ drawer: "opened" }}
              mergeParams
            >
              <Icon text="menu" />
            </ParamsLink>

            <div className="flex-1" />
          </header>

          <div className="flex items-center justify-center py-2">
            {taskLists.map((taskList, i) => {
              return (
                <button
                  tabIndex={!isDrawerDisabled && isDrawerOpen ? -1 : 0}
                  key={`${i}-${taskList.id}`}
                  className={clsx(
                    "mx-1 h-1 w-1 rounded-full focus-visible:bg-gray-800 dark:focus-visible:bg-gray-200",
                    currentTaskListId === taskList.id
                      ? "bg-gray-500"
                      : "bg-gray-200",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToTaskList(taskList.id);
                  }}
                />
              );
            })}
          </div>

          <section
            ref={taskListContainerRef}
            className={clsx(
              "relative flex w-full flex-1 snap-x snap-mandatory flex-row flex-nowrap",
              /* FYI: Prevent x-scroll position when sorting after 2nd taskLists */
              sortingTaskListId ? "overflow-visible" : "overflow-scroll",
            )}
          >
            {taskLists.map((taskList: TaskList) => {
              const handleDragStart = () => {
                setSortingTaskListId(taskList.id);
              };
              const handleDragEnd = () => {
                setSortingTaskListId("");
              };

              return (
                <div
                  data-tasklistid={taskList.id}
                  key={taskList.id}
                  className={clsx(
                    "relative w-full flex-none snap-start snap-always",
                    {
                      hidden:
                        sortingTaskListId && sortingTaskListId !== taskList.id,
                    },
                  )}
                >
                  <div className="absolute h-full w-full overflow-scroll">
                    <TaskList
                      key={taskList.id}
                      disabled={
                        currentTaskListId !== taskList.id ||
                        (!isDrawerDisabled && isDrawerOpen)
                      }
                      taskList={taskList}
                      handleDragStart={handleDragStart}
                      handleDragCancel={handleDragEnd}
                      handleDragEnd={handleDragEnd}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        </section>

        <section
          className="w-[0px] lg:w-[10%]" /* FYI: Spacer to adjust list centering*/
        />
      </div>

      <PreferencesSheet open={isSettingsSheetOpened} />

      <UserSheet open={isUserSheetOpened} handleSignedOut={handleSignedOut} />

      <DatePickerSheet
        open={isDatePickerSheetOpened}
        handleChange={() => router.back()}
        handleCancel={() => router.back()}
      />
    </>
  );
};

export default function AppPage() {
  /* Page Stack Control and support fast refresh */
  const isInitialRender = useRef(true);
  useEffect(() => {
    const isFastRefresh = !isInitialRender.current;
    if (!isFastRefresh) {
      const query = qs.parse(window.location.search);
      if (Object.keys(query).length) {
        const tmp = window.location.href;
        window.history.replaceState({}, "", "/app");
        window.history.pushState({}, "", tmp);
      }
    }
    isInitialRender.current = false;
  }, []);

  const router = useRouter();
  const { isLoggedIn, isInitialized } = useSupabase();
  if (isInitialized && !isLoggedIn) {
    router.push("/login");
  }
  return isInitialized && isLoggedIn ? <AppPageContent /> : null;
}
