import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

export function StartupSplash() {
  const { t } = useTranslation();

  return (
    <View
      className="flex-1 items-center justify-center bg-background dark:bg-background-dark"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("common.loading")}
    >
      <Image
        source={require("../../../assets/splash-icon.png")}
        style={{ width: 120, height: 120 }}
        resizeMode="contain"
      />
    </View>
  );
}
