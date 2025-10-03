import '../src/global.css';
import '../src/lib/i18n';
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { api } from '../src/lib/api';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await api.getToken();
      const inAuthGroup = segments[0] === '(auth)';

      if (!token && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (token && inAuthGroup) {
        router.replace('/(main)');
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
