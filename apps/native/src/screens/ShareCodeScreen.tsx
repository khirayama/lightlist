import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { styles } from "../styles/appStyles";
import { useTheme } from "../styles/theme";

type ShareCodeScreenProps = {
  initialShareCode: string | null;
  onBack: () => void;
  onOpenTaskList: () => void;
};

export const ShareCodeScreen = ({
  initialShareCode,
  onBack,
  onOpenTaskList,
}: ShareCodeScreenProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const storeState = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
  );
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
          setError(t("pages.sharecode.notFound"));
          return;
        }

        setSharedTaskListId(taskListId);
        sharedTaskListUnsubscribeRef.current =
          appStore.subscribeToSharedTaskList(taskListId);
      } catch {
        setError(t("pages.sharecode.error"));
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
  }, [activeShareCode, t]);

  useEffect(
    () => () => {
      sharedTaskListUnsubscribeRef.current?.();
    },
    [],
  );

  const user = storeState.user;
  const taskList: TaskList | null =
    sharedTaskListId === null
      ? null
      : (storeState.taskLists.find((list) => list.id === sharedTaskListId) ??
        storeState.sharedTaskListsById[sharedTaskListId] ??
        null);

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
      <View style={styles.settingsHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerButton,
            {
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.headerButtonText, { color: theme.text }]}>
            {t("common.back")}
          </Text>
        </Pressable>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>
          {t("pages.sharecode.title")}
        </Text>
        {user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("pages.sharecode.addToOrder")}
            onPress={handleAddToOrder}
            disabled={!taskList || addToOrderLoading}
            style={({ pressed }) => [
              styles.headerButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.headerButtonText, { color: theme.text }]}>
              {addToOrderLoading
                ? t("pages.sharecode.addToOrderLoading")
                : t("pages.sharecode.addToOrder")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.helpText, { color: theme.muted }]}>
          {t("pages.sharecode.description")}
        </Text>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            {t("pages.sharecode.codeLabel")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
            value={shareCodeInput}
            onChangeText={(value) => {
              setShareCodeInput(value);
              setError(null);
            }}
            placeholder={t("pages.sharecode.codePlaceholder")}
            placeholderTextColor={theme.placeholder}
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
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: canLoadShareCode ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: canLoadShareCode ? theme.primaryText : theme.muted,
              },
            ]}
          >
            {loading ? t("common.loading") : t("pages.sharecode.load")}
          </Text>
        </Pressable>
        {loading ? <ActivityIndicator color={theme.primary} /> : null}
        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}
        {addToOrderError ? (
          <Text style={[styles.error, { color: theme.error }]}>
            {addToOrderError}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.appContent, { paddingBottom: 0 }]}>
        {taskListHeader}
      </View>
      {taskList ? (
        <View
          style={{
            flex: 1,
            backgroundColor: taskList.background ?? theme.background,
          }}
        >
          <TaskListCard
            taskList={taskList}
            isActive={true}
            t={t}
            // 共有画面ではリスト自体の編集は不可
            enableEditDialog={false}
            enableShareDialog={false}
          />
        </View>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {t("pages.tasklist.noTasks")}
          </Text>
        </View>
      )}
    </View>
  );
};
