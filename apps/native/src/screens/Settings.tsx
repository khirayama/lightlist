import { type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type {
  Language,
  Settings,
  TaskInsertPosition,
  Theme as ThemeMode,
} from "@lightlist/sdk/types";
import { appStore } from "@lightlist/sdk/store";
import { updateSettings } from "@lightlist/sdk/mutations/app";
import { signOut, deleteAccount } from "@lightlist/sdk/mutations/auth";
import { Dialog } from "../components/ui/Dialog";
import { AppIcon } from "../components/ui/AppIcon";

type SettingsScreenProps = {
  onBack: () => void;
};

type SectionCardProps = {
  children: ReactNode;
  title?: string;
};

type SelectOption<Value extends string = string> = {
  label: string;
  value: Value;
};

type SelectRowProps = {
  disabled: boolean;
  currentLabel: string;
  label: string;
  onPress: () => void;
};

type ActionButtonProps = {
  danger?: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
};

type SelectDialogState = {
  onSelect: (value: string) => void;
  options: SelectOption[];
  selectedValue: string;
  title: string;
};

const getSettingsSnapshot = () => {
  return appStore.getState().settings;
};

const getUserEmailSnapshot = () => {
  return appStore.getState().user?.email ?? "";
};

const SectionCard = ({ children, title }: SectionCardProps) => {
  return (
    <View className="mb-4 rounded-[16px] border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
      {title ? (
        <Text className="mb-3 text-[13px] font-inter-semibold text-muted dark:text-muted-dark">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

const SelectRow = ({
  disabled,
  currentLabel,
  label,
  onPress,
}: SelectRowProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${currentLabel}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`py-3.5 active:opacity-90 ${disabled ? "opacity-60" : ""}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-0.5 pr-3">
          <Text className="text-[11px] font-inter-semibold uppercase tracking-[0.3px] text-muted dark:text-muted-dark">
            {label}
          </Text>
          <Text
            numberOfLines={1}
            className="text-[15px] font-inter-semibold text-text dark:text-text-dark"
          >
            {currentLabel}
          </Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-background dark:bg-background-dark">
          <AppIcon
            name="arrow-back"
            size={18}
            className="fill-muted dark:fill-muted-dark"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const ActionButton = ({
  danger = false,
  disabled,
  label,
  onPress,
}: ActionButtonProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      className={`rounded-[14px] border py-3 items-center active:opacity-90 ${
        danger
          ? "border-error dark:border-error-dark"
          : "border-border dark:border-border-dark"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <Text
        className={`text-[15px] font-inter-semibold ${
          danger
            ? "text-error dark:text-error-dark"
            : "text-text dark:text-text-dark"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const { t } = useTranslation();
  const settings = useSyncExternalStore(
    appStore.subscribe,
    getSettingsSnapshot,
  );
  const userEmail = useSyncExternalStore(
    appStore.subscribe,
    getUserEmailSnapshot,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [selectDialog, setSelectDialog] = useState<SelectDialogState | null>(
    null,
  );

  if (!settings) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-background dark:bg-background-dark">
        <ActivityIndicator className="text-primary dark:text-primary-dark" />
      </View>
    );
  }

  const handleUpdateSettings = async (next: Partial<Settings>) => {
    if (isUpdating) return;
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await updateSettings(next);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t("common.error"));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setErrorMessage(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t("common.error"));
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setErrorMessage(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t("common.error"));
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(t("app.signOut"), t("app.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("app.signOut"),
        style: "destructive",
        onPress: () => {
          void handleSignOut();
        },
      },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      t("settings.deleteAccount"),
      t("settings.deleteAccountConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteAccount"),
          style: "destructive",
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ],
    );
  };

  const themeOptions: { value: ThemeMode; label: string }[] = useMemo(() => {
    return [
      { value: "system", label: t("settings.theme.system") },
      { value: "light", label: t("settings.theme.light") },
      { value: "dark", label: t("settings.theme.dark") },
    ];
  }, [t]);

  const languageOptions: { value: Language; label: string }[] = useMemo(() => {
    return [
      { value: "ja", label: t("settings.language.japanese") },
      { value: "en", label: t("settings.language.english") },
    ];
  }, [t]);

  const insertPositionOptions: {
    value: TaskInsertPosition;
    label: string;
  }[] = useMemo(() => {
    return [
      { value: "top", label: t("settings.taskInsertPosition.top") },
      { value: "bottom", label: t("settings.taskInsertPosition.bottom") },
    ];
  }, [t]);

  const signOutLabel = isSigningOut
    ? t("settings.signingOut")
    : t("app.signOut");
  const deleteAccountLabel = isDeletingAccount
    ? t("settings.deletingAccount")
    : t("settings.deleteAccount");
  const actionsDisabled = isSigningOut || isDeletingAccount;
  const settingsDisabled = isUpdating || actionsDisabled;
  const selectedLanguageLabel =
    languageOptions.find((option) => option.value === settings.language)
      ?.label ?? "";
  const selectedThemeLabel =
    themeOptions.find((option) => option.value === settings.theme)?.label ?? "";
  const selectedInsertPositionLabel =
    insertPositionOptions.find(
      (option) => option.value === settings.taskInsertPosition,
    )?.label ?? "";

  const openSelectDialog = (
    title: string,
    selectedValue: string,
    options: SelectOption[],
    onSelect: (value: string) => void,
  ) => {
    if (settingsDisabled) {
      return;
    }

    setSelectDialog({
      title,
      selectedValue,
      options,
      onSelect,
    });
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pt-6 pb-12 max-w-[768px] w-full self-center"
      >
        <View className="mb-4 flex-row items-center gap-2 px-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-90"
          >
            <AppIcon
              name="arrow-back"
              size={22}
              className="fill-text dark:fill-text-dark"
            />
          </Pressable>
          <Text
            accessibilityRole="header"
            className="text-[22px] font-inter-bold text-text dark:text-text-dark flex-1"
          >
            {t("settings.title")}
          </Text>
        </View>

        {errorMessage ? (
          <View className="mb-4 rounded-[16px] border border-error dark:border-error-dark bg-surface dark:bg-surface-dark px-3 py-2.5">
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className="text-[13px] font-inter text-error dark:text-error-dark"
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <SectionCard title={t("settings.preferences.title")}>
          <View>
            <View className="border-b border-border dark:border-border-dark">
              <SelectRow
                label={t("settings.language.title")}
                currentLabel={selectedLanguageLabel}
                disabled={settingsDisabled}
                onPress={() =>
                  openSelectDialog(
                    t("settings.language.title"),
                    settings.language,
                    languageOptions,
                    (value) => {
                      void handleUpdateSettings({
                        language: value as Language,
                      });
                    },
                  )
                }
              />
            </View>
            <View className="border-b border-border dark:border-border-dark">
              <SelectRow
                label={t("settings.theme.title")}
                currentLabel={selectedThemeLabel}
                disabled={settingsDisabled}
                onPress={() =>
                  openSelectDialog(
                    t("settings.theme.title"),
                    settings.theme,
                    themeOptions,
                    (value) => {
                      void handleUpdateSettings({ theme: value as ThemeMode });
                    },
                  )
                }
              />
            </View>
            <SelectRow
              label={t("settings.taskInsertPosition.title")}
              currentLabel={selectedInsertPositionLabel}
              disabled={settingsDisabled}
              onPress={() =>
                openSelectDialog(
                  t("settings.taskInsertPosition.title"),
                  settings.taskInsertPosition,
                  insertPositionOptions,
                  (value) => {
                    void handleUpdateSettings({
                      taskInsertPosition: value as TaskInsertPosition,
                    });
                  },
                )
              }
            />
          </View>

          <View className="mt-1 flex-row items-center justify-between gap-3 border-t border-border dark:border-border-dark py-3">
            <View className="flex-1">
              <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
                {t("settings.autoSort.title")}
              </Text>
              <Text className="mt-0.5 text-[12px] font-inter text-muted dark:text-muted-dark">
                {t("settings.autoSort.enable")}
              </Text>
            </View>
            <Switch
              value={settings.autoSort}
              onValueChange={(value) =>
                handleUpdateSettings({ autoSort: value })
              }
              disabled={settingsDisabled}
              accessibilityLabel={t("settings.autoSort.title")}
            />
          </View>
        </SectionCard>

        <SectionCard title={t("settings.actions.title")}>
          <View className="gap-3">
            <View className="border-b border-border dark:border-border-dark pb-3">
              <Text className="text-[12px] font-inter-semibold text-muted dark:text-muted-dark">
                {t("settings.userInfo.title")}
              </Text>
              <Text className="mt-1 text-[14px] font-inter-semibold text-text dark:text-text-dark">
                {userEmail}
              </Text>
            </View>
            <ActionButton
              label={signOutLabel}
              disabled={actionsDisabled}
              onPress={confirmSignOut}
            />
            <ActionButton
              danger
              label={deleteAccountLabel}
              disabled={actionsDisabled}
              onPress={confirmDeleteAccount}
            />
          </View>
        </SectionCard>
      </ScrollView>

      <Dialog
        open={selectDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectDialog(null);
          }
        }}
        title={selectDialog?.title ?? ""}
        description={t("common.selectOption")}
        footer={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
            onPress={() => setSelectDialog(null)}
            className="flex-1 rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
          >
            <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
              {t("common.cancel")}
            </Text>
          </Pressable>
        }
      >
        <View className="rounded-[14px] border border-border dark:border-border-dark overflow-hidden">
          {selectDialog?.options.map((option, index) => {
            const selected = option.value === selectDialog.selectedValue;
            const isLast = index === selectDialog.options.length - 1;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => {
                  selectDialog?.onSelect(option.value);
                  setSelectDialog(null);
                }}
                className={`flex-row items-center justify-between px-3 py-3 active:opacity-90 ${
                  isLast ? "" : "border-b border-border dark:border-border-dark"
                } ${
                  selected
                    ? "bg-background dark:bg-background-dark"
                    : "bg-surface dark:bg-surface-dark"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border ${
                      selected
                        ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/15"
                        : "border-border dark:border-border-dark"
                    }`}
                  >
                    {selected ? (
                      <AppIcon
                        name="check"
                        size={13}
                        className="fill-primary dark:fill-primary-dark"
                      />
                    ) : null}
                  </View>
                  <Text
                    className={`text-[14px] ${
                      selected
                        ? "font-inter-semibold text-text dark:text-text-dark"
                        : "font-inter text-text dark:text-text-dark"
                    }`}
                  >
                    {option.label}
                  </Text>
                </View>
                {selected ? (
                  <Text className="text-[12px] font-inter-semibold text-muted dark:text-muted-dark">
                    {t("common.selected")}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </View>
  );
};
