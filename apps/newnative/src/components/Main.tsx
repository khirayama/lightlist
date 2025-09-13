import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export default function Main() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-red-500">
        {t('Welcome to Nativewind')}
      </Text>
    </View>
  );
}
