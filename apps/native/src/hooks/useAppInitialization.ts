import { useState, useEffect } from "react";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { onAuthStateChange } from "@lightlist/sdk/auth";
import i18n from "../utils/i18n";

export const useAppInitialization = (language?: string) => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange(() => {
      setIsAuthReady(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const targetLanguage =
      language === "ja" || language === "en" ? language : "ja";
    if (i18n.language !== targetLanguage) {
      void i18n.changeLanguage(targetLanguage);
    }
  }, [language]);

  useEffect(() => {
    if (fontsLoaded && isAuthReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthReady]);

  return {
    isReady: fontsLoaded && isAuthReady,
  };
};
