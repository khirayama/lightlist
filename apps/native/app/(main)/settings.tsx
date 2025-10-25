import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { store } from '@lightlist/sdk';

type Theme = 'system' | 'light' | 'dark';
type Language = 'ja' | 'en';
type TaskInsertPosition = 'top' | 'bottom';

interface Settings {
  id: string;
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    store.configure({ getToken: api.getToken });
    const unsub = store.subscribe(s => {
      if (s.settings) {
        setSettings(s.settings as any);
        if (s.settings.language) i18n.changeLanguage(s.settings.language);
      }
    });
    if (!store.get().settings) {
      store.init().catch(err => {
        Alert.alert(t('settings.error.loadFailed'), String(err));
      });
    } else {
      setSettings(store.get().settings as any);
    }
    setLoading(false);
    return unsub;
  }, []);

  const updateSetting = async (
    key: keyof Omit<Settings, 'id'>,
    value: string | boolean
  ) => {
    if (!settings) return;
    try {
      setUpdating(true);
      const updated = await store.updateSettings({ [key]: value } as any);
      setSettings(updated as any);
      if (key === 'language') i18n.changeLanguage(value as Language);
      Alert.alert(t('settings.settingsUpdated'));
    } catch (error) {
      Alert.alert(
        t('settings.error.updateFailed'),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logoutConfirm'), '', [
      {
        text: t('settings.cancel'),
        style: 'cancel',
      },
      {
        text: t('settings.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.logout();
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert(
              t('logout.error'),
              error instanceof Error ? error.message : String(error)
            );
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccountConfirm'), '', [
      {
        text: t('settings.cancel'),
        style: 'cancel',
      },
      {
        text: t('settings.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAccount();
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert(
              t('settings.error.updateFailed'),
              error instanceof Error ? error.message : String(error)
            );
          }
        },
      },
    ]);
  };

  if (loading || !settings) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="h-12 flex-row items-center border-b border-gray-200 px-4">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(main)');
            }
          }}
          className="mr-3"
        >
          <Text className="text-lg">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold">{t('settings.title')}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Theme Section */}
        <View className="border-b border-gray-200 px-4 py-2">
          <Text className="text-sm font-semibold mb-2 text-gray-800">
            {t('settings.theme')}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">{t('settings.theme')}</Text>
            <View className="flex-row space-x-2">
              {(['system', 'light', 'dark'] as Theme[]).map(theme => (
                <TouchableOpacity
                  key={theme}
                  onPress={() => updateSetting('theme', theme)}
                  disabled={updating}
                  className={`px-3 py-1 rounded-md ${
                    settings.theme === theme ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      settings.theme === theme ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {t(`settings.themeOptions.${theme}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View className="border-b border-gray-200 px-4 py-2">
          <Text className="text-sm font-semibold mb-2 text-gray-800">
            {t('settings.language')}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">
              {t('settings.language')}
            </Text>
            <View className="flex-row space-x-2">
              {(['ja', 'en'] as Language[]).map(lang => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => updateSetting('language', lang)}
                  disabled={updating}
                  className={`px-3 py-1 rounded-md ${
                    settings.language === lang ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      settings.language === lang
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    {t(`settings.languageOptions.${lang}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Task Settings Section */}
        <View className="border-b border-gray-200 px-4 py-2">
          <Text className="text-sm font-semibold mb-2 text-gray-800">
            {t('settings.taskSettings')}
          </Text>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">
              {t('settings.taskInsertPosition')}
            </Text>
            <View className="flex-row space-x-2">
              {(['top', 'bottom'] as TaskInsertPosition[]).map(position => (
                <TouchableOpacity
                  key={position}
                  onPress={() => updateSetting('taskInsertPosition', position)}
                  disabled={updating}
                  className={`px-3 py-1 rounded-md ${
                    settings.taskInsertPosition === position
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      settings.taskInsertPosition === position
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    {t(`settings.taskInsertPositionOptions.${position}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">
              {t('settings.autoSort')}
            </Text>
            <Switch
              value={settings.autoSort}
              onValueChange={value => updateSetting('autoSort', value)}
              disabled={updating}
            />
          </View>
        </View>

        {/* Account Section */}
        <View className="border-b border-gray-200 px-4 py-2">
          <Text className="text-sm font-semibold mb-2 text-gray-800">
            {t('settings.account')}
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-gray-200 rounded-lg py-3 mb-2"
          >
            <Text className="text-center text-sm font-semibold text-gray-700">
              {t('settings.logout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <View className="px-4 py-2">
          <TouchableOpacity
            onPress={handleDeleteAccount}
            className="border border-red-600 rounded-lg py-3"
          >
            <Text className="text-center text-sm font-semibold text-red-600">
              {t('settings.deleteAccount')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
