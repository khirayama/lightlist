import { useState, useSyncExternalStore } from "react";
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
import { useTheme } from "../styles/theme";
import { styles } from "../styles/appStyles";

type SettingsScreenProps = {
  onBack: () => void;
};

export const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const appState = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const settings = appState.settings;
  const userEmail = appState.user?.email ?? "";

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  if (!settings) {
    return (
      <View
        style={[styles.settingsCentered, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primary} />
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
        setErrorMessage(t("app.error"));
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
        setErrorMessage(t("app.error"));
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
        setErrorMessage(t("app.error"));
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(t("app.signOut"), t("app.signOutConfirm"), [
      { text: t("app.cancel"), style: "cancel" },
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
        { text: t("app.cancel"), style: "cancel" },
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

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: t("settings.theme.system") },
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
  ];

  const languageOptions: { value: Language; label: string }[] = [
    { value: "ja", label: t("settings.language.japanese") },
    { value: "en", label: t("settings.language.english") },
  ];

  const insertPositionOptions: {
    value: TaskInsertPosition;
    label: string;
  }[] = [
    { value: "top", label: t("settings.taskInsertPosition.top") },
    { value: "bottom", label: t("settings.taskInsertPosition.bottom") },
  ];

  const signOutLabel = isSigningOut
    ? t("settings.signingOut")
    : t("app.signOut");
  const deleteAccountLabel = isDeletingAccount
    ? t("settings.deletingAccount")
    : t("settings.deleteAccount");
  const actionsDisabled = isSigningOut || isDeletingAccount;

  return (
    <ScrollView contentContainerStyle={styles.settingsContent}>
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
          {t("settings.title")}
        </Text>
      </View>

      {errorMessage ? (
        <Text style={[styles.appError, { color: theme.error }]}>
          {errorMessage}
        </Text>
      ) : null}

      <View
        style={[
          styles.section,
          styles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("settings.userInfo.title")}
        </Text>
        <Text style={[styles.settingsValue, { color: theme.text }]}>
          {userEmail}
        </Text>
      </View>

      <View
        style={[
          styles.section,
          styles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("settings.language.title")}
        </Text>
        <View style={styles.optionGrid} accessibilityRole="radiogroup">
          {languageOptions.map((option) => {
            const selected = settings.language === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isUpdating }}
                disabled={isUpdating}
                onPress={() => handleUpdateSettings({ language: option.value })}
                style={({ pressed }) => [
                  styles.optionButton,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected
                      ? theme.inputBackground
                      : theme.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    { color: selected ? theme.text : theme.muted },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.section,
          styles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("settings.theme.title")}
        </Text>
        <View style={styles.optionGrid} accessibilityRole="radiogroup">
          {themeOptions.map((option) => {
            const selected = settings.theme === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isUpdating }}
                disabled={isUpdating}
                onPress={() => handleUpdateSettings({ theme: option.value })}
                style={({ pressed }) => [
                  styles.optionButton,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected
                      ? theme.inputBackground
                      : theme.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    { color: selected ? theme.text : theme.muted },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.section,
          styles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("settings.taskInsertPosition.title")}
        </Text>
        <View style={styles.optionGrid} accessibilityRole="radiogroup">
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
                style={({ pressed }) => [
                  styles.optionButton,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected
                      ? theme.inputBackground
                      : theme.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    { color: selected ? theme.text : theme.muted },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.section,
          styles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.toggleRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("settings.autoSort.title")}
          </Text>
          <Switch
            value={settings.autoSort}
            onValueChange={(value) => handleUpdateSettings({ autoSort: value })}
            disabled={isUpdating}
            accessibilityLabel={t("settings.autoSort.title")}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={
              settings.autoSort ? theme.primaryText : theme.inputBackground
            }
            ios_backgroundColor={theme.border}
          />
        </View>
      </View>

      <View
        style={[
          styles.section,
          styles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("settings.actions.title")}
        </Text>
        <View style={styles.form}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("app.signOut")}
            onPress={confirmSignOut}
            disabled={actionsDisabled}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              {signOutLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("settings.deleteAccount")}
            onPress={confirmDeleteAccount}
            disabled={actionsDisabled}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.error,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.error }]}>
              {deleteAccountLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};
