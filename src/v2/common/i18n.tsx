import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

export const useCustomTranslation = (prefix: string) => {
  const tr = useTranslation();
  return {
    ...tr,
    t: (key: string | string[], params?: any) =>
      tr.t(`${prefix}.${key}`, params) as string,
  };
};

const enTranslation = {
  libs: {
    components: {
      DatePicker: {
        Sunday: "Su",
        Monday: "Mo",
        Tuesday: "Tu",
        Wednesday: "We",
        Thursday: "Th",
        Friday: "Fr",
        Saturday: "Sa",
        Sun: "Sun",
        Mon: "Mon",
        Tue: "Tue",
        Wed: "Wed",
        Thu: "Thu",
        Fri: "Fri",
        Sat: "Sat",
        Reset: "Reset",
        Cancel: "Cancel",
      },
    },
  },
  pages: {
    index: {
      "Get started": "Get started",
      "Try without logging in": "Try without logging in",
      "Lightlist is a simple task list service.":
        "Lightlist is a simple task list service.",
      "It can be used as a ToDo list for task management or a shopping list. You can share lists with people who are not registered.":
        "It can be used as a ToDo list for task management or a shopping list. You can share lists with people who are not registered.",
    },
    app: {
      "Log in": "Log in",
      Preferences: "Preferences",
      PERSONAL: "PERSONAL",
      "Install app": "Install app",
    },
    login: {
      Email: "Email",
      Password: "Password",
      "Log In": "Log In",
      "Sign Up": "Sign Up",
      "Logging In": "Logging Ip",
      "Signing Up": "Signing Up",
      "Send reset password instructions": "Send reset password instructions",
      "Already have an account? Log in": "Already have an account? Log in",
      "Don't have an account? Sign up": "Don't have an account? Sign up",
      "Forgot your password?": "Forgot your password?",
    },
    share: {
      "Already added": "Already added",
      "Add my task list": "Add my task list",
      "Log in to add this task list": "Log in to add this task list",
      "No share code": "No share code",
      Loading: "Loading",
      "No matched task list with the share code":
        "No matched task list with the share code",
      "Please join {{name}} list!": "Please join {{name}} list!",
    },
  },
  components: {
    TaskList: {
      "Add task to top": "Add task to top",
      "Add task to bottom": "Add task to bottom",
      Sort: "Sort",
      "Clear Completed": "Clear Completed",
      "Task list name": "Task list name",
      "No tasks! Have a nice day! 🎉": "No tasks! Have a nice day! 🎉",
    },
    TaskItem: {
      Sun: "Sun",
      Mon: "Mon",
      Tue: "Tue",
      Wed: "Wed",
      Thu: "Thu",
      Fri: "Fri",
      Sat: "Sat",
    },
    TaskListList: {
      "Add task list to bottom": "Add task list to bottom",
    },
    UserSheet: {
      "Log In": "Log In",
      "New display name": "New display name",
      "Change display name": "Change display name",
      "New email": "New email",
      "Change email": "Change email",
      "New password": "New password",
      "Confirm new password": "Confirm new password",
      "Update password": "Update password",
      "Log out": "Log out",
      "Delete account": "Delete account",
    },
    SharingSheet: {
      "Share {{name}} list": "Share {{name}} list",
      "Copied to clipboard": "Copied to clipboard",
      "Need to run this under https or localhost":
        "Need to run this under https or localhost",
      "Please join {{name}} list!": "Please join {{name}} list!",
      "Share with other apps": "Share with other apps",
      "Refresh share code": "Refresh share code",
    },
    PreferencesSheet: {
      Preferences: "Preferences",
      JA: "日本語",
      EN: "English",
      SYSTEM: "Use system setting",
      LIGHT: "Light",
      DARK: "Dark",
      Appearance: "Appearance",
      Language: "Language",
    },
    DatePickerSheet: {
      "Date Picker": "Date Picker",
    },
  },
};

const jaTranslation = {
  libs: {
    components: {
      DatePicker: {
        Sunday: "日",
        Monday: "月",
        Tuesday: "火",
        Wednesday: "水",
        Thursday: "木",
        Friday: "金",
        Saturday: "土",
        Sun: "日",
        Mon: "月",
        Tue: "火",
        Wed: "水",
        Thu: "木",
        Fri: "金",
        Sat: "土",
        Reset: "リセット",
        Cancel: "キャンセル",
      },
    },
  },
  pages: {
    index: {
      "Get started": "はじめる",
      "Try without logging in": "ログインせずにさわってみる",
      "Lightlist is a simple task list service.":
        "Lightlistは、とてもシンプルなタスクリストサービスです。",
      "It can be used as a ToDo list for task management or a shopping list. You can share lists with people who are not registered.":
        "タスク管理としてのToDoリストや、買い物リストとしても利用できます。登録していない人ともリストを共有することができます。",
    },
    app: {
      "Log in": "ログイン",
      Preferences: "設定",
      PERSONAL: "個人",
      "Install app": "アプリをインストール",
    },
    login: {
      Email: "メールアドレス",
      Password: "パスワード",
      "Log In": "ログイン",
      "Sign Up": "新規登録",
      "Logging In": "ログイン中",
      "Signing Up": "新規登録中",
      "Send reset password instructions": "パスワードリセットメールを送信",
      "Already have an account? Log in": "アカウントをお持ちの方はこちら",
      "Don't have an account? Sign up": "アカウントをお持ちでない方はこちら",
      "Forgot your password?": "パスワードを忘れた場合",
    },
    share: {
      "Already added": "すでに追加されています。",
      "Add my task list": "自分のタスクリストを追加",
      "Log in to add this task list":
        "このタスクリストを追加するためにログインする",
      "No share code": "共有コードがありません",
      Loading: "読み込み中",
      "No matched task list with the share code":
        "共有コードに一致するタスクリストがありません",
      "Please join {{name}} list!": "{{name}}リストに参加してください！",
    },
  },
  components: {
    TaskList: {
      "Add task to top": "タスクを先頭に追加",
      "Add task to bottom": "タスクを末尾に追加",
      Sort: "並び替え",
      "Clear Completed": "完了タスクを削除",
      "Task list name": "タスクリスト名",
      "No tasks! Have a nice day! 🎉": "タスクはありません！良い一日を！🎉",
    },
    TaskItem: {
      Sun: "日曜日",
      Mon: "月曜日",
      Tue: "火曜日",
      Wed: "水曜日",
      Thu: "木曜日",
      Fri: "金曜日",
      Sat: "土曜日",
    },
    TaskListList: {
      "Add task list to bottom": "タスクリストを末尾に追加",
    },
    UserSheet: {
      "Log In": "ログイン",
      "New display name": "新しい表示名",
      "Change display name": "表示名を変更",
      "New email": "新しいメールアドレス",
      "Change email": "メールアドレスを変更",
      "New password": "新しいパスワード",
      "Confirm new password": "新しいパスワードの確認",
      "Update password": "パスワードを更新",
      "Log out": "ログアウト",
      "Delete account": "アカウントを削除",
    },
    SharingSheet: {
      Share: "共有",
      "Share {{name}} list": "{{name}}リストを共有",
      "Copied to clipboard": "クリップボードにコピーしました",
      "Need to run this under https or localhost":
        "httpsまたはlocalhostで実行する必要があります",
      "Please join {{name}} list!": "{{name}}リストに参加してください！",
      "Share with other apps": "他のアプリで共有",
      "Refresh share code": "共有コードを更新",
    },
    PreferencesSheet: {
      Preferences: "設定",
      JA: "日本語",
      EN: "English",
      SYSTEM: "システム設定を使用する",
      LIGHT: "ライトモード",
      DARK: "ダークモード",
      Appearance: "表示設定",
      Language: "言語",
    },
    DatePickerSheet: {
      "Date Picker": "日付選択",
    },
  },
};

export function init() {
  i18n.use(initReactI18next).init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ja: {
        translation: jaTranslation,
      },
    },
    lng: "ja",
    fallbackLng: "ja",
    interpolation: {
      escapeValue: false,
    },
  });
}
