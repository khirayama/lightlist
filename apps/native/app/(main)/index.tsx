import { useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';

export default function Main() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert(
        t('logout.error'),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-red-500">
        {t('Welcome to Nativewind')}
      </Text>
      <TouchableOpacity
        onPress={handleLogout}
        disabled={loading}
        className="mt-8 rounded-lg bg-red-500 px-6 py-3 disabled:opacity-50"
      >
        <Text className="text-base font-semibold text-white">
          {loading ? t('logout.loading') : t('logout.button')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
