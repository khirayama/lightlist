import type { TFunction } from "i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import type {
  Language,
  Settings,
  TaskInsertPosition,
  Theme as ThemeMode,
} from "@lightlist/sdk/types";
import type { Theme } from "../styles/theme";
import { styles } from "../styles/appStyles";

type SettingsScreenProps = {
  t: TFunction;
  theme: Theme;
  settings: Settings | null;
  userEmail: string;
  errorMessage: string | null;
  isUpdating: boolean;
  isSigningOut: boolean;
  isDeletingAccount: boolean;
  onUpdateSettings: (next: Partial<Settings>) => void;
  onConfirmSignOut: () => void;
  onConfirmDeleteAccount: () => void;
  onBack: () => void;
};

export const SettingsScreen = ({
  t,
  theme,
  settings,
  userEmail,
  errorMessage,
  isUpdating,
  isSigningOut,
  isDeletingAccount,
  onUpdateSettings,
  onConfirmSignOut,
  onConfirmDeleteAccount,
  onBack,
}: SettingsScreenProps) => {
  if (!settings) {
    return (
      <View
        style={[styles.settingsCentered, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

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
                onPress={() => onUpdateSettings({ language: option.value })}
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
                onPress={() => onUpdateSettings({ theme: option.value })}
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
                  onUpdateSettings({ taskInsertPosition: option.value })
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
            onValueChange={(value) => onUpdateSettings({ autoSort: value })}
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
            onPress={onConfirmSignOut}
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
            onPress={onConfirmDeleteAccount}
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
