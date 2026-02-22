import { useMemo, useState, useSyncExternalStore } from "react";
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

type SettingsScreenProps = {
  onBack: () => void;
};

const getSettingsSnapshot = () => {
  return appStore.getState().settings;
};

const getUserEmailSnapshot = () => {
  return appStore.getState().user?.email ?? "";
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

  return (
    <ScrollView contentContainerClassName="px-4 pt-6 pb-10 max-w-[768px] w-full self-center">
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
          {t("settings.title")}
        </Text>
      </View>

      {errorMessage ? (
        <Text className="text-[13px] font-inter text-error dark:text-error-dark mb-3">
          {errorMessage}
        </Text>
      ) : null}

      <View className="mb-6 rounded-[16px] border p-4 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark mb-2.5">
          {t("settings.userInfo.title")}
        </Text>
        <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark">
          {userEmail}
        </Text>
      </View>

      <View className="mb-6 rounded-[16px] border p-4 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark mb-2.5">
          {t("settings.language.title")}
        </Text>
        <View
          className="flex-row flex-wrap gap-2.5"
          accessibilityRole="radiogroup"
        >
          {languageOptions.map((option) => {
            const selected = settings.language === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isUpdating }}
                disabled={isUpdating}
                onPress={() => handleUpdateSettings({ language: option.value })}
                className={`rounded-[12px] border px-3 py-2.5 min-w-[110px] items-center active:opacity-90 ${
                  selected
                    ? "border-primary dark:border-primary-dark bg-input-background dark:bg-input-background-dark"
                    : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-[13px] font-inter-semibold ${
                    selected
                      ? "text-text dark:text-text-dark"
                      : "text-muted dark:text-muted-dark"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mb-6 rounded-[16px] border p-4 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark mb-2.5">
          {t("settings.theme.title")}
        </Text>
        <View
          className="flex-row flex-wrap gap-2.5"
          accessibilityRole="radiogroup"
        >
          {themeOptions.map((option) => {
            const selected = settings.theme === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isUpdating }}
                disabled={isUpdating}
                onPress={() => handleUpdateSettings({ theme: option.value })}
                className={`rounded-[12px] border px-3 py-2.5 min-w-[110px] items-center active:opacity-90 ${
                  selected
                    ? "border-primary dark:border-primary-dark bg-input-background dark:bg-input-background-dark"
                    : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-[13px] font-inter-semibold ${
                    selected
                      ? "text-text dark:text-text-dark"
                      : "text-muted dark:text-muted-dark"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mb-6 rounded-[16px] border p-4 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark mb-2.5">
          {t("settings.taskInsertPosition.title")}
        </Text>
        <View
          className="flex-row flex-wrap gap-2.5"
          accessibilityRole="radiogroup"
        >
          {insertPositionOptions.map((option) => {
            const selected = settings.taskInsertPosition === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isUpdating }}
                disabled={isUpdating}
                onPress={() =>
                  handleUpdateSettings({ taskInsertPosition: option.value })
                }
                className={`rounded-[12px] border px-3 py-2.5 min-w-[110px] items-center active:opacity-90 ${
                  selected
                    ? "border-primary dark:border-primary-dark bg-input-background dark:bg-input-background-dark"
                    : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-[13px] font-inter-semibold ${
                    selected
                      ? "text-text dark:text-text-dark"
                      : "text-muted dark:text-muted-dark"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mb-6 rounded-[16px] border p-4 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark">
            {t("settings.autoSort.title")}
          </Text>
          <Switch
            value={settings.autoSort}
            onValueChange={(value) => handleUpdateSettings({ autoSort: value })}
            disabled={isUpdating}
            accessibilityLabel={t("settings.autoSort.title")}
          />
        </View>
      </View>

      <View className="mb-6 rounded-[16px] border p-4 bg-surface dark:bg-surface-dark border-border dark:border-border-dark">
        <Text className="text-[16px] font-inter-semibold text-text dark:text-text-dark mb-2.5">
          {t("settings.actions.title")}
        </Text>
        <View className="gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("app.signOut")}
            onPress={confirmSignOut}
            disabled={actionsDisabled}
            className="rounded-[12px] border border-border dark:border-border-dark py-3 items-center active:opacity-90"
          >
            <Text className="text-[15px] font-inter-semibold text-text dark:text-text-dark">
              {signOutLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.deleteAccount")}
            onPress={confirmDeleteAccount}
            disabled={actionsDisabled}
            className="rounded-[12px] border border-error dark:border-error-dark py-3 items-center active:opacity-90"
          >
            <Text className="text-[15px] font-inter-semibold text-error dark:text-error-dark">
              {deleteAccountLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};
