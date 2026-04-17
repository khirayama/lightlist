import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { addSharedTaskListToOrder, fetchTaskListIdByShareCode } from "@/common";
import { useUser } from "@/common";
import { useTaskList } from "@/common";
import { resolveErrorMessage } from "@/common";
import { logShare, logShareCodeJoin } from "@/common";
import { Alert, AppIcon, Spinner, TaskListCard } from "@/common";

export default function SharecodesPage() {
  const { t } = useTranslation();
  const user = useUser();
  const [sharecode, setSharecode] = useState<string | null>(null);
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get("code");
    setSharecode(code);
    if (!code) {
      setError(t("pages.sharecode.notFound"));
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!sharecode) return;

    let cancelled = false;

    const loadTaskList = async () => {
      try {
        setLoading(true);
        setError(null);
        const taskListId = await fetchTaskListIdByShareCode(sharecode);
        if (cancelled) return;
        if (!taskListId) {
          setSharedTaskListId(null);
          setError(t("pages.sharecode.notFound"));
          return;
        }

        setSharedTaskListId(taskListId);
        logShare();
      } catch (err) {
        setError(resolveErrorMessage(err, t, "pages.sharecode.error"));
        setSharedTaskListId(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTaskList();
    return () => {
      cancelled = true;
    };
  }, [sharecode, t]);

  const taskList = useTaskList(sharedTaskListId);

  const handleAddToOrder = async () => {
    if (!taskList || !user) return;

    try {
      setAddToOrderLoading(true);
      setAddToOrderError(null);
      await addSharedTaskListToOrder(taskList.id);
      logShareCodeJoin();
      window.location.assign("/app");
    } catch (err) {
      setAddToOrderError(
        resolveErrorMessage(err, t, "pages.sharecode.addToOrderError"),
      );
    } finally {
      setAddToOrderLoading(false);
    }
  };

  if (loading) return <Spinner fullPage />;

  if (error) {
    return (
      <div className="flex h-full flex-col bg-background dark:bg-background-dark">
        <div className="bg-surface p-4 shadow-sm dark:bg-surface-dark">
          <button
            onClick={() => window.history.back()}
            className="rounded-full p-2 text-muted hover:bg-background dark:text-muted-dark dark:hover:bg-surface-dark"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  if (!loading && sharedTaskListId && !taskList) return <Spinner fullPage />;

  if (!taskList) {
    return (
      <div className="flex h-full flex-col bg-background dark:bg-background-dark">
        <div className="bg-surface p-4 shadow-sm dark:bg-surface-dark">
          <button
            onClick={() => window.history.back()}
            className="rounded-full p-2 text-muted hover:bg-background dark:text-muted-dark dark:hover:bg-surface-dark"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-center text-muted dark:text-muted-dark">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background dark:bg-background-dark">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
        <button
          onClick={() => window.history.back()}
          className="rounded-full p-2 text-muted hover:bg-background dark:text-muted-dark dark:hover:bg-surface-dark"
          aria-label={t("common.back")}
        >
          <AppIcon name="arrow-back" className="h-6 w-6" />
        </button>
        {user && (
          <button
            onClick={handleAddToOrder}
            disabled={addToOrderLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {addToOrderLoading
              ? t("common.loading")
              : t("pages.sharecode.addToOrder")}
          </button>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-hidden">
        {addToOrderError && (
          <div className="p-4 pb-0">
            <Alert variant="error">{addToOrderError}</Alert>
          </div>
        )}

        <div className="mx-auto h-full w-full max-w-3xl">
          <TaskListCard
            taskList={taskList}
            isActive={true}
            sensorsList={sensors}
          />
        </div>
      </main>
    </div>
  );
}
