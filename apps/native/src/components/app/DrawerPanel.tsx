import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { AppIcon } from "../ui/AppIcon";
import { Dialog } from "../ui/Dialog";
import { styles } from "../../styles/appStyles";
import { useTheme } from "../../styles/theme";
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
  const theme = useTheme();

  const canCreateList = !creatingList && createListInput.trim().length > 0;
  const canJoinList = !joiningList && joinListInput.trim().length > 0;
  const canDragList = hasTaskLists && taskLists.length > 1;

  const handleCreateListSubmit = async () => {
    if (!canCreateList) return;
    await onCreateList();
    // 成功時のダイアログクローズは親が行う想定だが、Webの実装を見ると
    // Webはコンポーネント内で `void onCreateList()` しているだけ。
    // 親側で成功したらダイアログを閉じるロジックが必要。
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
    <View style={{ flex: 1, backgroundColor: theme.surface, padding: 20 }}>
      <View style={styles.drawerHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.drawerTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {userEmail}
          </Text>
        </View>
        <View style={styles.drawerHeaderActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.title")}
            onPress={handleOpenSettings}
            style={({ pressed }) => [
              styles.headerIconButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppIcon name="settings" color={theme.text} />
          </Pressable>
          {!isWideLayout ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={onCloseDrawer}
              style={({ pressed }) => [
                styles.headerIconButton,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppIcon name="close" color={theme.text} />
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
        contentContainerStyle={styles.drawerList}
        ListFooterComponent={
          <View style={styles.section}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.createNew")}
                onPress={() => onCreateListDialogChange(true)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    flex: 1,
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.primaryText, fontSize: 14 },
                  ]}
                >
                  {t("app.createNew")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.joinList")}
                onPress={() => onJoinListDialogChange(true)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.text, fontSize: 14 },
                  ]}
                >
                  {t("app.joinList")}
                </Text>
              </Pressable>
            </View>
            <Dialog
              open={showJoinListDialog}
              onOpenChange={onJoinListDialogChange}
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
              theme={theme}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => onJoinListDialogChange(false)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        flex: 1,
                        borderColor: theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.text },
                      ]}
                    >
                      {t("app.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.join")}
                    onPress={handleJoinListSubmit}
                    disabled={!canJoinList}
                    style={({ pressed }) => [
                      styles.button,
                      {
                        flex: 1,
                        backgroundColor: canJoinList
                          ? theme.primary
                          : theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: canJoinList ? theme.primaryText : theme.muted,
                        },
                      ]}
                    >
                      {joiningList ? t("app.joining") : t("app.join")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View style={styles.form}>
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
                    value={joinListInput}
                    onChangeText={onJoinListInputChange}
                    placeholder={t("pages.sharecode.codePlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleJoinListSubmit}
                    editable={!joiningList}
                    accessibilityLabel={t("pages.sharecode.codeLabel")}
                    autoFocus
                  />
                  {joinListError ? (
                    <Text style={[styles.error, { color: theme.error }]}>
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
              theme={theme}
              footer={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.cancel")}
                    onPress={() => onCreateListDialogChange(false)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        flex: 1,
                        borderColor: theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.text },
                      ]}
                    >
                      {t("app.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("app.create")}
                    onPress={handleCreateListSubmit}
                    disabled={!canCreateList}
                    style={({ pressed }) => [
                      styles.button,
                      {
                        flex: 1,
                        backgroundColor: canCreateList
                          ? theme.primary
                          : theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: canCreateList
                            ? theme.primaryText
                            : theme.muted,
                        },
                      ]}
                    >
                      {creatingList ? t("app.creating") : t("app.create")}
                    </Text>
                  </Pressable>
                </>
              }
            >
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t("app.taskListName")}
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
                    value={createListInput}
                    onChangeText={onCreateListInputChange}
                    placeholder={t("app.taskListNamePlaceholder")}
                    placeholderTextColor={theme.placeholder}
                    returnKeyType="done"
                    onSubmitEditing={handleCreateListSubmit}
                    editable={!creatingList}
                    accessibilityLabel={t("app.taskListName")}
                    autoFocus
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t("taskList.selectColor")}
                  </Text>
                  <View style={styles.colorRow}>
                    {colors.map((option) => {
                      const isSelected = option.value === createListBackground;
                      const previewColor =
                        option.preview ?? option.value ?? theme.background;
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
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: previewColor,
                              borderColor: isSelected
                                ? theme.primary
                                : theme.border,
                              borderWidth: isSelected ? 2 : 1,
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          {option.shortLabel ? (
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "600",
                                color: theme.text,
                              }}
                            >
                              {option.shortLabel}
                            </Text>
                          ) : null}
                          {!option.value && !option.shortLabel && (
                            <AppIcon
                              name="close"
                              color={isSelected ? theme.primary : theme.muted}
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
          <Text style={[styles.emptyText, { color: theme.muted }]}>
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
              style={({ pressed }) => [
                styles.drawerListItem,
                {
                  borderColor: "transparent", // Webはボーダーなし (bg-gray-100などで表現)
                  backgroundColor: isSelected
                    ? theme.inputBackground // Web: bg-gray-100 dark:bg-gray-800
                    : "transparent",
                  opacity: pressed ? 0.9 : isActive ? 0.5 : 1, // Web: isDragging ? 0.5 : 1
                  borderRadius: 10, // Web: rounded-[10px]
                  padding: 8, // Web: p-2
                  flexDirection: "row",
                  alignItems: "center",
                },
              ]}
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
                style={({ pressed }) => [
                  styles.taskActionButton,
                  {
                    opacity: pressed ? 0.8 : 1,
                    // Web: p-1
                    padding: 4,
                  },
                ]}
              >
                <AppIcon
                  name="drag-indicator"
                  color={canDragList ? theme.text : theme.muted}
                />
              </Pressable>
              <View
                style={[
                  styles.drawerListSwatch,
                  {
                    backgroundColor:
                      item.background ?? "var(--tasklist-theme-bg)", // Webのロジック: resolveTaskListBackground
                    // Webでは "var(--tasklist-theme-bg)" だが、Nativeでは theme.background と解釈するしかなさそう
                    // ただし item.background が null の場合は transparent ではなくデフォルト色
                    // Web: background ?? "var(--tasklist-theme-bg)"
                    // NativeでCSS変数は使えないので、theme.surface などをフォールバックにするか
                    // ここでは一旦 item.background があれば使い、なければ theme.background (あるいは theme.card) を使う
                  },
                  {
                    backgroundColor: item.background ?? theme.background,
                    borderColor: theme.border,
                    // Webに合わせて丸くする
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 1,
                    marginRight: 8, // gap-2 相当
                  },
                ]}
              />
              <View style={styles.drawerListItemText}>
                <Text
                  style={[
                    styles.drawerListItemName,
                    {
                      color: theme.text,
                      // Web: isActive ? "font-bold" : "font-medium"
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.name || t("app.taskListName")}
                </Text>
                <Text
                  style={[styles.drawerListItemCount, { color: theme.muted }]}
                >
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
