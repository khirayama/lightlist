import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        'Welcome to Nativewind': 'Welcome to Nativewind',
        register: {
          title: 'Sign Up',
          email: 'Email',
          emailPlaceholder: 'Enter your email',
          password: 'Password',
          passwordPlaceholder: 'Enter your password',
          confirmPassword: 'Confirm Password',
          confirmPasswordPlaceholder: 'Re-enter your password',
          submit: 'Sign Up',
          passwordStrength: {
            weak: 'Weak',
            medium: 'Medium',
            strong: 'Strong',
          },
          error: {
            allFieldsRequired: 'All fields are required',
            invalidEmail: 'Invalid email format',
            invalidPassword:
              'Password must contain uppercase, lowercase, and numbers',
            passwordMismatch: 'Passwords do not match',
            unknown: 'An error occurred',
          },
          hasAccount: 'Already have an account?',
          login: 'Login',
        },
        login: {
          title: 'Login',
          email: 'Email',
          emailPlaceholder: 'Enter your email',
          password: 'Password',
          passwordPlaceholder: 'Enter your password',
          submit: 'Login',
          forgotPassword: 'Forgot your password?',
          noAccount: "Don't have an account?",
          register: 'Sign Up',
          error: {
            allFieldsRequired: 'All fields are required',
            invalidEmail: 'Invalid email format',
            unknown: 'An error occurred',
          },
        },
        logout: {
          button: 'Logout',
          loading: 'Logging out...',
          error: 'Logout failed',
        },
      },
    },
    ja: {
      translation: {
        'Welcome to Nativewind': 'Nativewindへようこそ',
        register: {
          title: 'ユーザー登録',
          email: 'メールアドレス',
          emailPlaceholder: 'メールアドレスを入力',
          password: 'パスワード',
          passwordPlaceholder: 'パスワードを入力',
          confirmPassword: 'パスワード(確認)',
          confirmPasswordPlaceholder: 'パスワードを再入力',
          submit: 'ユーザー登録',
          passwordStrength: {
            weak: '弱い',
            medium: '普通',
            strong: '強い',
          },
          error: {
            allFieldsRequired: 'すべての項目を入力してください',
            invalidEmail: 'メールアドレスの形式が正しくありません',
            invalidPassword:
              'パスワードは大文字・小文字・数字を含む必要があります',
            passwordMismatch: 'パスワードが一致しません',
            unknown: 'エラーが発生しました',
          },
          hasAccount: '既にアカウントをお持ちの方は',
          login: 'ログイン',
        },
        login: {
          title: 'ログイン',
          email: 'メールアドレス',
          emailPlaceholder: 'メールアドレスを入力',
          password: 'パスワード',
          passwordPlaceholder: 'パスワードを入力',
          submit: 'ログイン',
          forgotPassword: 'パスワードを忘れた方はこちら',
          noAccount: 'アカウントをお持ちでない方は',
          register: 'ユーザー登録',
          error: {
            allFieldsRequired: 'すべての項目を入力してください',
            invalidEmail: 'メールアドレスの形式が正しくありません',
            unknown: 'エラーが発生しました',
          },
        },
        logout: {
          button: 'ログアウト',
          loading: 'ログアウト中...',
          error: 'ログアウトに失敗しました',
        },
      },
    },
  },
  lng: 'ja',
  fallbackLng: 'ja',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
