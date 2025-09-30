import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { isValidEmail, isValidPassword } from '@lightlist/sdk';
import { supabase } from '../../src/lib/supabase';
import { getPasswordStrengthInfo } from '../../src/utils/password';

export default function Register() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrengthInfo = password
    ? getPasswordStrengthInfo(password)
    : null;

  const handleRegister = async () => {
    setError('');

    if (!email || !password || !confirmPassword) {
      setError(t('register.error.allFieldsRequired'));
      return;
    }

    if (!isValidEmail(email)) {
      setError(t('register.error.invalidEmail'));
      return;
    }

    if (!isValidPassword(password)) {
      setError(t('register.error.invalidPassword'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.error.passwordMismatch'));
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md mx-auto">
          <Text className="text-3xl font-bold text-center mb-8">
            {t('register.title')}
          </Text>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="text-sm font-medium mb-1 text-gray-700">
              {t('register.email')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium mb-1 text-gray-700">
              {t('register.password')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder={t('register.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            {passwordStrengthInfo ? (
              <View className="mt-2">
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className={`h-full ${passwordStrengthInfo.color} ${passwordStrengthInfo.width}`}
                  />
                </View>
                <Text className="text-xs text-gray-600 mt-1">
                  {t(
                    `register.passwordStrength.${passwordStrengthInfo.strength}`
                  )}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium mb-1 text-gray-700">
              {t('register.confirmPassword')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder={t('register.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            className={`bg-blue-600 rounded-lg py-4 mb-4 ${loading ? 'opacity-50' : ''}`}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center text-base font-semibold">
                {t('register.submit')}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center">
            <Text className="text-sm text-gray-600">
              {t('register.hasAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-sm text-blue-600 font-medium">
                {t('register.login')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
