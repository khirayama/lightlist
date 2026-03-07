import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useUserEmail } from "@lightlist/sdk/session";
import type { TaskList } from "@lightlist/sdk/types";
import { useTaskListIndexState } from "@lightlist/sdk/taskLists";
import {
  addSharedTaskListToOrder,
  createTaskList,
  fetchTaskListIdByShareCode,
  updateTaskListOrder,
} from "@lightlist/sdk/mutations/app";
import { useOptimisticReorder } from "@lightlist/sdk/hooks/useOptimisticReorder";
import { AppIcon } from "../components/ui/AppIcon";
import { Carousel } from "../components/ui/Carousel";
import { TaskListCard } from "../components/app/TaskListCard";
import { DrawerPanel } from "../components/app/DrawerPanel";
import { themes } from "../styles/theme";
import { useAppDirection } from "../context/appDirection";
import {
  logTaskListCreate,
  logShareCodeJoin,
  logTaskListReorder,
} from "@lightlist/sdk/analytics";

const EMPTY_TASK_LISTS: TaskList[] = [];

const Drawer = createDrawerNavigator();
const resolveTaskListBackground = (
  background: string | null,
  isDark: boolean,
): string =>
  background ?? (isDark ? themes.dark.background : themes.light.background);

type AppScreenContentProps = {
  selectedTaskListId: string | null;
  onSelectTaskList: (id: string | null) => void;
  taskLists: TaskList[];
};

const AppScreenContent = ({
  selectedTaskListId,
  onSelectTaskList,
  taskLists,
}: AppScreenContentProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWideLayout = width >= 1024;

  const [isTaskSorting, setIsTaskSorting] = useState(false);

  const stableTaskLists = taskLists.length > 0 ? taskLists : EMPTY_TASK_LISTS;

  const handleCarouselIndexChange = useCallback(
    (index: number) => {
      const taskList = stableTaskLists[index];
      if (taskList && taskList.id !== selectedTaskListId) {
        onSelectTaskList(taskList.id);
      }
    },
    [stableTaskLists, selectedTaskListId, onSelectTaskList],
  );

  const handleDeleted = useCallback(() => {
    const remainingLists = stableTaskLists.filter(
      (tl) => tl.id !== selectedTaskListId,
    );
    if (remainingLists.length > 0) {
      onSelectTaskList(remainingLists[0].id);
    } else {
      onSelectTaskList(null);
    }
  }, [stableTaskLists, selectedTaskListId, onSelectTaskList]);

  const showTaskListLocator = stableTaskLists.length > 1;
  const selectedTaskListIndex = Math.max(
    0,
    stableTaskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );

  const taskListHeader = (
    <View>
      <View className="mb-4">
        <View className="flex-row items-center justify-between gap-3">
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("app.drawerTitle")}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
            >
              <AppIcon
                name="menu"
                size={24}
                className="fill-text dark:fill-text-dark"
              />
            </Pressable>
          ) : null}
          <View className="flex-row items-center justify-end flex-wrap gap-2" />
        </View>
      </View>
    </View>
  );

  const indicator = showTaskListLocator ? (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("app.taskListLocator.label")}
      className="flex-row items-center justify-center gap-1.5 py-1 mb-2"
    >
      {stableTaskLists.map((taskList, index) => {
        const isSelected = index === selectedTaskListIndex;
        return (
          <Pressable
            key={taskList.id}
            accessibilityRole="tab"
            accessibilityLabel={t("app.taskListLocator.goTo", {
              index: index + 1,
              total: stableTaskLists.length,
            })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectTaskList(taskList.id)}
            className="w-4 h-4 justify-center items-center active:opacity-70"
          >
            <View
              className={`w-2 h-2 rounded-full bg-text dark:bg-text-dark ${
                isSelected ? "opacity-100" : "opacity-20"
              }`}
            />
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const taskListContent =
    stableTaskLists.length > 0 ? (
      <Carousel
        style={{ flex: 1 }}
        index={selectedTaskListIndex}
        onIndexChange={handleCarouselIndexChange}
        showIndicators={false}
        scrollEnabled={!isTaskSorting}
      >
        {stableTaskLists.map((taskList, index) => {
          const isActive = taskList.id === selectedTaskListId;
          const shouldRenderTaskListCard =
            Math.abs(index - selectedTaskListIndex) <= 1;

          return (
            <View
              key={taskList.id}
              style={{
                backgroundColor: resolveTaskListBackground(
                  taskList.background,
                  isDark,
                ),
              }}
              className="flex-1"
            >
              {!isWideLayout && <View className="h-[88px]" />}
              {shouldRenderTaskListCard ? (
                <TaskListCard
                  taskList={taskList}
                  isActive={isActive}
                  onActivate={onSelectTaskList}
                  onSortingChange={setIsTaskSorting}
                  onDeleted={handleDeleted}
                />
              ) : null}
            </View>
          );
        })}
      </Carousel>
    ) : (
      <View className="flex-1 justify-center items-center">
        <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
          {t("pages.tasklist.noTasks")}
        </Text>
      </View>
    );

  return (
    <View className="flex-1">
      {!isWideLayout && (
        <View className="absolute z-10 w-full px-4 max-w-[768px] self-center">
          {taskListHeader}
          {indicator}
        </View>
      )}
      {taskListContent}
    </View>
  );
};

type AppScreenProps = {
  onOpenSettings: () => void;
};

export const AppScreen = ({ onOpenSettings }: AppScreenProps) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const uiDirection = useAppDirection();
  const isWideLayout = width >= 1024;
  const userEmail = useUserEmail();
  const { hasStartupError, taskLists: taskListsData } = useTaskListIndexState();
  const persistTaskListReorder = useCallback(
    async (draggedTaskListId: string, targetTaskListId: string) => {
      await updateTaskListOrder(draggedTaskListId, targetTaskListId);
    },
    [],
  );
  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    taskListsData,
    persistTaskListReorder,
  );

  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (taskLists.length === 0) {
      setSelectedTaskListId(null);
      return;
    }
    if (
      !selectedTaskListId ||
      !taskLists.some((list) => list.id === selectedTaskListId)
    ) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [taskLists, selectedTaskListId]);

  const handleCreateList = useCallback(
    async (name: string, background: string | null): Promise<string> => {
      const newListId = await createTaskList(name, background);
      setSelectedTaskListId(newListId);
      logTaskListCreate();
      return newListId;
    },
    [],
  );

  const handleJoinList = useCallback(
    async (code: string): Promise<void> => {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) {
        throw new Error(t("pages.sharecode.enterCode"));
      }
      const taskListId = await fetchTaskListIdByShareCode(trimmedCode);
      if (!taskListId) {
        throw new Error(t("pages.sharecode.notFound"));
      }
      await addSharedTaskListToOrder(taskListId);
      setSelectedTaskListId(taskListId);
      logShareCodeJoin();
    },
    [t],
  );

  const handleReorderTaskList = useCallback(
    async (draggedTaskListId: string, targetTaskListId: string) => {
      if (!draggedTaskListId || !targetTaskListId) return;
      if (draggedTaskListId === targetTaskListId) return;
      try {
        await reorderTaskList(draggedTaskListId, targetTaskListId);
        logTaskListReorder();
      } catch {}
    },
    [reorderTaskList],
  );

  const handleSelectTaskList = useCallback((id: string | null) => {
    setSelectedTaskListId(id);
  }, []);

  const renderMainScreen = useCallback(() => {
    return (
      <AppScreenContent
        selectedTaskListId={selectedTaskListId}
        onSelectTaskList={handleSelectTaskList}
        taskLists={taskLists}
      />
    );
  }, [selectedTaskListId, handleSelectTaskList, taskLists]);

  if (hasStartupError) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark p-4">
        <Text className="text-sm text-error dark:text-error-dark text-center">
          {t("app.error")}
        </Text>
      </View>
    );
  }

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <DrawerPanel
          isWideLayout={isWideLayout}
          userEmail={userEmail}
          hasTaskLists={taskLists.length > 0}
          taskLists={taskLists}
          onReorderTaskList={handleReorderTaskList}
          selectedTaskListId={selectedTaskListId}
          onSelectTaskList={handleSelectTaskList}
          onCloseDrawer={() => props.navigation.closeDrawer()}
          onOpenSettings={onOpenSettings}
          onCreateList={handleCreateList}
          onJoinList={handleJoinList}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: isWideLayout ? "permanent" : "front",
        drawerPosition: uiDirection === "rtl" ? "right" : "left",
        drawerStyle: {
          width: isWideLayout ? 360 : Math.min(width, 420),
          borderRightWidth: isWideLayout && uiDirection !== "rtl" ? 1 : 0,
          borderLeftWidth: isWideLayout && uiDirection === "rtl" ? 1 : 0,
        },
      }}
    >
      <Drawer.Screen name="Main">{renderMainScreen}</Drawer.Screen>
    </Drawer.Navigator>
  );
};
