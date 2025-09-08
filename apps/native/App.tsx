import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import './src/i18n';

export default function App() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-2xl font-bold mb-4">{t('welcome')}</Text>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
