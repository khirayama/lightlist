import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { useRouter } from "next/router";
import Link from "next/link";

import { useApp } from "hooks/useApp";
import { useProfile } from "hooks/useProfile";
import { usePreferences } from "hooks/usePreferences";
import { useTaskLists } from "hooks/useTaskLists";
import { Icon } from "libs/components/Icon";
import { TaskList } from "components/TaskList";
import { TaskListList } from "components/TaskListList";
import { UserSheet } from "components/UserSheet";
import { PreferencesSheet } from "components/PreferencesSheet";
import { useCustomTranslation } from "libs/i18n";
import { createDebounce } from "libs/common";

const scrollDebounce = createDebounce();

function isDrawerOpened() {
  const hash = location.href.split("#")[1];
  return hash === "opened";
}

export default function IndexPage() {
  const router = useRouter();

  const { t } = useCustomTranslation("pages.index");

  const [app, { updateApp }] = useApp();
  const [profile, { updateProfile }] = useProfile();
  const [preferences, { updatePreferences }] = usePreferences();
  const [, , { getTaskListsById }] = useTaskLists();

  const taskLists = getTaskListsById(app.taskListIds);

  const [isDrawerOpen, setIsDrawerOpen] = useState(isDrawerOpened());
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const [sortingTaskListId, setSortingTaskListId] = useState<string>("");
  const [currentTaskListId, setCurrentTaskListId] = useState<string>(
    app?.taskListIds[0] || ""
  );

  const taskListContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!currentTaskListId) {
      setCurrentTaskListId(app.taskListIds[0]);
    }
  }, [app]);

  useEffect(() => {
    const handleHashChange = () => {
      const drawer =
        document.querySelector<HTMLElement>(`[data-sectiondrawer]`);
      const main = document.querySelector<HTMLElement>(`[data-sectionmain]`);
      const selector = [
        "button",
        "a[href]",
        "input",
        "textarea",
        "select",
        "[role=button]",
        "[tabindex]",
      ].join(",");
      let el = null;
      if (isDrawerOpened()) {
        setIsDrawerOpen(true);
        el = drawer.querySelector(selector);
        el = drawer;
      } else {
        setIsDrawerOpen(false);
        el = main.querySelector(selector);
        el = main;
      }
      if (el) {
        el.focus();
        el.blur();
      }
    };

    setIsDrawerOpen(isDrawerOpened());
    router.events.on("hashChangeComplete", handleHashChange);
    return () => {
      router.events.off("hashChangeComplete", handleHashChange);
    };
  }, []);

  const handleTaskListLinkClick = (taskListId: string) => {
    router.push("/app");
    const parent = taskListContainerRef.current;
    const el = document.querySelector<HTMLElement>(
      `[data-tasklistid="${taskListId}"]`
    );
    if (parent && el) {
      parent.scrollLeft = el.offsetLeft;
    }
  };

  const handleSignedOut = () => {
    updateApp({
      taskListIds: [],
    });
    updateProfile({
      displayName: "",
      email: "",
    });
  };

  const onSettingsSheetOpenClick = () => setSettingsSheetOpen(true);
  const onUserSheetOpenClick = () => setUserSheetOpen(true);
  const isDrawerSectionDisabled = false;

  return (
    <>
      <div className="flex w-full h-full bg-gray-100 overflow-hidden">
        <section
          data-sectiondrawer
          className={clsx(
            "h-full bg-white z-30 border-r md:max-w-sm min-w-[320px] w-full md:w-[auto] absolute md:relative md:block -translate-x-full md:translate-x-0 transition-transform duration-[320ms]",
            isDrawerOpen && "translate-x-0"
          )}
        >
          <div className="flex md:hidden">
            <Link
              href="/app"
              className="flex items-center justify-center px-4 pt-4 w-full"
            >
              <Icon text="close" />
              <div className="flex-1" />
            </Link>
          </div>

          <div className="py-2">
            <button
              disabled={isDrawerSectionDisabled}
              className="flex items-center justify-center px-4 py-2 w-full"
              onClick={onUserSheetOpenClick}
            >
              <div className="flex-1 text-left">
                {profile?.displayName || profile?.email || t("Log In")}
              </div>
              <Icon text="person" />
            </button>

            <button
              disabled={isDrawerSectionDisabled}
              className="flex items-center justify-center px-4 py-2 w-full"
              onClick={onSettingsSheetOpenClick}
            >
              <div className="flex-1 text-left">{t("Preferences")}</div>
              <Icon text="settings" />
            </button>
          </div>
          <div className="pt-2 border-t">
            <TaskListList
              disabled={isDrawerSectionDisabled}
              taskLists={taskLists}
              handleTaskListLinkClick={handleTaskListLinkClick}
            />
          </div>
        </section>

        <section
          data-sectionmain
          className="flex flex-col h-full md:max-w-lg min-w-[375px] mx-auto w-full border-x"
        >
          <header className="flex p-4 bg-white">
            <Link
              href="/app#opened"
              className="flex md:hidden items-center justify-center"
            >
              <Icon text="list" />
            </Link>

            <div className="flex-1" />
          </header>

          <section
            ref={taskListContainerRef}
            className={clsx(
              "flex-1 bg-gray-100 flex relative w-full snap-mandatory snap-x flex-row flex-nowrap",
              /* FYI: Prevent x-scroll position when sorting after 2nd taskLists */
              sortingTaskListId ? "overflow-visible" : "overflow-scroll"
            )}
            onScroll={() => {
              scrollDebounce(() => {
                const parent = taskListContainerRef.current;
                if (parent) {
                  const els =
                    parent.querySelectorAll<HTMLElement>(`[data-tasklistid]`);
                  for (let i = 0; i < els.length; i++) {
                    if (Math.abs(els[i].offsetLeft - parent.scrollLeft) < 10) {
                      const taskListId = els[i].dataset.tasklistid;
                      if (taskListId !== currentTaskListId) {
                        setCurrentTaskListId(taskListId);
                        const el = window.document.activeElement as HTMLElement;
                        if (el?.blur) {
                          el.blur();
                        }
                      }
                      break;
                    }
                  }
                }
              }, 20);
            }}
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
                    "flex-none w-full snap-start snap-always relative",
                    {
                      hidden:
                        sortingTaskListId && sortingTaskListId !== taskList.id,
                    }
                  )}
                >
                  <div className="absolute w-full h-full overflow-scroll">
                    <TaskList
                      key={taskList.id}
                      disabled={currentTaskListId !== taskList.id}
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
          className="lg:w-[15%] w-[0px]" /* FYI: Spacer to adjust list centering*/
        />
      </div>

      <PreferencesSheet
        preferences={preferences}
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
        handlePreferencesChange={updatePreferences}
      />

      <UserSheet
        open={userSheetOpen}
        onOpenChange={setUserSheetOpen}
        handleSignedIn={() => setUserSheetOpen(false)}
        handleSignedOut={handleSignedOut}
      />
    </>
  );
}
