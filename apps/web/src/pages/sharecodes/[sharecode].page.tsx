import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { onAuthStateChange } from "@lightlist/sdk/auth";
import { AppState, User } from "@lightlist/sdk/types";
import {
  fetchTaskListIdByShareCode,
  addSharedTaskListToOrder,
} from "@lightlist/sdk/mutations/app";
import { appStore } from "@lightlist/sdk/store";
import { resolveErrorMessage } from "@/utils/errors";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { AppIcon } from "@/components/ui/AppIcon";
import { TaskListCard } from "@/components/app/TaskListCard";

export default function ShareCodePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sharecode } = router.query;

  const storeState = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
    appStore.getServerSnapshot,
  );
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const sharedTaskListUnsubscribeRef = useRef<(() => void) | null>(null);

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
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!sharecode || typeof sharecode !== "string") return;

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
          sharedTaskListUnsubscribeRef.current?.();
          sharedTaskListUnsubscribeRef.current = null;
          return;
        }

        setSharedTaskListId(taskListId);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current =
          appStore.subscribeToSharedTaskList(taskListId);
      } catch (err) {
        setError(resolveErrorMessage(err, t, "pages.sharecode.error"));
        setSharedTaskListId(null);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current = null;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTaskList();
    return () => {
      cancelled = true;
    };
  }, [sharecode, t]);

  useEffect(
    () => () => {
      sharedTaskListUnsubscribeRef.current?.();
    },
    [],
  );

  const taskList =
    sharedTaskListId === null
      ? null
      : (storeState.taskLists.find((tl) => tl.id === sharedTaskListId) ??
        storeState.sharedTaskListsById[sharedTaskListId] ??
        null);
  const taskInsertPosition =
    storeState.settings?.taskInsertPosition === "bottom" ? "bottom" : "top";

  const handleAddToOrder = async () => {
    if (!taskList || !user) return;

    try {
      setAddToOrderLoading(true);
      setAddToOrderError(null);
      await addSharedTaskListToOrder(taskList.id);
      router.push("/app");
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
      <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
        <div className="bg-white p-4 shadow-sm dark:bg-gray-800">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
      <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
        <div className="bg-white p-4 shadow-sm dark:bg-gray-800">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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

      <main className="flex-1 overflow-hidden">
        {addToOrderError && (
          <div className="p-4 pb-0">
            <Alert variant="error">{addToOrderError}</Alert>
          </div>
        )}

        <div className="h-full mx-auto w-full max-w-3xl">
          <TaskListCard
            taskList={taskList}
            taskInsertPosition={taskInsertPosition}
            isActive={true}
            sensorsList={sensors}
            t={t}
          />
        </div>
      </main>
    </div>
  );
}
