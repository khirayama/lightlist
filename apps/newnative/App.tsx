// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';
// import "./src/global.css"
//
// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Open up App.tsx to start working on your app!</Text>
//       <StatusBar style="auto" />
//     </View>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });
import "./src/global.css"
import { Text, View } from "react-native";
import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "Welcome to Nativewind": "Welcome to Nativewind",
        }
      },
      ja: {
        translation: {
          "Welcome to Nativewind": "Nativewindへようこそ",
        }
      }
    },
    lng: "ja",
    fallbackLng: "ja",
    interpolation: {
      escapeValue: false
    }
  });
 
export default function App() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-red-500">
        {t('Welcome to Nativewind')}
      </Text>
    </View>
  );
}
