import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { AppIcon } from "../ui/AppIcon";
import { Dialog } from "../ui/Dialog";
import type { TaskList } from "@lightlist/sdk/types";

// Webに合わせて定義
export type ColorOption = {
  value: string | null;
  label?: string;
  shortLabel?: string;
  preview?: string;
};

// WebのDrawerPanelPropsに合わせて定義
type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  showCreateListDialog: boolean;
  onCreateListDialogChange: (open: boolean) => void;
  createListInput: string;
  onCreateListInputChange: (value: string) => void;
  createListBackground: string | null;
  onCreateListBackgroundChange: (color: string | null) => void;
  colors: readonly ColorOption[];
  onCreateList: () => void | Promise<void>;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  // onDragEndTaskList: Web用なので除外。Native用のハンドラを定義
  onReorderTaskList: (
    draggedTaskListId: string,
    targetTaskListId: string,
  ) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  showJoinListDialog: boolean;
  onJoinListDialogChange: (open: boolean) => void;
  joinListInput: string;
  onJoinListInputChange: (value: string) => void;
  onJoinList: () => void | Promise<void>;
  joinListError: string | null;
  joiningList: boolean;
  creatingList: boolean; // WebにはないがNativeにある状態管理
};

export const DrawerPanel = (props: DrawerPanelProps) => {
  const {
    isWideLayout,
    userEmail,
    showCreateListDialog,
    onCreateListDialogChange,
    createListInput,
    onCreateListInputChange,
    createListBackground,
    onCreateListBackgroundChange,
    colors,
    onCreateList,
    hasTaskLists,
    taskLists,
    onReorderTaskList,
    selectedTaskListId,
    onSelectTaskList,
    onCloseDrawer,
    onOpenSettings,
    showJoinListDialog,
    onJoinListDialogChange,
    joinListInput,
    onJoinListInputChange,
    onJoinList,
    joinListError,
    joiningList,
    creatingList,
  } = props;

  const { t } = useTranslation();

  const canCreateList = !creatingList && createListInput.trim().length > 0;
  const canJoinList = !joiningList && joinListInput.trim().length > 0;
  const canDragList = hasTaskLists && taskLists.length > 1;

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    await onCreateList();
  };

  const handleJoinListSubmit = async () => {
    if (!canJoinList) return;
    await onJoinList();
  };

  const handleSelectTaskList = (taskListId: string) => {
    onSelectTaskList(taskListId);
    onCloseDrawer();
  };

  const handleOpenSettings = () => {
    onCloseDrawer();
    onOpenSettings();
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

      <DraggableFlatList
        data={taskLists}
        keyExtractor={(item) => item.id}
        animationConfig={{ duration: 0 }}
        onDragEnd={({ from, to }) => {
          const draggedList = taskLists[from];
          const targetList = taskLists[to];
          if (!draggedList || !targetList || from === to) return;
          void onReorderTaskList(draggedList.id, targetList.id);
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
        ListFooterComponent={
          <View className="mb-6">
            <View className="flex-row gap-2 mt-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.createNew")}
                onPress={() => onCreateListDialogChange(true)}
                className="flex-1 rounded-[12px] py-3.5 items-center bg-primary dark:bg-primary-dark active:opacity-90"
              >
                <Text className="text-[14px] font-inter-semibold text-primary-text dark:text-primary-text-dark">
                  {t("app.createNew")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.joinList")}
                onPress={() => onJoinListDialogChange(true)}
                className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3.5 items-center bg-surface dark:bg-surface-dark active:opacity-90"
              >
                <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                  {t("app.joinList")}
                </Text>
              </Pressable>
            </View>
            <Dialog
              open={showJoinListDialog}
              onOpenChange={onJoinListDialogChange}
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => onJoinListDialogChange(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("app.cancel")}
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
                          ? "text-primary-text dark:text-primary-text-dark"
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
                    onChangeText={onJoinListInputChange}
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
              onOpenChange={onCreateListDialogChange}
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => onCreateListDialogChange(false)}
                    className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
                  >
                    <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                      {t("app.cancel")}
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
                          ? "text-primary-text dark:text-primary-text-dark"
                          : "text-muted dark:text-muted-dark"
                      }`}
                    >
                      {creatingList ? t("app.creating") : t("app.create")}
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
                    onChangeText={onCreateListInputChange}
                    placeholder={t("app.taskListNamePlaceholder")}
                    placeholderClassName="text-placeholder dark:text-placeholder-dark"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateListSubmit}
                    editable={!creatingList}
                    accessibilityLabel={t("app.taskListName")}
                    autoFocus
                  />
                </View>
                <View className="gap-1.5">
                  <Text className="text-[14px] font-inter-semibold text-text dark:text-text-dark">
                    {t("taskList.selectColor")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {colors.map((option) => {
                      const isSelected = option.value === createListBackground;
                      const previewColor = option.preview ?? option.value;
                      const label =
                        option.label ??
                        option.shortLabel ??
                        (option.value
                          ? t("taskList.selectColor")
                          : t("taskList.backgroundNone"));

                      return (
                        <Pressable
                          key={`create-${option.value ?? "none"}`}
                          accessibilityRole="button"
                          accessibilityLabel={label}
                          accessibilityState={{ selected: isSelected }}
                          onPress={() =>
                            onCreateListBackgroundChange(option.value)
                          }
                          style={
                            previewColor
                              ? { backgroundColor: previewColor }
                              : undefined
                          }
                          className={`w-[30px] h-[30px] rounded-full justify-center items-center border ${
                            isSelected
                              ? "border-primary dark:border-primary-dark border-2"
                              : "border-border dark:border-border-dark"
                          } ${!previewColor ? "bg-background dark:bg-background-dark" : ""}`}
                        >
                          {option.shortLabel ? (
                            <Text className="text-[10px] font-inter-semibold text-text dark:text-text-dark">
                              {option.shortLabel}
                            </Text>
                          ) : null}
                          {!option.value && !option.shortLabel && (
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
                    })}
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
        renderItem={({
          item,
          drag,
          isActive,
          getIndex,
        }: RenderItemParams<TaskList>) => {
          const isSelected = item.id === selectedTaskListId;
          const currentIndex =
            getIndex() ?? taskLists.findIndex((list) => list.id === item.id);
          const canMoveListUp = canDragList && currentIndex > 0;
          const canMoveListDown =
            canDragList &&
            currentIndex >= 0 &&
            currentIndex < taskLists.length - 1;
          const accessibilityActions: { name: string; label: string }[] = [];

          if (canMoveListUp) {
            accessibilityActions.push({
              name: "moveUp",
              label: t("app.moveUp"),
            });
          }
          if (canMoveListDown) {
            accessibilityActions.push({
              name: "moveDown",
              label: t("app.moveDown"),
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
              accessibilityLabel={item.name || t("app.taskListName")}
              onPress={() => handleSelectTaskList(item.id)}
              className={`rounded-[10px] border border-transparent p-2 flex-row items-center gap-2 active:opacity-90 ${
                isSelected
                  ? "bg-input-background dark:bg-input-background-dark"
                  : "bg-transparent"
              } ${isActive ? "opacity-50" : ""}`}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("taskList.reorder")}
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
                onLongPress={canDragList ? drag : undefined}
                delayLongPress={150}
                onPress={() => {}}
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
                  item.background
                    ? { backgroundColor: item.background }
                    : undefined
                }
                className={`w-3 h-3 rounded-full border border-border dark:border-border-dark ${
                  !item.background
                    ? "bg-background dark:bg-background-dark"
                    : ""
                }`}
              />
              <View className="flex-1 gap-0.5">
                <Text
                  className={`text-[14px] font-inter-semibold text-text dark:text-text-dark ${
                    isSelected ? "font-inter-bold" : ""
                  }`}
                  numberOfLines={1}
                >
                  {item.name || t("app.taskListName")}
                </Text>
                <Text className="text-[12px] font-inter text-muted dark:text-muted-dark">
                  {t("taskList.taskCount", {
                    count: item.tasks.length,
                  })}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
};
