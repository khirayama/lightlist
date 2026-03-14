import { useCallback, useMemo, useState } from "react";
import {
  InteractionManager,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import ReorderableList, {
  type ReorderableListRenderItem,
  type ReorderableListReorderEvent,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import { Gesture } from "react-native-gesture-handler";
import { AppIcon } from "../ui/AppIcon";
import { Dialog } from "../ui/Dialog";
import { CalendarSheet } from "./CalendarSheet";
import type { TaskList } from "@lightlist/sdk/types";
import { listColors } from "../../styles/theme";

type ColorOption = {
  value: string | null;
  label?: string;
  shortLabel?: string;
  preview?: string;
};

type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  onReorderTaskList: (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  onCreateList: (name: string, background: string | null) => Promise<string>;
  onJoinList: (code: string) => Promise<void>;
};

const noop = () => {};

export const DrawerPanel = (props: DrawerPanelProps) => {
  const {
    isWideLayout,
    userEmail,
    hasTaskLists,
    taskLists,
    onReorderTaskList,
    selectedTaskListId,
    onSelectTaskList,
    onCloseDrawer,
    onOpenSettings,
    onCreateList,
    onJoinList,
  } = props;

  const { t } = useTranslation();

  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [createListInput, setCreateListInput] = useState("");
  const [createListBackground, setCreateListBackground] = useState<
    string | null
  >(null);

  const [showJoinListDialog, setShowJoinListDialog] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [joiningList, setJoiningList] = useState(false);
  const [joinListError, setJoinListError] = useState<string | null>(null);

  const canCreateList = createListInput.trim().length > 0;
  const canJoinList = !joiningList && joinListInput.trim().length > 0;
  const canDragList = hasTaskLists && taskLists.length > 1;
  const listPanGesture = useMemo(
    () => Gesture.Pan().activeOffsetY([-12, 12]).failOffsetX([-24, 24]),
    [],
  );

  const moveUpLabel = t("app.moveUp");
  const moveDownLabel = t("app.moveDown");
  const taskListNameLabel = t("app.taskListName");
  const reorderLabel = t("taskList.reorder");

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    const name = createListInput.trim();
    await onCreateList(name, createListBackground);
    setCreateListInput("");
    setCreateListBackground(null);
    setShowCreateListDialog(false);
  };

  const handleJoinListSubmit = async () => {
    if (!canJoinList) return;
    const code = joinListInput.trim();
    setJoiningList(true);
    setJoinListError(null);
    try {
      await onJoinList(code);
      setJoinListInput("");
      setShowJoinListDialog(false);
    } catch (err) {
      setJoinListError(
        err instanceof Error ? err.message : t("pages.sharecode.error"),
      );
    } finally {
      setJoiningList(false);
    }
  };

  const closeDrawerAndSelectTaskList = useCallback(
    (taskListId: string) => {
      if (isWideLayout) {
        onSelectTaskList(taskListId);
        return;
      }
      onCloseDrawer();
      InteractionManager.runAfterInteractions(() => {
        onSelectTaskList(taskListId);
      });
    },
    [isWideLayout, onCloseDrawer, onSelectTaskList],
  );

  const handleSelectTaskList = useCallback(
    (taskListId: string) => {
      closeDrawerAndSelectTaskList(taskListId);
    },
    [closeDrawerAndSelectTaskList],
  );

  const handleOpenSettings = useCallback(() => {
    onCloseDrawer();
    onOpenSettings();
  }, [onCloseDrawer, onOpenSettings]);

  const keyExtractorTaskList = useCallback((item: TaskList) => {
    return item.id;
  }, []);
  const handleTaskListReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const draggedList = taskLists[from];
      const targetList = taskLists[to];
      if (!draggedList || !targetList || from === to) return;
      void onReorderTaskList(draggedList.id, targetList.id);
    },
    [onReorderTaskList, taskLists],
  );
  const TaskListRow = ({ item, index }: { item: TaskList; index: number }) => {
    const drag = useReorderableDrag();
    const isDragActive = useIsActive();
    const isSelected = item.id === selectedTaskListId;
    const currentIndex = index;
    const canMoveListUp = canDragList && currentIndex > 0;
    const canMoveListDown =
      canDragList && currentIndex >= 0 && currentIndex < taskLists.length - 1;
    const accessibilityActions: { name: string; label: string }[] = [];

    if (canMoveListUp) {
      accessibilityActions.push({
        name: "moveUp",
        label: moveUpLabel,
      });
    }
    if (canMoveListDown) {
      accessibilityActions.push({
        name: "moveDown",
        label: moveDownLabel,
      });
    }

    const handleMoveListByOffset = (offset: number) => {
      if (!canDragList || currentIndex < 0) return;
      const targetList = taskLists[currentIndex + offset];
      if (!targetList) return;
      void onReorderTaskList(item.id, targetList.id);
    };

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={item.name || taskListNameLabel}
        onPress={() => handleSelectTaskList(item.id)}
        className={`rounded-[10px] border border-transparent p-2 flex-row items-center gap-2 active:opacity-90 ${
          isSelected
            ? "bg-input-background dark:bg-input-background-dark"
            : "bg-transparent"
        } ${isDragActive ? "opacity-50" : ""}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reorderLabel}
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "moveUp") {
              handleMoveListByOffset(-1);
              return;
            }
            if (event.nativeEvent.actionName === "moveDown") {
              handleMoveListByOffset(1);
            }
          }}
          onPressIn={canDragList ? drag : undefined}
          onPress={noop}
          disabled={!canDragList}
          className="rounded-[10px] p-1 items-center justify-center active:opacity-80"
        >
          <AppIcon
            name="drag-indicator"
            className={
              canDragList
                ? "fill-text dark:fill-text-dark"
                : "fill-muted dark:fill-muted-dark"
            }
          />
        </Pressable>
        <View
          style={
            item.background ? { backgroundColor: item.background } : undefined
          }
          className={`w-3 h-3 rounded-full border border-border dark:border-border-dark ${
            !item.background ? "bg-background dark:bg-background-dark" : ""
          }`}
        />
        <View className="flex-1 gap-0.5">
          <Text
            className={`text-[14px] font-inter-semibold text-text dark:text-text-dark ${
              isSelected ? "font-inter-bold" : ""
            }`}
            numberOfLines={1}
          >
            {item.name || taskListNameLabel}
          </Text>
          <Text className="text-[12px] font-inter text-muted dark:text-muted-dark">
            {t("taskList.taskCount", {
              count: item.tasks.length,
            })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderTaskListItem: ReorderableListRenderItem<TaskList> = ({
    item,
    index,
  }) => {
    return <TaskListRow item={item} index={index} />;
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark p-4">
      <View className="flex-row items-center justify-between gap-2 mb-4">
        <View className="flex-1 min-w-0">
          <Text
            className="text-[18px] font-inter-bold text-text dark:text-text-dark"
            numberOfLines={1}
          >
            {userEmail}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.title")}
            onPress={handleOpenSettings}
            className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
          >
            <AppIcon
              name="settings"
              className="fill-text dark:fill-text-dark"
            />
          </Pressable>
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={onCloseDrawer}
              className="rounded-[12px] p-2.5 items-center justify-center active:opacity-90"
            >
              <AppIcon name="close" className="fill-text dark:fill-text-dark" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <CalendarSheet
        isWideLayout={isWideLayout}
        taskLists={taskLists}
        onSelectTaskList={onSelectTaskList}
        onCloseDrawer={onCloseDrawer}
      />

      <ReorderableList
        data={taskLists}
        keyExtractor={keyExtractorTaskList}
        onReorder={handleTaskListReorder}
        panGesture={listPanGesture}
        dragEnabled={canDragList}
        shouldUpdateActiveItem
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
        ListFooterComponent={
          <View className="mb-6">
            <View className="flex-row gap-2 mt-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.createNew")}
                onPress={() => setShowCreateListDialog(true)}
                className="flex-1 rounded-[12px] py-3.5 items-center bg-primary dark:bg-primary-dark active:opacity-90"
              >
                <Text className="text-[14px] font-inter-semibold text-primaryText dark:text-primaryText-dark">
                  {t("app.createNew")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.joinList")}
                onPress={() => setShowJoinListDialog(true)}
                className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3.5 items-center bg-surface dark:bg-surface-dark active:opacity-90"
              >
                <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                  {t("app.joinList")}
                </Text>
              </Pressable>
            </View>
            <Dialog
              open={showJoinListDialog}
              onOpenChange={(open) => {
                setShowJoinListDialog(open);
                if (!open) {
                  setJoinListInput("");
                  setJoinListError(null);
                }
              }}
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.cancel")}
                    onPress={() => setShowJoinListDialog(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.join")}
                    onPress={handleJoinListSubmit}
                    disabled={!canJoinList}
                    className={`flex-1 rounded-[12px] py-3.5 items-center active:opacity-90 ${
                      canJoinList
                        ? "bg-primary dark:bg-primary-dark"
                        : "bg-border dark:bg-border-dark"
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-inter-semibold ${
                        canJoinList
                          ? "text-primaryText dark:text-primaryText-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {joiningList ? t("app.joining") : t("app.join")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("pages.sharecode.codeLabel")}
                  </Text>
                  <TextInput
                    className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                    value={joinListInput}
                    onChangeText={(v) => {
                      setJoinListInput(v);
                      setJoinListError(null);
                    }}
                    placeholder={t("pages.sharecode.codePlaceholder")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleJoinListSubmit}
                    editable={!joiningList}
                    accessibilityLabel={t("pages.sharecode.codeLabel")}
                    autoFocus
                  />
                  {joinListError ? (
                    <Text className="text-[13px] font-inter text-error dark:text-error-dark mt-1">
                      {joinListError}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Dialog>
            <Dialog
              open={showCreateListDialog}
              onOpenChange={(open) => {
                setShowCreateListDialog(open);
                if (!open) {
                  setCreateListInput("");
                  setCreateListBackground(null);
                }
              }}
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.cancel")}
                    onPress={() => setShowCreateListDialog(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.create")}
                    onPress={handleCreateListSubmit}
                    disabled={!canCreateList}
                    className={`flex-1 rounded-[12px] py-3.5 items-center active:opacity-90 ${
                      canCreateList
                        ? "bg-primary dark:bg-primary-dark"
                        : "bg-border dark:bg-border-dark"
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-inter-semibold ${
                        canCreateList
                          ? "text-primaryText dark:text-primaryText-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {t("app.create")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("app.taskListName")}
                  </Text>
                  <TextInput
                    className="rounded-[12px] border border-border dark:border-border-dark px-3.5 py-3 text-[16px] font-inter text-text dark:text-text-dark bg-input-background dark:bg-input-background-dark"
                    value={createListInput}
                    onChangeText={setCreateListInput}
                    placeholder={t("app.taskListNamePlaceholder")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateListSubmit}
                    editable
                    accessibilityLabel={t("app.taskListName")}
                    autoFocus
                  />
                </View>
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("taskList.selectColor")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {([null, ...listColors] as (string | null)[]).map(
                      (color) => {
                        const isSelected = color === createListBackground;
                        return (
                          <Pressable
                            key={`create-${color ?? "none"}`}
                            accessibilityRole="button"
                            accessibilityLabel={
                              color
                                ? t("taskList.selectColor")
                                : t("taskList.backgroundNone")
                            }
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => setCreateListBackground(color)}
                            style={
                              color ? { backgroundColor: color } : undefined
                            }
                            className={`w-[30px] h-[30px] rounded-full justify-center items-center border ${
                              isSelected
                                ? "border-primary dark:border-primary-dark border-2"
                                : "border-border dark:border-border-dark"
                            } ${!color ? "bg-background dark:bg-background-dark" : ""}`}
                          >
                            {!color && (
                              <AppIcon
                                name="close"
                                className={
                                  isSelected
                                    ? "fill-primary dark:fill-primary-dark"
                                    : "fill-muted dark:fill-muted-dark"
                                }
                              />
                            )}
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>
              </View>
            </Dialog>
          </View>
        }
        ListEmptyComponent={
          <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
            {t("app.emptyState")}
          </Text>
        }
        renderItem={renderTaskListItem}
      />
    </View>
  );
};
