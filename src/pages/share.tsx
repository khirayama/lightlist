import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import { GlobalStateProvider, useGlobalState } from "globalstate/react";
import { createInitialState, config } from "config";
import { Icon } from "components/primitives/Icon";
import { TaskList } from "components/TaskList";
import { useCustomTranslation } from "ui/i18n";
import { updateApp } from "mutations";
import { AuthWorker } from "worker";

function getTaskListsWithShareCodes(shareCodes: string[]) {
  return fetch("/api/task-lists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ shareCodes }),
  }).then((res) => res.json());
}

const Content = () => {
  const router = useRouter();
  const shareCode = router.query.code as string;
  const { t } = useCustomTranslation("pages.share");
  const [
    {
      app,
      auth: { session },
    },
    ,
    mutate,
  ] = useGlobalState();

  const [isInitialized, setIsInitialized] = useState(false);
  const [taskList, setTaskList] = useState(null);

  const isLoggedIn = !!session;
  const distURL = isLoggedIn ? config.appBaseUrl : "/login";
  const hasTaskList = app.taskListIds.includes(taskList?.id);

  useEffect(() => {
    if (shareCode) {
      getTaskListsWithShareCodes([shareCode]).then((res) => {
        const tl = res.data.taskLists[0] || null;
        if (tl) {
          setTaskList(tl);
        }
        setIsInitialized(true);
      });
    }
  }, [shareCode]);

  return taskList ? (
    <>
      <section>
        <header className="mx-auto flex max-w-xl items-center justify-center p-2">
          <a
            href={distURL}
            className="rounded-sm p-2 focus-visible:bg-gray-200"
          >
            <img
              src="/logo.svg"
              alt="Lightlist"
              className="inline h-[1.5rem]"
            />
          </a>
          <div className="flex-1" />
          <a
            href={distURL}
            className="rounded-sm p-2 focus-visible:bg-gray-200"
          >
            <Icon text="close" />
          </a>
        </header>

        <section className="mx-auto max-w-xl p-2">
          {!hasTaskList && (
            <div>
              {isLoggedIn ? (
                <button
                  className="w-full rounded-sm border bg-gray-100 px-2 py-1 focus-visible:bg-gray-200"
                  disabled={hasTaskList}
                  onClick={() => {
                    mutate(updateApp, {
                      taskListIds: [...app.taskListIds, taskList.id],
                    });
                    router.push(distURL);
                  }}
                >
                  {t("Add my task list")}
                </button>
              ) : (
                <div className="text-center">
                  <a
                    href="/login"
                    className="inline-block w-full rounded-sm border bg-gray-100 px-2 py-1 focus-visible:bg-gray-200"
                  >
                    {t("Log in to add this task list")}
                  </a>
                </div>
              )}
            </div>
          )}
        </section>

        {hasTaskList ? (
          <div className="bg-red-400 p-2 text-center text-white">
            {t("Already added")}
          </div>
        ) : (
          <div className="bg-red-400 p-2 text-center text-white">
            {t("Please join {{name}} list!", {
              name: taskList.name,
            })}
          </div>
        )}
        <div className="border-t pb-8" />

        <div className="mx-auto max-w-xl">
          {!shareCode ? (
            <div className="py-12 text-center">{t("No share code")}</div>
          ) : !isInitialized ? (
            <div className="py-12 text-center">{t("Loading")}</div>
          ) : !taskList ? (
            <div className="py-12 text-center">
              {t("No matched task list with the share code")}
            </div>
          ) : (
            <TaskList key={taskList.id} app={app} taskList={taskList} />
          )}
        </div>
      </section>
    </>
  ) : null;
};

function AuthContent() {
  const router = useRouter();

  const [
    {
      auth: { session },
      isInitialized: { auth: isInitialized },
    },
    ,
  ] = useGlobalState();
  const isLoggedIn = !!session;

  if (isInitialized && !isLoggedIn) {
    router.push("/login");
    return null;
  }

  return (
    <>
      <AuthWorker />
      {isInitialized && isLoggedIn ? <Content /> : null}
    </>
  );
}

export default function SharePage() {
  return (
    <GlobalStateProvider<GlobalState> initialGlobalState={createInitialState()}>
      <AuthContent />
    </GlobalStateProvider>
  );
}
