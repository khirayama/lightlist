import { useRouter } from "next/router";

import { GlobalStateProvider } from "v2/libs/globalState";
import { AppPageStackProvider } from "v2/libs/ui/navigation";
import { useAuth, AuthProvider } from "v2/common/auth";
import { config } from "v2/common/globalStateConfig";
import { useApp } from "v2/hooks/useApp";
import { useTaskLists } from "v2/hooks/useTaskLists";
import { TaskList } from "v2/components/TaskList";
import { UserSheet } from "v2/components/UserSheet";
import { AppPageLink } from "v2/libs/ui/navigation";
import { useCustomTranslation } from "v2/libs/i18n";
import { Icon } from "v2/libs/ui/components/Icon";

const Content = () => {
  const router = useRouter();
  const shareCode = router.query.code as string;
  const { t } = useCustomTranslation("pages.share");

  const [{ data: app }, { updateApp }] = useApp();
  const [{ data: taskLists, isInitialized }] = useTaskLists();
  const taskList = Object.values(taskLists).find(
    (taskList) => taskList.shareCode === shareCode,
  );
  const [{ isLoggedIn }] = useAuth();

  const hasTaskList = app.taskListIds.includes(taskList?.id);
  const distURL = isLoggedIn ? "/app" : "/login";

  return (
    <>
      <section>
        <header className="mx-auto flex max-w-xl items-center justify-center p-2">
          <AppPageLink
            href={distURL}
            className="rounded p-2 focus-visible:bg-gray-200"
          >
            <img
              src="/logo.svg"
              alt="Lightlist"
              className="inline h-[1.5rem]"
            />
          </AppPageLink>
          <div className="flex-1" />
          <AppPageLink
            href={distURL}
            className="rounded p-2 focus-visible:bg-gray-200"
          >
            <Icon text="close" />
          </AppPageLink>
        </header>

        <section className="mx-auto max-w-xl p-2">
          {!hasTaskList && (
            <div>
              {isLoggedIn ? (
                <button
                  className="w-full rounded border bg-gray-100 px-2 py-1 focus-visible:bg-gray-200"
                  disabled={hasTaskList}
                  onClick={() => {
                    updateApp({
                      taskListIds: [...app.taskListIds, taskList.id],
                    });
                    router.push(distURL);
                  }}
                >
                  {t("Add my task list")}
                </button>
              ) : (
                <div className="text-center">
                  <AppPageLink
                    href="/login"
                    params={{ redirect: location.href }}
                    className="inline-block w-full rounded border bg-gray-100 px-2 py-1 focus-visible:bg-gray-200"
                  >
                    {t("Log in to add this task list")}
                  </AppPageLink>
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
              name: taskList?.name,
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
            <TaskList key={taskList.id} taskListId={taskList.id} />
          )}
        </div>
      </section>

      <UserSheet />
    </>
  );
};

const AuthContent = () => {
  const [{ isInitialized }] = useAuth();
  return isInitialized ? <Content /> : <div>Loading...</div>;
};

export default function SharePage() {
  return (
    <AuthProvider>
      <AppPageStackProvider>
        <GlobalStateProvider config={config}>
          <AuthContent />
        </GlobalStateProvider>
      </AppPageStackProvider>
    </AuthProvider>
  );
}
