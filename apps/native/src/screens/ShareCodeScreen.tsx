import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { appStore } from "@lightlist/sdk/store";
import type { TaskList } from "@lightlist/sdk/types";
import {
  addSharedTaskListToOrder,
  fetchTaskListIdByShareCode,
} from "@lightlist/sdk/mutations/app";
import { TaskListCard } from "../components/app/TaskListCard";

type ShareCodeScreenProps = {
  initialShareCode: string | null;
  onBack: () => void;
  onOpenTaskList: () => void;
};

const getUserSnapshot = () => {
  return appStore.getState().user;
};

export const ShareCodeScreen = ({
  initialShareCode,
  onBack,
  onOpenTaskList,
}: ShareCodeScreenProps) => {
  const { t, i18n } = useTranslation();
  const user = useSyncExternalStore(appStore.subscribe, getUserSnapshot);
  const normalizedInitialShareCode =
    initialShareCode?.trim().toUpperCase() ?? "";
  const [shareCodeInput, setShareCodeInput] = useState(
    normalizedInitialShareCode,
  );
  const [activeShareCode, setActiveShareCode] = useState<string | null>(
    normalizedInitialShareCode ? normalizedInitialShareCode : null,
  );
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(normalizedInitialShareCode.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const sharedTaskListUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const normalized = initialShareCode?.trim().toUpperCase() ?? "";
    setShareCodeInput(normalized);
    setActiveShareCode(normalized ? normalized : null);
  }, [initialShareCode]);

  useEffect(() => {
    if (!activeShareCode) return;

    let cancelled = false;
    const loadTaskList = async () => {
      try {
        setLoading(true);
        setError(null);
        setAddToOrderError(null);
        setSharedTaskListId(null);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current = null;

        const taskListId = await fetchTaskListIdByShareCode(activeShareCode);
        if (cancelled) return;
        if (!taskListId) {
          setError(i18n.t("pages.sharecode.notFound"));
          return;
        }

        setSharedTaskListId(taskListId);
        sharedTaskListUnsubscribeRef.current =
          appStore.subscribeToSharedTaskList(taskListId);
      } catch {
        setError(i18n.t("pages.sharecode.error"));
        setSharedTaskListId(null);
        sharedTaskListUnsubscribeRef.current?.();
        sharedTaskListUnsubscribeRef.current = null;
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
  }, [activeShareCode, i18n]);

  useEffect(
    () => () => {
      sharedTaskListUnsubscribeRef.current?.();
    },
    [],
  );

  const getTaskListSnapshot = useCallback((): TaskList | null => {
    if (sharedTaskListId === null) return null;
    const state = appStore.getState();
    return (
      state.taskLists.find((list) => list.id === sharedTaskListId) ??
      state.sharedTaskListsById[sharedTaskListId] ??
      null
    );
  }, [sharedTaskListId]);
  const taskList: TaskList | null = useSyncExternalStore(
    appStore.subscribe,
    getTaskListSnapshot,
  );

  const handleShareCodeSubmit = () => {
    const normalized = shareCodeInput.trim().toUpperCase();
    if (normalized.length === 0) {
      setError(t("pages.sharecode.enterCode"));
      return;
    }
    setShareCodeInput(normalized);
    setActiveShareCode(normalized);
  };

  const canLoadShareCode = !loading && shareCodeInput.trim().length > 0;

  const handleAddToOrder = async () => {
    if (!taskList || !user) return;

    setAddToOrderLoading(true);
    setAddToOrderError(null);
    try {
      await addSharedTaskListToOrder(taskList.id);
      onOpenTaskList();
    } catch (err) {
      if (err instanceof Error && err.message) {
        setAddToOrderError(err.message);
      } else {
        setAddToOrderError(t("pages.sharecode.addToOrderError"));
      }
    } finally {
      setAddToOrderLoading(false);
    }
  };

  const taskListHeader = (
    <View>
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={onBack}
          className="rounded-[12px] border border-border dark:border-border-dark px-3 py-1.5 items-center active:opacity-90"
        >
          <Text className="text-[13px] font-inter-semibold text-text dark:text-text-dark">
            {t("common.back")}
          </Text>
        </Pressable>
        <Text className="text-[22px] font-inter-bold text-text dark:text-text-dark flex-1">
          {t("pages.sharecode.title")}
        </Text>
        {user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("pages.sharecode.addToOrder")}
            onPress={handleAddToOrder}
            disabled={!taskList || addToOrderLoading}
            className="rounded-[12px] border border-border dark:border-border-dark px-3 py-1.5 items-center active:opacity-90"
          >
            <Text className="text-[13px] font-inter-semibold text-text dark:text-text-dark">
              {addToOrderLoading
                ? t("pages.sharecode.addToOrderLoading")
                : t("pages.sharecode.addToOrder")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mb-6">
        <Text className="text-[13px] font-inter text-muted dark:text-muted-dark leading-[18px] mb-4">
          {t("pages.sharecode.description")}
        </Text>
        <View className="gap-1.5 mb-4">
          <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
            {t("pages.sharecode.codeLabel")}
          </Text>
          <TextInput
            className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
            value={shareCodeInput}
            onChangeText={(value) => {
              setShareCodeInput(value);
              setError(null);
            }}
            placeholder={t("pages.sharecode.codePlaceholder")}
            placeholderClassName="text-placeholder dark:text-placeholder-dark"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleShareCodeSubmit}
            editable={!loading}
            accessibilityLabel={t("pages.sharecode.codeLabel")}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pages.sharecode.load")}
          onPress={handleShareCodeSubmit}
          disabled={!canLoadShareCode}
          className={`rounded-[12px] py-3.5 items-center active:opacity-90 ${
            canLoadShareCode
              ? "bg-primary dark:bg-primary-dark"
              : "bg-border dark:bg-border-dark"
          }`}
        >
          <Text
            className={`text-[16px] font-inter-semibold ${
              canLoadShareCode
                ? "text-primary-text dark:text-primary-text-dark"
                : "text-muted dark:text-muted-dark"
            }`}
          >
            {loading ? t("common.loading") : t("pages.sharecode.load")}
          </Text>
        </Pressable>
        {loading ? <ActivityIndicator className="mt-4" /> : null}
        {error ? (
          <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-4">
            {error}
          </Text>
        ) : null}
        {addToOrderError ? (
          <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-4">
            {addToOrderError}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <View className="px-4 pb-0 max-w-[768px] w-full self-center">
        {taskListHeader}
      </View>
      {taskList ? (
        <View
          style={
            taskList.background
              ? { backgroundColor: taskList.background }
              : undefined
          }
          className={`flex-1 ${!taskList.background ? "bg-background dark:bg-background-dark" : ""}`}
        >
          <TaskListCard
            taskList={taskList}
            isActive={true}
            t={t}
            enableEditDialog={false}
            enableShareDialog={false}
          />
        </View>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-[15px] font-inter text-muted dark:text-muted-dark">
            {t("pages.tasklist.noTasks")}
          </Text>
        </View>
      )}
    </View>
  );
};
