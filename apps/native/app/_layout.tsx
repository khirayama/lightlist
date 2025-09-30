import '../src/global.css';
import '../src/lib/i18n';
import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN') {
        router.replace('/(main)');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <Slot />;
}
