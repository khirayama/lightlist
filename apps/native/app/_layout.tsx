import '../src/global.css';
import '../src/lib/i18n';
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../src/lib/api';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { i18n } = useTranslation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await api.getToken();
      const inAuthGroup = segments[0] === '(auth)';

      if (!token && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (token && inAuthGroup) {
        router.replace('/(main)');
      } else if (token && !inAuthGroup) {
        try {
          const response = await api.getSettings();
          if (response.data.language) {
            await i18n.changeLanguage(response.data.language);
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }

      setIsReady(true);
    };

    checkAuth();
  }, [segments]);

  if (!isReady) {
    return null;
  }

  return <Slot />;
}
