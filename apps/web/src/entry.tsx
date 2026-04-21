import {
  StrictMode,
  Component,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useReducer,
  useState,
  useMemo,
  Children,
  memo,
  useLayoutEffect,
  HTMLInputTypeAttribute,
} from "react";
import type {
  ComponentPropsWithoutRef,
  ElementRef,
  ErrorInfo,
  ForwardedRef,
  ReactNode,
  SVGProps,
  ComponentProps,
  HTMLAttributes,
  MouseEvent,
  PointerEvent,
} from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import "i18next";
import i18next from "i18next";
import type { Resource, TFunction } from "i18next";
import rawLocales from "./locales.json";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import clsx from "clsx";
import LanguageDetector from "i18next-browser-languagedetector";
import {
  initReactI18next,
  useTranslation,
  withTranslation,
} from "react-i18next";
import type { WithTranslation } from "react-i18next";
import { getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
import {
  ReCaptchaEnterpriseProvider,
  initializeAppCheck,
} from "firebase/app-check";
import {
  ActionCodeSettings,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
} from "firebase/auth";
import type { Auth, User as FirebaseAuthUser } from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import type {
  DocumentData,
  Firestore,
  FirestoreError,
} from "firebase/firestore";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Drawer as DrawerPrimitive } from "vaul";
import { Command as CommandPrimitive } from "cmdk";
import type { Locale } from "date-fns";
import {
  ar as dateFnsAr,
  de as dateFnsDe,
  enUS,
  es as dateFnsEs,
  fr as dateFnsFr,
  hi as dateFnsHi,
  id as dateFnsId,
  ja as dateFnsJa,
  ko as dateFnsKo,
  ptBR as dateFnsPtBR,
  zhCN as dateFnsZhCN,
} from "date-fns/locale";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DayButton as DayPickerDayButton, DayPicker } from "react-day-picker";

// common.tsx
type Theme = "system" | "light" | "dark";

type Language =
  | "ja"
  | "en"
  | "es"
  | "de"
  | "fr"
  | "ko"
  | "zh-CN"
  | "hi"
  | "ar"
  | "pt-BR"
  | "id";

type TaskInsertPosition = "bottom" | "top";
type AuthStatus = "loading" | "authenticated" | "unauthenticated";
type DataLoadStatus = "idle" | "loading" | "ready" | "error";

type User = {
  uid: string;
  email: string | null;
};

type SettingsStore = {
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
  createdAt: number;
  updatedAt: number;
};

type TaskListOrderStore = {
  [taskListId: string]: {
    order: number;
  };
} & {
  createdAt: number;
  updatedAt: number;
};

type TaskListStoreTask = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  order: number;
};

type TaskListStore = {
  id: string;
  name: string;
  tasks: {
    [taskId: string]: TaskListStoreTask;
  };
  history: string[];
  shareCode: string | null;
  background: string | null;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
};

// For App
// User, SettingsStore, TaskListOrderStore, TaskListStoreのデータを利用して、生成される
type Settings = {
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type TaskList = {
  id: string;
  name: string;
  tasks: Task[];
  history: string[];
  shareCode: string | null;
  background: string | null;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
};

type AppState = {
  user: User | null;
  authStatus: AuthStatus;
  settings: Settings | null;
  settingsStatus: DataLoadStatus;
  taskLists: TaskList[];
  taskListOrderStatus: DataLoadStatus;
  taskListOrderUpdatedAt: number | null;
  sharedTaskListsById: Record<string, TaskList>;
  startupError: string | null;
};

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let appCheckInitialized = false;

const getApp = () =>
  getApps().length === 0
    ? initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      })
    : getApps()[0];

const isLocalhost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1";

const ensureAppCheckInitialized = (app: FirebaseApp) => {
  if (appCheckInitialized || typeof window === "undefined") {
    return;
  }

  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    return;
  }

  if (isLocalhost(window.location.hostname)) {
    (
      globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
      }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ?? true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckInitialized = true;
};

const getAuthInstance = (): Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getApp();
  ensureAppCheckInitialized(app);
  cachedAuth = getAuth(app);
  return cachedAuth;
};

const getDbInstance = (): Firestore => {
  if (cachedDb) {
    return cachedDb;
  }

  const app = getApp();
  ensureAppCheckInitialized(app);
  cachedDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  return cachedDb;
};

let cached: Analytics | null | undefined;

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (cached !== undefined) return cached;
  const supported = await isSupported();
  if (!supported) {
    cached = null;
    return null;
  }
  const apps = getApps();
  if (apps.length === 0) {
    cached = null;
    return null;
  }
  cached = getAnalytics(apps[0]);
  return cached;
};

const log = async (eventName: string, params?: Record<string, unknown>) => {
  if (import.meta.env.DEV) {
    console.log("[analytics]", eventName, params ?? {});
  }
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
};

const logSignUp = () => log("sign_up", { method: "email" });
const logLogin = () => log("login", { method: "email" });
const logSignOut = () => log("app_sign_out");
const logDeleteAccount = () => log("app_delete_account");
const logPasswordResetEmailSent = () => log("app_password_reset_email_sent");
const logEmailChangeRequested = () => log("app_email_change_requested");
const logTaskListCreate = () => log("app_task_list_create");
const logTaskListDelete = () => log("app_task_list_delete");
const logTaskListReorder = () => log("app_task_list_reorder");
const logTaskAdd = (params: { has_date: boolean }) =>
  log("app_task_add", params);
const logTaskUpdate = (params: { fields: string }) =>
  log("app_task_update", params);
const logTaskDelete = () => log("app_task_delete");
const logTaskReorder = () => log("app_task_reorder");
const logTaskSort = () => log("app_task_sort");
const logTaskDeleteCompleted = (params: { count: number }) =>
  log("app_task_delete_completed", params);
const logShareCodeGenerate = () => log("app_share_code_generate");
const logShareCodeRemove = () => log("app_share_code_remove");
const logShareCodeJoin = () => log("app_share_code_join");
const logShare = () =>
  log("share", { method: "share_code", content_type: "task_list" });
const logSettingsThemeChange = (params: {
  theme: "system" | "light" | "dark";
}) => log("app_settings_theme_change", params);
const logSettingsLanguageChange = (params: { language: string }) =>
  log("app_settings_language_change", params);
const logSettingsTaskInsertPositionChange = (params: {
  position: "top" | "bottom";
}) => log("app_settings_task_insert_position_change", params);
const logSettingsAutoSortChange = (params: { enabled: boolean }) =>
  log("app_settings_auto_sort_change", params);
const logException = (description: string, fatal: boolean) =>
  log("app_exception", { description, fatal });

const DEFAULT_LANGUAGE: Language = "ja";

const SUPPORTED_LANGUAGES = [
  "ja",
  "en",
  "es",
  "de",
  "fr",
  "ko",
  "zh-CN",
  "hi",
  "ar",
  "pt-BR",
  "id",
] as const satisfies readonly Language[];

const RTL_LANGUAGES = ["ar"] as const;

const LANGUAGE_DISPLAY_NAMES: Record<Language, string> = {
  ja: "日本語",
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  ko: "한국어",
  "zh-CN": "简体中文",
  hi: "हिन्दी",
  ar: "العربية",
  "pt-BR": "Português (Brasil)",
  id: "Bahasa Indonesia",
};

const SUPPORTED_LANGUAGE_SET = new Set<Language>(SUPPORTED_LANGUAGES);

function normalizeLanguage(value: string | null | undefined): Language {
  if (!value) return DEFAULT_LANGUAGE;
  if (SUPPORTED_LANGUAGE_SET.has(value as Language)) {
    return value as Language;
  }

  const lower = value.toLowerCase();

  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("ko")) return "ko";
  if (
    lower === "zh" ||
    lower.startsWith("zh-cn") ||
    lower.startsWith("zh-hans") ||
    lower.startsWith("zh-sg")
  ) {
    return "zh-CN";
  }
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("ar")) return "ar";
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
  if (lower === "id" || lower === "in" || lower.startsWith("id-")) return "id";

  return DEFAULT_LANGUAGE;
}

function getLanguageDirection(value: string | null | undefined): "ltr" | "rtl" {
  const language = normalizeLanguage(value);
  return RTL_LANGUAGES.includes(language as (typeof RTL_LANGUAGES)[number])
    ? "rtl"
    : "ltr";
}

const localeResources = rawLocales as Record<Language, Record<string, unknown>>;

const resources = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [
    language,
    { translation: localeResources[language] },
  ]),
) as Resource;

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    defaultNS: "translation",
    ns: ["translation"],
    resources,
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      lookupQuerystring: "lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

const ERROR_KEY_MAP = {
  "auth/invalid-credential": "auth.error.invalidCredential",
  "auth/user-not-found": "auth.error.userNotFound",
  "auth/email-already-in-use": "auth.error.emailAlreadyInUse",
  "auth/weak-password": "auth.error.weakPassword",
  "auth/invalid-email": "auth.error.invalidEmail",
  "auth/operation-not-allowed": "auth.error.operationNotAllowed",
  "auth/too-many-requests": "auth.error.tooManyRequests",
  "auth/expired-action-code": "auth.passwordReset.expiredCode",
  "auth/invalid-action-code": "auth.passwordReset.invalidCode",
  "auth/requires-recent-login": "auth.error.requiresRecentLogin",
} as const;

type AuthErrorCode = keyof typeof ERROR_KEY_MAP;

type FormErrors = Partial<{
  email: string;
  password: string;
  confirmPassword: string;
  general: string;
}>;

type AuthFormData = {
  email: string;
  password: string;
  confirmPassword?: string;
  requirePasswordConfirm?: boolean;
};

type PasswordFormData = {
  password: string;
  confirmPassword: string;
};

type EmailChangeFormData = {
  newEmail: string;
};

const isAuthErrorCode = (code: unknown): code is AuthErrorCode =>
  typeof code === "string" && code in ERROR_KEY_MAP;

const isCodedError = (error: unknown): error is { code: string } =>
  Boolean(
    error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string",
  );

const hasMessage = (error: unknown): error is { message: string } =>
  Boolean(
    error &&
    typeof error === "object" &&
    typeof (error as { message?: unknown }).message === "string",
  );

const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? (error as { name?: unknown }).name : undefined;
  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  const message =
    "message" in error ? (error as { message?: unknown }).message : undefined;

  return (
    name === "AbortError" ||
    code === "aborted" ||
    (typeof message === "string" &&
      message.toLowerCase().includes("aborted a request"))
  );
};

const getErrorMessage = (
  errorCode: string,
  t: TFunction<"translation">,
): string | null => {
  if (isAuthErrorCode(errorCode)) {
    return t(ERROR_KEY_MAP[errorCode]);
  }
  return null;
};

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const resolveErrorMessage = (
  error: unknown,
  t: TFunction<"translation">,
  fallbackKey: Parameters<TFunction<"translation">>[0],
): string => {
  if (typeof error === "string") {
    return error;
  }

  if (isCodedError(error)) {
    return getErrorMessage(error.code, t) ?? t(fallbackKey as never);
  }

  if (error instanceof Error && error.message) {
    if (isAbortError(error)) {
      return t(fallbackKey as never);
    }
    return error.message;
  }

  if (hasMessage(error)) {
    if (isAbortError(error)) {
      return t(fallbackKey as never);
    }
    return error.message;
  }

  return t(fallbackKey as never);
};

const validateAuthForm = (
  data: AuthFormData,
  t: TFunction<"translation">,
): FormErrors => {
  const errors: FormErrors = {};

  if (!data.email.trim()) {
    errors.email = t("auth.validation.email.required");
  } else if (!validateEmail(data.email)) {
    errors.email = t("auth.validation.email.invalid");
  }

  if (!data.password) {
    errors.password = t("auth.validation.password.required");
  } else if (data.requirePasswordConfirm && data.password.length < 8) {
    errors.password = t("auth.validation.password.tooShort");
  }

  if (data.requirePasswordConfirm) {
    if (!data.confirmPassword) {
      errors.confirmPassword = t("auth.validation.confirmPassword.required");
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = t("auth.validation.confirmPassword.notMatch");
    }
  }

  return errors;
};

const validatePasswordForm = (
  data: PasswordFormData,
  t: TFunction<"translation">,
): FormErrors => {
  const errors: FormErrors = {};

  if (!data.password) {
    errors.password = t("auth.validation.password.required");
  } else if (data.password.length < 8) {
    errors.password = t("auth.validation.password.tooShort");
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = t("auth.validation.confirmPassword.required");
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = t("auth.validation.confirmPassword.notMatch");
  }

  return errors;
};

const validateEmailChangeForm = (
  data: EmailChangeFormData,
  t: TFunction<"translation">,
): FormErrors => {
  const errors: FormErrors = {};
  if (!data.newEmail.trim()) {
    errors.email = t("auth.validation.email.required");
  } else if (!validateEmail(data.newEmail)) {
    errors.email = t("auth.validation.email.invalid");
  }
  return errors;
};

const i18n = i18next;

const MAIN_CONTENT_ID = "main-content";

const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
};

interface ErrorBoundaryProps extends WithTranslation {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryBase extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    logException(error.message, true);
  }

  public render() {
    const { t, children, fallback } = this.props;

    if (this.state.hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-surface p-4 text-text dark:bg-background-dark dark:text-text-dark">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AppIcon
                name="alert-circle"
                className="h-6 w-6 text-red-600 dark:text-red-400"
              />
            </div>
            <h2 className="text-lg font-semibold">{t("pages.error.title")}</h2>
            <p className="text-sm text-muted dark:text-muted-dark">
              {t("pages.error.description")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primaryText hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
            >
              {t("pages.error.reload")}
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

const ErrorBoundary = withTranslation()(ErrorBoundaryBase);

function AppWrapperBody({ children }: { children: ReactNode }) {
  const prevLanguageRef = useRef<string | null>(null);
  const settingsRef = useRef<ReturnType<typeof useSettings> | null>(null);
  const { t } = useTranslation();
  const settings = useSettings();
  settingsRef.current = settings;

  useEffect(() => {
    const isSecureOrLocalhost =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isSecureOrLocalhost && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch(() => {});
    }

    const handleWindowError = (event: ErrorEvent) => {
      if (isAbortError(event.error ?? event)) {
        return;
      }
      logException(event.message, false);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isAbortError(event.reason)) {
        event.preventDefault();
        return;
      }
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      logException(msg, false);
    };
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleMediaChange = () => {
      if (settingsRef.current?.theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (settings) {
      applyTheme(settings.theme);
      if (prevLanguageRef.current !== settings.language) {
        prevLanguageRef.current = settings.language;
        void i18next.changeLanguage(settings.language);
      }
    }
  }, [settings]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const language = normalizeLanguage(
      settings?.language ?? i18next.resolvedLanguage,
    );
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDirection(language);
  }, [settings?.language]);

  return (
    <ErrorBoundary>
      <div className="h-dvh w-full overflow-hidden font-sans">
        <div className="h-full w-full overflow-y-auto">
          <a
            href={`#${MAIN_CONTENT_ID}`}
            className="pointer-events-none absolute top-2 z-[2000] -translate-y-16 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primaryText opacity-0 shadow-lg transition focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-muted dark:bg-primary-dark dark:text-primaryText-dark dark:focus:outline-muted-dark"
            style={{ insetInlineStart: "1rem" }}
          >
            {t("common.skipToMain")}
          </a>
          {children}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AppWrapperBody>{children}</AppWrapperBody>
    </AppStateProvider>
  );
}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: (typeof rawLocales)["ja"] };
  }
}

type SessionState = Pick<AppState, "authStatus" | "user">;
type SettingsState = Pick<AppState, "settings" | "settingsStatus">;
type TaskListIndexState = {
  hasStartupError: boolean;
  taskListOrderStatus: AppState["taskListOrderStatus"];
  taskLists: TaskList[];
};
type TaskListsState = {
  taskListOrder: TaskListOrderStore | null;
  taskListOrderStatus: AppState["taskListOrderStatus"];
  taskListsById: Record<string, TaskListStore>;
  sharedTaskListsById: Record<string, TaskListStore>;
};

const serverSessionState: SessionState = {
  authStatus: "loading",
  user: null,
};

const serverSettingsState: SettingsState = {
  settings: null,
  settingsStatus: "idle",
};

const TASK_LIST_ORDER_METADATA_KEYS = new Set(["createdAt", "updatedAt"]);

const initialTaskListsState = (
  taskListOrderStatus: AppState["taskListOrderStatus"] = "idle",
): TaskListsState => ({
  taskListOrder: null,
  taskListOrderStatus,
  taskListsById: {},
  sharedTaskListsById: {},
});

const toUser = (user: FirebaseAuthUser | null): User | null => {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
  };
};

const mapSettingsStore = (
  settingsStore: SettingsStore | null,
): Settings | null =>
  settingsStore
    ? {
        theme: settingsStore.theme,
        language: settingsStore.language,
        taskInsertPosition: settingsStore.taskInsertPosition,
        autoSort: settingsStore.autoSort,
      }
    : null;

function normalizeTaskListStore(taskListData: TaskListStore): TaskListStore {
  const tasks = taskListData.tasks;
  let needsNormalization = false;
  for (const taskId of Object.keys(tasks)) {
    if (tasks[taskId].id !== taskId) {
      needsNormalization = true;
      break;
    }
  }
  if (!needsNormalization) return taskListData;

  const normalizedTasks: Record<string, TaskListStoreTask> = {};
  for (const taskId of Object.keys(tasks)) {
    const task = tasks[taskId];
    normalizedTasks[taskId] =
      task.id === taskId ? task : { ...task, id: taskId };
  }
  return { ...taskListData, tasks: normalizedTasks };
}

const getTaskListIdsFromOrder = (
  taskListOrder: TaskListOrderStore | null,
): string[] => {
  if (!taskListOrder) {
    return [];
  }
  return Object.keys(taskListOrder).filter(
    (taskListId) => !TASK_LIST_ORDER_METADATA_KEYS.has(taskListId),
  );
};

const getTaskListIdsKey = (taskListIds: string[]): string =>
  taskListIds.length > 0 ? [...taskListIds].sort().join("|") : "";

const mapTaskListStoreToTaskList = (
  taskListId: string,
  taskListData: TaskListStore,
): TaskList => ({
  id: taskListId,
  name: taskListData.name,
  tasks: Object.values(taskListData.tasks).sort((a, b) => a.order - b.order),
  history: taskListData.history,
  shareCode: taskListData.shareCode,
  background: taskListData.background,
  memberCount:
    typeof taskListData.memberCount === "number" ? taskListData.memberCount : 1,
  createdAt: taskListData.createdAt,
  updatedAt: taskListData.updatedAt,
});

const createMissingTaskList = (taskListId: string): TaskList => ({
  id: taskListId,
  name: "",
  tasks: [],
  history: [],
  shareCode: null,
  background: null,
  memberCount: 0,
  createdAt: 0,
  updatedAt: 0,
});

const getOrderedTaskListIds = (
  taskListOrder: TaskListOrderStore | null,
): string[] =>
  taskListOrder
    ? Object.entries(taskListOrder)
        .flatMap(([taskListId, value]) => {
          if (typeof value !== "object" || value === null) return [];
          if (!("order" in value)) return [];
          return [{ taskListId, order: (value as { order: number }).order }];
        })
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.taskListId)
    : [];

const getTaskListIdChunks = (taskListIds: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < taskListIds.length; index += 10) {
    chunks.push(taskListIds.slice(index, index + 10));
  }
  return chunks;
};

type TaskListsAction =
  | {
      type: "reset";
      taskListOrderStatus?: AppState["taskListOrderStatus"];
    }
  | {
      type: "setTaskListOrder";
      taskListOrder: TaskListOrderStore | null;
      taskListOrderStatus: AppState["taskListOrderStatus"];
    }
  | {
      type: "setTaskListsById";
      taskListsById: Record<string, TaskListStore>;
    }
  | {
      type: "applyTaskListDocChanges";
      changes: Array<{
        doc: { id: string; data: () => DocumentData };
        type: string;
      }>;
    }
  | {
      type: "pruneTaskListsById";
      taskListIds: string[];
    }
  | {
      type: "setTaskListOrderStatus";
      taskListOrderStatus: AppState["taskListOrderStatus"];
    }
  | {
      type: "setSharedTaskList";
      taskListId: string;
      taskListData: TaskListStore | null;
    };

const taskListsReducer = (
  state: TaskListsState,
  action: TaskListsAction,
): TaskListsState => {
  switch (action.type) {
    case "reset":
      return initialTaskListsState(action.taskListOrderStatus ?? "idle");
    case "setTaskListOrder":
      return {
        ...state,
        taskListOrder: action.taskListOrder,
        taskListOrderStatus: action.taskListOrderStatus,
      };
    case "setTaskListsById":
      return {
        ...state,
        taskListsById: action.taskListsById,
      };
    case "applyTaskListDocChanges": {
      const nextTaskListsById = { ...state.taskListsById };
      let hasChanged = false;
      action.changes.forEach((change) => {
        const taskListId = change.doc.id;
        if (change.type === "removed") {
          if (
            !Object.prototype.hasOwnProperty.call(nextTaskListsById, taskListId)
          ) {
            return;
          }
          delete nextTaskListsById[taskListId];
          hasChanged = true;
          return;
        }
        const taskListData = normalizeTaskListStore(
          change.doc.data() as TaskListStore,
        );
        if (nextTaskListsById[taskListId] === taskListData) {
          return;
        }
        nextTaskListsById[taskListId] = taskListData;
        hasChanged = true;
      });
      return hasChanged
        ? {
            ...state,
            taskListsById: nextTaskListsById,
          }
        : state;
    }
    case "pruneTaskListsById": {
      const nextTaskListsById: Record<string, TaskListStore> = {};
      const keepTaskListIds = new Set(action.taskListIds);
      Object.entries(state.taskListsById).forEach(
        ([taskListId, taskListData]) => {
          if (keepTaskListIds.has(taskListId)) {
            nextTaskListsById[taskListId] = taskListData;
          }
        },
      );
      if (
        Object.keys(nextTaskListsById).length ===
          Object.keys(state.taskListsById).length &&
        Object.keys(nextTaskListsById).every(
          (taskListId) =>
            nextTaskListsById[taskListId] === state.taskListsById[taskListId],
        )
      ) {
        return state;
      }
      return {
        ...state,
        taskListsById: nextTaskListsById,
      };
    }
    case "setTaskListOrderStatus":
      return {
        ...state,
        taskListOrderStatus: action.taskListOrderStatus,
      };
    case "setSharedTaskList": {
      const nextSharedTaskListsById = { ...state.sharedTaskListsById };
      if (!action.taskListData) {
        if (
          !Object.prototype.hasOwnProperty.call(
            nextSharedTaskListsById,
            action.taskListId,
          )
        ) {
          return state;
        }
        delete nextSharedTaskListsById[action.taskListId];
      } else {
        nextSharedTaskListsById[action.taskListId] = action.taskListData;
      }
      return {
        ...state,
        sharedTaskListsById: nextSharedTaskListsById,
      };
    }
    default:
      return state;
  }
};

type AppStateContextValue = {
  session: SessionState;
  settingsState: SettingsState;
  taskListsState: TaskListsState;
  taskLists: TaskList[];
  sharedTaskListsById: Record<string, TaskList>;
  hasStartupError: boolean;
  registerSharedTaskList: (taskListId: string) => () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

const useAppStateContext = (): AppStateContextValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("AppStateProvider is required");
  }
  return context;
};

function AppStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(serverSessionState);
  const [settingsState, setSettingsState] =
    useState<SettingsState>(serverSettingsState);
  const [taskListsState, dispatchTaskLists] = useReducer(
    taskListsReducer,
    initialTaskListsState(),
  );
  const sharedTaskListRefCounts = useRef(new Map<string, number>());
  const sharedTaskListUnsubscribers = useRef(new Map<string, () => void>());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuthInstance(), (user) => {
      setSession({
        authStatus: user ? "authenticated" : "unauthenticated",
        user: toUser(user),
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session.authStatus !== "authenticated" || !session.user) {
      setSettingsState(serverSettingsState);
      return;
    }

    setSettingsState((current) => ({
      settings: current.settings,
      settingsStatus: "loading",
    }));

    return onSnapshot(
      doc(getDbInstance(), "settings", session.user.uid),
      (snapshot) => {
        const settingsStore = snapshot.exists()
          ? (snapshot.data() as SettingsStore)
          : null;
        setSettingsState({
          settings: mapSettingsStore(settingsStore),
          settingsStatus: "ready",
        });
      },
      () => {
        setSettingsState({
          settings: null,
          settingsStatus: "error",
        });
      },
    );
  }, [session.authStatus, session.user]);

  useEffect(() => {
    if (session.authStatus !== "authenticated" || !session.user) {
      dispatchTaskLists({ type: "reset", taskListOrderStatus: "idle" });
      return;
    }

    dispatchTaskLists({ type: "reset", taskListOrderStatus: "loading" });

    return onSnapshot(
      doc(getDbInstance(), "taskListOrder", session.user.uid),
      (snapshot) => {
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder: snapshot.exists()
            ? (snapshot.data() as TaskListOrderStore)
            : null,
          taskListOrderStatus: "ready",
        });
      },
      () => {
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder: null,
          taskListOrderStatus: "error",
        });
      },
    );
  }, [session.authStatus, session.user]);

  const orderedTaskListIds = useMemo(
    () => getOrderedTaskListIds(taskListsState.taskListOrder),
    [taskListsState.taskListOrder],
  );
  const orderedTaskListIdsKey = useMemo(
    () => getTaskListIdsKey(orderedTaskListIds),
    [orderedTaskListIds],
  );

  useEffect(() => {
    dispatchTaskLists({
      type: "pruneTaskListsById",
      taskListIds: orderedTaskListIds,
    });

    if (
      session.authStatus !== "authenticated" ||
      !session.user ||
      orderedTaskListIds.length === 0
    ) {
      return;
    }

    const unsubscribers = getTaskListIdChunks(orderedTaskListIds).map((chunk) =>
      onSnapshot(
        query(
          collection(getDbInstance(), "taskLists"),
          where("__name__", "in", chunk),
        ),
        (snapshot) => {
          const changes = snapshot.docChanges();
          if (changes.length === 0) {
            return;
          }
          dispatchTaskLists({
            type: "applyTaskListDocChanges",
            changes,
          });
        },
        (error: FirestoreError) => {
          console.error("taskList chunk listener error:", error);
          dispatchTaskLists({
            type: "setTaskListOrderStatus",
            taskListOrderStatus: "error",
          });
        },
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    orderedTaskListIdsKey,
    orderedTaskListIds,
    session.authStatus,
    session.user,
  ]);

  const registerSharedTaskList = useCallback((taskListId: string) => {
    const nextCount =
      (sharedTaskListRefCounts.current.get(taskListId) ?? 0) + 1;
    sharedTaskListRefCounts.current.set(taskListId, nextCount);

    if (!sharedTaskListUnsubscribers.current.has(taskListId)) {
      const unsubscribe = onSnapshot(
        doc(getDbInstance(), "taskLists", taskListId),
        (snapshot) => {
          dispatchTaskLists({
            type: "setSharedTaskList",
            taskListId,
            taskListData: snapshot.exists()
              ? normalizeTaskListStore(snapshot.data() as TaskListStore)
              : null,
          });
        },
        (error: FirestoreError) => {
          console.error("shared taskList listener error:", error);
          dispatchTaskLists({
            type: "setSharedTaskList",
            taskListId,
            taskListData: null,
          });
        },
      );
      sharedTaskListUnsubscribers.current.set(taskListId, unsubscribe);
    }

    return () => {
      const currentCount = sharedTaskListRefCounts.current.get(taskListId);
      if (!currentCount || currentCount <= 1) {
        sharedTaskListRefCounts.current.delete(taskListId);
        sharedTaskListUnsubscribers.current.get(taskListId)?.();
        sharedTaskListUnsubscribers.current.delete(taskListId);
        dispatchTaskLists({
          type: "setSharedTaskList",
          taskListId,
          taskListData: null,
        });
        return;
      }
      sharedTaskListRefCounts.current.set(taskListId, currentCount - 1);
    };
  }, []);

  useEffect(() => {
    return () => {
      sharedTaskListUnsubscribers.current.forEach((unsubscribe) =>
        unsubscribe(),
      );
      sharedTaskListUnsubscribers.current.clear();
      sharedTaskListRefCounts.current.clear();
    };
  }, []);

  const taskLists = useMemo(
    () =>
      orderedTaskListIds.map((taskListId) => {
        const taskListData = taskListsState.taskListsById[taskListId];
        return taskListData
          ? mapTaskListStoreToTaskList(taskListId, taskListData)
          : createMissingTaskList(taskListId);
      }),
    [orderedTaskListIds, taskListsState.taskListsById],
  );

  const sharedTaskListsById = useMemo(() => {
    const orderedIdSet = new Set(orderedTaskListIds);
    const nextSharedTaskListsById: Record<string, TaskList> = {};
    Object.entries(taskListsState.sharedTaskListsById).forEach(
      ([taskListId, taskListData]) => {
        if (orderedIdSet.has(taskListId)) {
          return;
        }
        nextSharedTaskListsById[taskListId] = mapTaskListStoreToTaskList(
          taskListId,
          taskListData,
        );
      },
    );
    return nextSharedTaskListsById;
  }, [orderedTaskListIds, taskListsState.sharedTaskListsById]);

  const hasStartupError =
    settingsState.settingsStatus === "error" ||
    taskListsState.taskListOrderStatus === "error";

  const contextValue = useMemo<AppStateContextValue>(
    () => ({
      session,
      settingsState,
      taskListsState,
      taskLists,
      sharedTaskListsById,
      hasStartupError,
      registerSharedTaskList,
    }),
    [
      hasStartupError,
      registerSharedTaskList,
      session,
      settingsState,
      sharedTaskListsById,
      taskLists,
      taskListsState,
    ],
  );

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

function useSessionState(): SessionState {
  return useAppStateContext().session;
}

function useAuthStatus(): AppState["authStatus"] {
  return useSessionState().authStatus;
}

function useUser(): User | null {
  return useSessionState().user;
}

function useSettingsState(): SettingsState {
  return useAppStateContext().settingsState;
}

function useSettings(): AppState["settings"] {
  return useSettingsState().settings;
}

function useSettingsStatus(): AppState["settingsStatus"] {
  return useSettingsState().settingsStatus;
}

function useTaskListIndexState(): TaskListIndexState {
  const { hasStartupError, taskListsState, taskLists } = useAppStateContext();
  return {
    hasStartupError,
    taskListOrderStatus: taskListsState.taskListOrderStatus,
    taskLists,
  };
}

function useTaskList(taskListId: string | null): TaskList | null {
  const { taskLists, sharedTaskListsById, registerSharedTaskList } =
    useAppStateContext();
  const taskList = taskListId
    ? (taskLists.find((item) => item.id === taskListId) ??
      sharedTaskListsById[taskListId] ??
      null)
    : null;

  useEffect(() => {
    if (!taskListId || taskLists.some((item) => item.id === taskListId)) {
      return;
    }
    return registerSharedTaskList(taskListId);
  }, [registerSharedTaskList, taskListId, taskLists]);

  return taskList;
}

const withAuthLanguage = async <T,>(
  language: Language,
  fn: () => Promise<T>,
): Promise<T> => {
  const auth = getAuthInstance();
  const previousLanguageCode = auth.languageCode;
  auth.languageCode = language;
  try {
    return await fn();
  } finally {
    auth.languageCode = previousLanguageCode;
  }
};

const INITIAL_TASK_LIST_NAME_BY_LANGUAGE: Record<Language, string> = {
  ja: "📒個人",
  en: "📒PERSONAL",
  es: "📒PERSONAL",
  de: "📒PERSÖNLICH",
  fr: "📒PERSONNEL",
  ko: "📒개인",
  "zh-CN": "📒个人",
  hi: "📒व्यक्तिगत",
  ar: "📒شخصية",
  "pt-BR": "📒PESSOAL",
  id: "📒PRIBADI",
};

const requireCurrentUser = (): FirebaseAuthUser => {
  const user = getAuthInstance().currentUser;
  if (!user) {
    throw new Error("No user logged in");
  }
  return user;
};

const requireCurrentUserId = (): string => requireCurrentUser().uid;

const createInitialSettingsStore = (
  language: Language,
  now: number,
): SettingsStore => ({
  theme: "system",
  language,
  taskInsertPosition: "top",
  autoSort: false,
  createdAt: now,
  updatedAt: now,
});

const createInitialTaskListStore = (
  taskListId: string,
  language: Language,
  now: number,
): TaskListStore => ({
  id: taskListId,
  name: INITIAL_TASK_LIST_NAME_BY_LANGUAGE[language],
  tasks: {},
  history: [],
  shareCode: null,
  background: null,
  memberCount: 1,
  createdAt: now,
  updatedAt: now,
});

const createInitialTaskListOrderStore = (
  taskListId: string,
  now: number,
): TaskListOrderStore =>
  ({
    [taskListId]: { order: 1.0 },
    createdAt: now,
    updatedAt: now,
  }) as TaskListOrderStore;

const getPreferredLanguage = async (language?: Language): Promise<Language> => {
  if (language) {
    return normalizeLanguage(language);
  }
  const uid = getAuthInstance().currentUser?.uid;
  if (!uid) {
    return DEFAULT_LANGUAGE;
  }
  const settingsSnapshot = await getDoc(doc(getDbInstance(), "settings", uid));
  const settingsStore = settingsSnapshot.exists()
    ? (settingsSnapshot.data() as SettingsStore)
    : null;
  return normalizeLanguage(settingsStore?.language ?? DEFAULT_LANGUAGE);
};

export async function signUp(
  email: string,
  password: string,
  language: Language,
) {
  const auth = getAuthInstance();
  const db = getDbInstance();
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const uid = userCredential.user.uid;
  const now = Date.now();
  const taskListId = doc(collection(db, "taskLists")).id;
  const normalizedLanguage = normalizeLanguage(language);
  const settingsData = createInitialSettingsStore(normalizedLanguage, now);
  const taskListData = createInitialTaskListStore(
    taskListId,
    normalizedLanguage,
    now,
  );
  const taskListOrderData = createInitialTaskListOrderStore(taskListId, now);

  const batch = writeBatch(db);
  batch.set(doc(db, "settings", uid), settingsData);
  batch.set(doc(db, "taskLists", taskListId), taskListData);
  batch.set(doc(db, "taskListOrder", uid), taskListOrderData);
  await batch.commit();
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(getAuthInstance(), email, password);
}

async function signOut() {
  await firebaseSignOut(getAuthInstance());
}

export async function sendPasswordResetEmail(
  email: string,
  language?: Language,
) {
  const auth = getAuthInstance();
  const actionCodeSettings: ActionCodeSettings = {
    url: import.meta.env.VITE_PASSWORD_RESET_URL,
    handleCodeInApp: false,
  };
  const languageToUse = await getPreferredLanguage(language);
  await withAuthLanguage(languageToUse, () =>
    firebaseSendPasswordResetEmail(auth, email, actionCodeSettings),
  );
}

export async function verifyPasswordResetCode(code: string) {
  return await firebaseVerifyPasswordResetCode(getAuthInstance(), code);
}

export async function confirmPasswordReset(code: string, newPassword: string) {
  await firebaseConfirmPasswordReset(getAuthInstance(), code, newPassword);
}

async function sendEmailChangeVerification(newEmail: string) {
  const user = requireCurrentUser();
  const language = await getPreferredLanguage();
  await withAuthLanguage(language, () =>
    verifyBeforeUpdateEmail(user, newEmail),
  );
}

async function deleteAccount() {
  const user = requireCurrentUser();
  const db = getDbInstance();
  const uid = user.uid;
  const taskListOrderRef = doc(db, "taskListOrder", uid);
  const taskListOrderSnapshot = await getDoc(taskListOrderRef);
  if (taskListOrderSnapshot.exists()) {
    const taskListOrderData =
      taskListOrderSnapshot.data() as TaskListOrderStore;
    const taskListIds = getTaskListIdsFromOrder(taskListOrderData);
    await Promise.allSettled(
      taskListIds.map((taskListId) => deleteTaskList(taskListId)),
    );
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, "settings", uid));
  batch.delete(taskListOrderRef);
  await batch.commit();
  await deleteUser(user);
}

type ResolvedTaskSettings = {
  autoSort: boolean;
  language: ReturnType<typeof normalizeLanguage>;
  taskInsertPosition: "bottom" | "top";
};
const SPACE_OR_END = String.raw`(?:[\s\u3000]|$)`;
const DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

type DatePattern = {
  regex: RegExp;
  getOffset?: (match: RegExpMatchArray) => number | null;
  getDate?: (match: RegExpMatchArray) => Date | null;
};

const normalizeDigits = (value: string): string =>
  value.replace(/[٠-٩۰-۹०-९]/g, (char) => DIGIT_MAP[char] ?? char);

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getNextWeekdayOffset = (
  targetDay: number,
  currentDay: number,
): number => {
  const diff = targetDay - currentDay;
  return diff >= 0 ? diff : diff + 7;
};

const NUMERIC_PATTERNS: DatePattern[] = [
  {
    regex: new RegExp(
      String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${SPACE_OR_END}`,
    ),
    getDate: (match) => {
      const y = Number.parseInt(match[1], 10);
      const m = Number.parseInt(match[2], 10) - 1;
      const d = Number.parseInt(match[3], 10);
      const date = new Date(y, m, d);
      if (
        date.getFullYear() !== y ||
        date.getMonth() !== m ||
        date.getDate() !== d
      ) {
        return null;
      }
      return date;
    },
  },
  {
    regex: new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})${SPACE_OR_END}`),
    getDate: (match) => {
      const m = Number.parseInt(match[1], 10) - 1;
      const d = Number.parseInt(match[2], 10);
      const now = new Date();
      const currentYear = now.getFullYear();
      const date = new Date(currentYear, m, d);
      if (date.getMonth() !== m || date.getDate() !== d) {
        return null;
      }
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (date < today) {
        date.setFullYear(currentYear + 1);
      }
      return date;
    },
  },
];

const RELATIVE_PATTERNS: Record<Language, DatePattern[]> = {
  ja: [
    {
      regex: new RegExp(String.raw`^今日${SPACE_OR_END}`),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^明日${SPACE_OR_END}`),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^明後日${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)日後(?:に)?${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(String.raw`^([月火水木金土日])曜?${SPACE_OR_END}`),
      getOffset: (match) =>
        getNextWeekdayOffset(
          { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 }[match[1]] ?? 0,
          new Date().getDay(),
        ),
    },
  ],
  en: [
    {
      regex: new RegExp(String.raw`^today${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^tomorrow${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^day after tomorrow${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^in\s+(\d+)\s+days?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s+days?\s+later${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(mon|tue|wed|thu|fri|sat|sun)(?:day)?${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) =>
        getNextWeekdayOffset(
          { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }[
            match[1].toLowerCase()
          ] ?? 0,
          new Date().getDay(),
        ),
    },
  ],
  es: [
    {
      regex: new RegExp(String.raw`^hoy${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^mañana${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^pasado\s+mañana${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(
        String.raw`^(?:en|dentro\s+de)\s+(\d+)\s+d[ií]as?${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo|lun|mar|mi[eé]|jue|vie|s[áa]b|dom)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          domingo: 0,
          dom: 0,
          lunes: 1,
          lun: 1,
          martes: 2,
          mar: 2,
          miércoles: 3,
          miercoles: 3,
          mié: 3,
          mie: 3,
          jueves: 4,
          jue: 4,
          viernes: 5,
          vie: 5,
          sábado: 6,
          sabado: 6,
          sáb: 6,
          sab: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  de: [
    {
      regex: new RegExp(String.raw`^heute${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^morgen${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^übermorgen${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^in\s+(\d+)\s+tagen?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          sonntag: 0,
          so: 0,
          montag: 1,
          mo: 1,
          dienstag: 2,
          di: 2,
          mittwoch: 3,
          mi: 3,
          donnerstag: 4,
          do: 4,
          freitag: 5,
          fr: 5,
          samstag: 6,
          sa: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  fr: [
    {
      regex: new RegExp(String.raw`^aujourd(?:'|’)hui${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^demain${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^apr[eè]s[- ]demain${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^dans\s+(\d+)\s+jours?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          dimanche: 0,
          dim: 0,
          lundi: 1,
          lun: 1,
          mardi: 2,
          mar: 2,
          mercredi: 3,
          mer: 3,
          jeudi: 4,
          jeu: 4,
          vendredi: 5,
          ven: 5,
          samedi: 6,
          sam: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  ko: [
    {
      regex: new RegExp(String.raw`^오늘${SPACE_OR_END}`),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^내일${SPACE_OR_END}`),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^모레${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s*일\s*후${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(월요일|화요일|수요일|목요일|금요일|토요일|일요일|월|화|수|목|금|토|일)${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          일요일: 0,
          일: 0,
          월요일: 1,
          월: 1,
          화요일: 2,
          화: 2,
          수요일: 3,
          수: 3,
          목요일: 4,
          목: 4,
          금요일: 5,
          금: 5,
          토요일: 6,
          토: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  "zh-CN": [
    {
      regex: new RegExp(String.raw`^今天${SPACE_OR_END}`),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^明天${SPACE_OR_END}`),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^后天${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s*天后${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(星期[一二三四五六日天]|周[一二三四五六日天])${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          星期日: 0,
          星期天: 0,
          周日: 0,
          周天: 0,
          星期一: 1,
          周一: 1,
          星期二: 2,
          周二: 2,
          星期三: 3,
          周三: 3,
          星期四: 4,
          周四: 4,
          星期五: 5,
          周五: 5,
          星期六: 6,
          周六: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  hi: [
    { regex: new RegExp(String.raw`^आज${SPACE_OR_END}`), getOffset: () => 0 },
    { regex: new RegExp(String.raw`^कल${SPACE_OR_END}`), getOffset: () => 1 },
    {
      regex: new RegExp(String.raw`^परसों${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^(\d+)\s*दिन\s*बाद${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          रविवार: 0,
          सोमवार: 1,
          मंगलवार: 2,
          बुधवार: 3,
          गुरुवार: 4,
          शुक्रवार: 5,
          शनिवार: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  ar: [
    {
      regex: new RegExp(String.raw`^اليوم${SPACE_OR_END}`),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^غد(?:ا|ًا)?${SPACE_OR_END}`),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^بعد\s+غد${SPACE_OR_END}`),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^بعد\s+(\d+)\s+أيام?${SPACE_OR_END}`),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(الاثنين|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)${SPACE_OR_END}`,
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          الأحد: 0,
          الاثنين: 1,
          الإثنين: 1,
          الثلاثاء: 2,
          الأربعاء: 3,
          الخميس: 4,
          الجمعة: 5,
          السبت: 6,
        };
        const target = map[match[1]];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  "pt-BR": [
    {
      regex: new RegExp(String.raw`^hoje${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^amanh[ãa]${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(
        String.raw`^depois\s+de\s+amanh[ãa]${SPACE_OR_END}`,
        "i",
      ),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^em\s+(\d+)\s+dias?${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          domingo: 0,
          dom: 0,
          segunda: 1,
          "segunda-feira": 1,
          seg: 1,
          terça: 2,
          terca: 2,
          "terça-feira": 2,
          "terca-feira": 2,
          ter: 2,
          quarta: 3,
          "quarta-feira": 3,
          qua: 3,
          quinta: 4,
          "quinta-feira": 4,
          qui: 4,
          sexta: 5,
          "sexta-feira": 5,
          sex: 5,
          sábado: 6,
          sabado: 6,
          sáb: 6,
          sab: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
  id: [
    {
      regex: new RegExp(String.raw`^hari\s+ini${SPACE_OR_END}`, "i"),
      getOffset: () => 0,
    },
    {
      regex: new RegExp(String.raw`^besok${SPACE_OR_END}`, "i"),
      getOffset: () => 1,
    },
    {
      regex: new RegExp(String.raw`^lusa${SPACE_OR_END}`, "i"),
      getOffset: () => 2,
    },
    {
      regex: new RegExp(String.raw`^dalam\s+(\d+)\s+hari${SPACE_OR_END}`, "i"),
      getOffset: (match) => Number.parseInt(match[1], 10),
    },
    {
      regex: new RegExp(
        String.raw`^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)${SPACE_OR_END}`,
        "i",
      ),
      getOffset: (match) => {
        const map: Record<string, number> = {
          minggu: 0,
          senin: 1,
          selasa: 2,
          rabu: 3,
          kamis: 4,
          jumat: 5,
          "jum'at": 5,
          sabtu: 6,
        };
        const target = map[match[1].toLowerCase()];
        if (target === undefined) return null;
        return getNextWeekdayOffset(target, new Date().getDay());
      },
    },
  ],
};

const resolveDateFromPattern = (
  source: string,
  patterns: DatePattern[],
): { targetDate: Date; matchedLength: number } | null => {
  for (const pattern of patterns) {
    const match = source.match(pattern.regex);
    if (!match) continue;
    if (pattern.getDate) {
      const date = pattern.getDate(match);
      if (date) {
        return { targetDate: date, matchedLength: match[0].length };
      }
      continue;
    }
    if (pattern.getOffset) {
      const offset = pattern.getOffset(match);
      if (offset === null) continue;
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return { targetDate: date, matchedLength: match[0].length };
    }
  }
  return null;
};

function parseDateFromText(
  text: string,
  language: Language = "ja",
): { date: string | null; text: string } {
  const source = text.trimStart();
  if (!source) {
    return { date: null, text: source };
  }
  const normalized = normalizeDigits(source);
  const resolvedLanguage = normalizeLanguage(language);
  const numericParsed = resolveDateFromPattern(normalized, NUMERIC_PATTERNS);
  if (numericParsed) {
    return {
      date: formatDate(numericParsed.targetDate),
      text: source.substring(numericParsed.matchedLength).trimStart(),
    };
  }
  const languageParsed = resolveDateFromPattern(
    normalized,
    RELATIVE_PATTERNS[resolvedLanguage] ?? RELATIVE_PATTERNS.ja,
  );
  if (languageParsed) {
    return {
      date: formatDate(languageParsed.targetDate),
      text: source.substring(languageParsed.matchedLength).trimStart(),
    };
  }
  return { date: null, text };
}

function resolveTaskTextAndDateFromInput(
  text: string,
  language: Language,
  currentTask?: Pick<Task, "text" | "date">,
): { text: string; date: string } {
  const parsed = parseDateFromText(text, language);
  const parsedText = parsed.text.trim();
  if (currentTask) {
    return {
      text: parsedText || currentTask.text,
      date: parsed.date ?? currentTask.date,
    };
  }
  return {
    text: parsedText,
    date: parsed.date ?? "",
  };
}

function assertTaskListStore(data: unknown, id: string): TaskListStore {
  if (data == null) throw new Error(`TaskList not found: ${id}`);
  const d = data as Record<string, unknown>;
  if (
    typeof d.name !== "string" ||
    typeof d.tasks !== "object" ||
    d.tasks === null ||
    typeof d.memberCount !== "number"
  ) {
    throw new Error(`TaskList data is malformed: ${id}`);
  }
  return data as TaskListStore;
}

function assertTaskListOrderStore(
  data: unknown,
  uid: string,
): TaskListOrderStore {
  if (data == null) throw new Error(`TaskListOrder not found: ${uid}`);
  return data as TaskListOrderStore;
}

const getTaskListOrderEntries = (taskListOrder: TaskListOrderStore) =>
  Object.entries(taskListOrder).filter(
    ([key]) => !TASK_LIST_ORDER_METADATA_KEYS.has(key),
  );

const getValidMemberCount = (taskList: TaskListStore): number => {
  if (!Number.isInteger(taskList.memberCount) || taskList.memberCount < 1) {
    throw new Error("Invalid member count");
  }
  return taskList.memberCount;
};

const normalizeShareCode = (shareCode: string): string =>
  shareCode.trim().toUpperCase();

function getAutoSortedTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  const getDateValue = (task: TaskListStoreTask): number => {
    if (!task.date) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(task.date);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  };

  return [...tasks]
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }
      const aDate = getDateValue(a);
      const bDate = getDateValue(b);
      if (aDate !== bDate) {
        return aDate - bDate;
      }
      return a.order - b.order;
    })
    .map((task, index) => ({ ...task, order: (index + 1) * 1.0 }));
}

async function getTaskListData(taskListId: string): Promise<TaskListStore> {
  const db = getDbInstance();
  const snapshot = await getDoc(doc(db, "taskLists", taskListId));
  if (!snapshot.exists()) throw new Error("Task list not found");
  return normalizeTaskListStore(
    assertTaskListStore(snapshot.data(), taskListId),
  );
}

async function getResolvedTaskSettings(): Promise<ResolvedTaskSettings> {
  const uid = requireCurrentUserId();
  const settingsSnapshot = await getDoc(doc(getDbInstance(), "settings", uid));
  const settingsStore = settingsSnapshot.exists()
    ? (settingsSnapshot.data() as SettingsStore)
    : null;
  const settings = mapSettingsStore(settingsStore);
  return {
    autoSort: Boolean(settings?.autoSort),
    language: normalizeLanguage(settings?.language ?? DEFAULT_LANGUAGE),
    taskInsertPosition:
      settings?.taskInsertPosition === "bottom" ? "bottom" : "top",
  };
}

function getOrderedTaskListOrders(taskListOrder: TaskListOrderStore): number[] {
  return getTaskListOrderEntries(taskListOrder).map(
    ([, value]) => (value as { order: number }).order,
  );
}

async function getTaskListOrderData(uid: string): Promise<TaskListOrderStore> {
  const db = getDbInstance();
  const snapshot = await getDoc(doc(db, "taskListOrder", uid));
  return assertTaskListOrderStore(snapshot.data(), uid);
}

function renumberTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  return tasks.map((task, index) => ({ ...task, order: (index + 1) * 1.0 }));
}

function getOrderedTasks(
  taskList: Pick<TaskListStore, "tasks">,
): TaskListStoreTask[] {
  return Object.values(taskList.tasks).sort((a, b) => a.order - b.order);
}

function getSortedTasks(
  tasks: TaskListStoreTask[],
  settings: ResolvedTaskSettings,
): TaskListStoreTask[] {
  if (settings.autoSort) {
    return getAutoSortedTasks(tasks);
  }
  return renumberTasks(tasks);
}

function buildHistory(
  taskList: TaskListStore,
  newText: string,
  oldText?: string,
): string[] {
  const candidate = newText.trim();
  if (!candidate) return taskList.history ?? [];
  const nextHistory = [candidate, ...(taskList.history ?? [])];
  if (oldText) {
    return nextHistory.filter((entry) => entry.trim() !== oldText.trim());
  }
  return Array.from(new Set(nextHistory.map((entry) => entry.trim()))).filter(
    Boolean,
  );
}

function buildTaskUpdateData(params: {
  tasks: TaskListStoreTask[];
}): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  params.tasks.forEach((task) => {
    updates[`tasks.${task.id}`] = task;
  });
  return updates;
}

export async function createTaskList(name: string, background?: string | null) {
  const uid = requireCurrentUserId();
  const db = getDbInstance();
  const taskListId = doc(collection(db, "taskLists")).id;
  const now = Date.now();
  const taskListOrder = await getTaskListOrderData(uid);
  const nextOrder = Math.max(0, ...getOrderedTaskListOrders(taskListOrder)) + 1;
  const normalizedName = name.trim();
  await writeBatch(db)
    .set(doc(db, "taskLists", taskListId), {
      id: taskListId,
      name: normalizedName,
      tasks: {},
      history: [],
      shareCode: null,
      background: background ?? null,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    })
    .set(
      doc(db, "taskListOrder", uid),
      {
        [taskListId]: { order: nextOrder },
        updatedAt: now,
      },
      { merge: true },
    )
    .commit();
  return taskListId;
}

export async function updateTaskList(
  taskListId: string,
  updates: { name?: string; background?: string | null },
) {
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteTaskList(taskListId: string) {
  const uid = requireCurrentUserId();
  const db = getDbInstance();
  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListOrderRef = doc(db, "taskListOrder", uid);
    const [taskListSnapshot, taskListOrderSnapshot] = await Promise.all([
      transaction.get(taskListRef),
      transaction.get(taskListOrderRef),
    ]);
    const taskList = assertTaskListStore(taskListSnapshot.data(), taskListId);
    const taskListOrder = assertTaskListOrderStore(
      taskListOrderSnapshot.data(),
      uid,
    );
    transaction.set(
      taskListOrderRef,
      {
        [taskListId]: deleteField(),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    if (getValidMemberCount(taskList) <= 1) {
      transaction.delete(taskListRef);
      return;
    }
    transaction.update(taskListRef, {
      memberCount: getValidMemberCount(taskList) - 1,
      updatedAt: Date.now(),
    });
    const remainingOrderEntries = getTaskListOrderEntries(taskListOrder).filter(
      ([id]) => id !== taskListId,
    );
    if (remainingOrderEntries.length === 0) {
      transaction.delete(taskListOrderRef);
    }
  });
}

export async function updateTaskListOrder(
  taskListOrders: Array<{ taskListId: string; order: number }>,
) {
  const uid = requireCurrentUserId();
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  taskListOrders.forEach(({ taskListId, order }) => {
    updates[`${taskListId}.order`] = order;
  });
  await setDoc(doc(getDbInstance(), "taskListOrder", uid), updates, {
    merge: true,
  });
}

export async function addTask(taskListId: string, rawText: string) {
  const taskList = await getTaskListData(taskListId);
  const settings = await getResolvedTaskSettings();
  const parsed = resolveTaskTextAndDateFromInput(rawText, settings.language);
  const now = Date.now();
  const tasks = getOrderedTasks(taskList);
  const nextOrder =
    settings.taskInsertPosition === "bottom"
      ? Math.max(0, ...tasks.map((task) => task.order)) + 1
      : 0;
  const nextTask: TaskListStoreTask = {
    id: doc(collection(getDbInstance(), "taskLists")).id,
    text: parsed.text,
    completed: false,
    date: parsed.date,
    order: nextOrder,
  };
  const nextTasks = getSortedTasks(
    [
      ...tasks.map((task) =>
        settings.taskInsertPosition === "top"
          ? { ...task, order: task.order + 1 }
          : task,
      ),
      nextTask,
    ],
    settings,
  );
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
    ...buildTaskUpdateData({ tasks: nextTasks }),
    history: buildHistory(taskList, parsed.text),
    updatedAt: now,
  });
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Pick<Task, "completed" | "date" | "text">>,
) {
  const settings = await getResolvedTaskSettings();
  const needsTaskListRead =
    settings.autoSort || typeof updates.text === "string";
  const taskList = needsTaskListRead ? await getTaskListData(taskListId) : null;
  const currentTask = taskList?.tasks[taskId];
  if (needsTaskListRead && !currentTask) {
    throw new Error("Task not found");
  }
  const resolvedTextAndDate =
    typeof updates.text === "string" && currentTask
      ? resolveTaskTextAndDateFromInput(
          updates.text,
          settings.language,
          currentTask,
        )
      : null;
  const normalizedUpdates: Partial<Pick<Task, "completed" | "date" | "text">> =
    {
      ...updates,
    };
  if (resolvedTextAndDate) {
    normalizedUpdates.text = resolvedTextAndDate.text;
    if (!("date" in updates)) {
      normalizedUpdates.date = resolvedTextAndDate.date;
    }
  }
  if (normalizedUpdates.text !== undefined && normalizedUpdates.text === "") {
    throw new Error("Task text is empty");
  }
  const now = Date.now();

  if (!settings.autoSort) {
    const nextUpdates: Record<string, unknown> = {
      updatedAt: now,
    };
    Object.entries(normalizedUpdates).forEach(([key, value]) => {
      nextUpdates[`tasks.${taskId}.${key}`] = value;
    });
    if (
      taskList &&
      currentTask &&
      resolvedTextAndDate &&
      resolvedTextAndDate.text.trim() !== currentTask.text.trim()
    ) {
      nextUpdates.history = buildHistory(
        taskList,
        resolvedTextAndDate.text,
        currentTask.text,
      );
    }
    await updateDoc(doc(getDbInstance(), "taskLists", taskListId), nextUpdates);
    return;
  }

  if (!taskList || !currentTask) {
    throw new Error("Task not found");
  }

  const tasks = getOrderedTasks(taskList);
  const nextTasks = getSortedTasks(
    tasks.map((task) => {
      if (task.id !== taskId) return task;
      const nextTask: TaskListStoreTask = {
        ...task,
        ...normalizedUpdates,
      };
      return nextTask;
    }),
    settings,
  );
  const nextUpdates: Record<string, unknown> = {
    ...buildTaskUpdateData({ tasks: nextTasks }),
    updatedAt: now,
  };
  if (
    taskList &&
    currentTask &&
    resolvedTextAndDate &&
    resolvedTextAndDate.text.trim() !== currentTask.text.trim()
  ) {
    nextUpdates.history = buildHistory(
      taskList,
      resolvedTextAndDate.text,
      currentTask.text,
    );
  }
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), nextUpdates);
}

async function deleteTask(taskListId: string, taskId: string) {
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
    [`tasks.${taskId}`]: deleteField(),
    updatedAt: Date.now(),
  });
}

export async function deleteCompletedTasks(taskListId: string) {
  const taskList = await getTaskListData(taskListId);
  const remainingTasks = getSortedTasks(
    getOrderedTasks(taskList).filter((task) => !task.completed),
    await getResolvedTaskSettings(),
  );
  const nextData: Record<string, unknown> = {
    tasks: {},
    updatedAt: Date.now(),
  };
  remainingTasks.forEach((task) => {
    (nextData.tasks as Record<string, TaskListStoreTask>)[task.id] = task;
  });
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), nextData);
}

export async function sortTasks(taskListId: string) {
  const taskList = await getTaskListData(taskListId);
  const sortedTasks = getAutoSortedTasks(getOrderedTasks(taskList));
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
    ...buildTaskUpdateData({ tasks: sortedTasks }),
    updatedAt: Date.now(),
  });
}

export async function updateTasksOrder(
  taskListId: string,
  draggedId: string,
  targetId: string,
) {
  const taskList = await getTaskListData(taskListId);
  const tasks = getOrderedTasks(taskList);
  const oldIndex = tasks.findIndex((task) => task.id === draggedId);
  const newIndex = tasks.findIndex((task) => task.id === targetId);
  if (oldIndex === -1 || newIndex === -1) return;
  const [draggedTask] = tasks.splice(oldIndex, 1);
  tasks.splice(newIndex, 0, draggedTask);
  const nextTasks = renumberTasks(tasks);
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
    ...buildTaskUpdateData({ tasks: nextTasks }),
    updatedAt: Date.now(),
  });
}

const MAX_SHARE_CODE_ATTEMPTS = 20;

async function fetchTaskListByShareCode(shareCode: string) {
  const normalizedCode = normalizeShareCode(shareCode);
  const snapshots = await getDoc(
    doc(getDbInstance(), "shareCodes", normalizedCode),
  );
  return snapshots.exists()
    ? (snapshots.data() as { taskListId: string })
    : null;
}

export async function fetchTaskListIdByShareCode(shareCode: string) {
  const shareCodeData = await fetchTaskListByShareCode(shareCode);
  return shareCodeData?.taskListId ?? null;
}

export async function addSharedTaskListToOrder(taskListId: string) {
  const uid = requireCurrentUserId();
  const db = getDbInstance();
  await runTransaction(db, async (transaction) => {
    const taskListRef = doc(db, "taskLists", taskListId);
    const taskListOrderRef = doc(db, "taskListOrder", uid);
    const [taskListSnapshot, taskListOrderSnapshot] = await Promise.all([
      transaction.get(taskListRef),
      transaction.get(taskListOrderRef),
    ]);
    const taskList = assertTaskListStore(taskListSnapshot.data(), taskListId);
    const taskListOrder = taskListOrderSnapshot.exists()
      ? assertTaskListOrderStore(taskListOrderSnapshot.data(), uid)
      : null;
    const nextOrder =
      Math.max(
        0,
        ...(taskListOrder ? getOrderedTaskListOrders(taskListOrder) : []),
      ) + 1;
    transaction.set(
      taskListOrderRef,
      {
        [taskListId]: { order: nextOrder },
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    transaction.update(taskListRef, {
      memberCount: getValidMemberCount(taskList) + 1,
      updatedAt: Date.now(),
    });
  });
}

export async function removeShareCode(taskListId: string) {
  const taskList = await getTaskListData(taskListId);
  if (!taskList.shareCode) return;
  const normalizedCode = normalizeShareCode(taskList.shareCode);
  const db = getDbInstance();
  const batch = writeBatch(db);
  batch.delete(doc(db, "shareCodes", normalizedCode));
  batch.update(doc(db, "taskLists", taskListId), {
    shareCode: null,
    updatedAt: Date.now(),
  });
  await batch.commit();
}

function generateRandomShareCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function generateShareCode(taskListId: string): Promise<string> {
  const db = getDbInstance();
  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
    try {
      const shareCode = generateRandomShareCode();
      const shareCodeRef = doc(db, "shareCodes", shareCode);
      const shareCodeSnapshot = await getDoc(shareCodeRef);
      if (shareCodeSnapshot.exists()) continue;
      const batch = writeBatch(db);
      batch.set(shareCodeRef, {
        taskListId,
        createdAt: Date.now(),
      });
      batch.update(doc(db, "taskLists", taskListId), {
        shareCode,
        updatedAt: Date.now(),
      });
      await batch.commit();
      return shareCode;
    } catch (error) {
      if (isAbortError(error) && attempt + 1 < MAX_SHARE_CODE_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to generate share code");
}

async function updateSettings(settings: Partial<Settings>) {
  const uid = requireCurrentUserId();
  await setDoc(
    doc(getDbInstance(), "settings", uid),
    {
      ...settings,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

type AppIconName =
  | "menu"
  | "edit"
  | "share"
  | "calendar-today"
  | "drag-indicator"
  | "settings"
  | "close"
  | "send"
  | "sort"
  | "delete"
  | "arrow-back"
  | "alert-circle"
  | "check";

const ICON_PATHS: Record<AppIconName, string | string[]> = {
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.995.995 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  share:
    "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z",
  "calendar-today":
    "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z",
  "drag-indicator":
    "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  settings:
    "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l-.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  close:
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  sort: "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z",
  delete:
    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  "arrow-back": "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  "alert-circle":
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
};

type AlertVariant = "info" | "error" | "success" | "warning";

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
  announcement?: "auto" | "assertive" | "polite" | "off";
}

const ALERT_VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "border-border bg-background text-text dark:border-border-dark dark:bg-surface-dark dark:text-text-dark",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100",
};

function Alert({
  children,
  variant = "info",
  className,
  announcement = "auto",
}: AlertProps) {
  const resolvedAnnouncement =
    announcement === "auto"
      ? variant === "error" || variant === "warning"
        ? "assertive"
        : "polite"
      : announcement;
  const role =
    resolvedAnnouncement === "assertive"
      ? "alert"
      : resolvedAnnouncement === "polite"
        ? "status"
        : undefined;
  const ariaLive =
    resolvedAnnouncement === "assertive"
      ? "assertive"
      : resolvedAnnouncement === "polite"
        ? "polite"
        : undefined;

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={clsx(
        "rounded-xl border px-3 py-2 text-sm",
        ALERT_VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

const AppIcon = ({
  name,
  size = 24,
  color = "currentColor",
  ...props
}: SVGProps<SVGSVGElement> & {
  name: AppIconName;
  size?: string | number;
  color?: string;
}) => {
  const paths = ICON_PATHS[name];
  const isArray = Array.isArray(paths);
  const isRtl =
    typeof document !== "undefined" &&
    document.documentElement.dir.toLowerCase() === "rtl";
  const shouldMirrorArrow = name === "arrow-back" && isRtl;
  const style = props.style as SVGProps<SVGSVGElement>["style"];

  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      width={size}
      height={size}
      {...props}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        ...(shouldMirrorArrow ? { transform: "scaleX(-1)" } : {}),
        ...style,
      }}
    >
      {isArray ? (
        paths.map((path, index) => <path key={index} d={path} />)
      ) : (
        <path d={paths} />
      )}
    </svg>
  );
};

function Spinner({
  className,
  fullPage,
}: {
  className?: string;
  fullPage?: boolean;
}) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={clsx("flex items-center justify-center", className)}
    >
      <div className="animate-pulse">
        <img
          src="/brand/logo.svg"
          alt=""
          aria-hidden="true"
          className="block h-14 w-auto"
        />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background dark:bg-background-dark">
        {content}
      </div>
    );
  }

  return content;
}

type ColorOption = {
  value: string | null;
  label?: string;
  shortLabel?: string;
  preview?: string;
};

function ColorPicker({
  colors,
  selectedColor,
  onSelect,
  ariaLabelPrefix,
}: {
  colors: readonly ColorOption[];
  selectedColor: string | null;
  onSelect: (color: string | null) => void;
  ariaLabelPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const isSelected = selectedColor === color.value;
        const ariaLabel =
          color.label ?? `${ariaLabelPrefix} ${color.value ?? ""}`.trim();
        const previewColor =
          color.preview ?? color.value ?? "var(--tasklist-theme-bg)";

        return (
          <button
            key={color.value ?? "none"}
            type="button"
            aria-pressed={isSelected}
            aria-label={ariaLabel}
            title={color.label}
            onClick={() => onSelect(color.value)}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-[10px] border border-border text-[10px] font-semibold text-muted dark:border-border-dark dark:text-muted-dark",
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-surface dark:ring-primary-dark dark:ring-offset-surface-dark"
                : "",
            )}
            style={{ backgroundColor: previewColor }}
          >
            {color.shortLabel ?? ""}
          </button>
        );
      })}
    </div>
  );
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay(props, ref) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Overlay
      {...rest}
      ref={ref}
      className={clsx(
        "fixed inset-0 z-1200 bg-black/40 backdrop-blur-sm",
        className,
      )}
    />
  );
});

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>["children"];
    description?: ComponentPropsWithoutRef<
      typeof DialogPrimitive.Description
    >["children"];
    titleId?: string;
    descriptionId?: string;
  }
>(function DialogContent(
  { children, title, description, titleId, descriptionId, className, ...props },
  ref: ForwardedRef<ElementRef<typeof DialogPrimitive.Content>>,
) {
  const generatedTitleId = titleId ?? useId();
  const generatedDescriptionId =
    description !== undefined ? (descriptionId ?? useId()) : undefined;

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Close asChild>
        <DialogOverlay />
      </DialogPrimitive.Close>
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        aria-labelledby={generatedTitleId}
        aria-describedby={generatedDescriptionId}
        className={clsx(
          "fixed left-1/2 top-1/2 z-1300 min-w-[320px] max-w-[min(640px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--dialog-bg,#ffffff)] p-5 text-[var(--dialog-fg,#111827)] shadow-2xl",
          className,
        )}
      >
        <div className="flex flex-col gap-2">
          <DialogPrimitive.Title
            id={generatedTitleId}
            className="m-0 text-lg font-semibold"
          >
            {title}
          </DialogPrimitive.Title>
          {description !== undefined ? (
            <DialogPrimitive.Description
              id={generatedDescriptionId}
              className="m-0 text-sm text-[var(--dialog-muted,#4B5563)]"
            >
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      {children}
    </div>
  );
}

type SettingsViewProps = {
  onBack?: () => void;
  showBackButton?: boolean;
};

type SelectRowProps = {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
};

type SettingsSectionProps = {
  children: ReactNode;
  tone?: "default" | "danger";
};

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  additionalInfo?: string;
  confirmText: string;
  cancelText: string;
  isDestructive?: boolean;
  disabled?: boolean;
};

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  additionalInfo,
  confirmText,
  cancelText,
  isDestructive = false,
  disabled = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-error px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-50 dark:bg-error-dark dark:focus-visible:outline-error-dark";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent title={title} description={message}>
        {additionalInfo ? (
          <p className="mt-2 text-sm text-muted dark:text-muted-dark">
            {additionalInfo}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className={secondaryButtonClass}
            >
              {cancelText}
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={
              isDestructive ? destructiveButtonClass : primaryButtonClass
            }
          >
            {confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsSection({ children, tone = "default" }: SettingsSectionProps) {
  if (tone === "danger") {
    return (
      <section className="rounded-xl border border-red-200 bg-surface p-4 dark:border-red-900/40 dark:bg-surface-dark sm:p-5">
        {children}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark sm:p-5">
      {children}
    </section>
  );
}

function SelectRow({
  disabled,
  id,
  label,
  onChange,
  options,
  value,
}: SelectRowProps) {
  return (
    <label
      htmlFor={id}
      className={`grid gap-2 py-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-border dark:focus-within:outline-border-dark ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="text-sm font-medium text-text dark:text-text-dark sm:pr-3">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:focus:border-muted-dark"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsView({ onBack, showBackButton = false }: SettingsViewProps) {
  const { t } = useTranslation();
  const { authStatus, user } = useSessionState();
  const { settings, settingsStatus } = useSettingsState();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "signOut" | "deleteAccount" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const updateSetting = async (next: {
    theme?: Theme;
    language?: Language;
    taskInsertPosition?: TaskInsertPosition;
    autoSort?: boolean;
  }) => {
    if (isUpdating) {
      return;
    }

    setError(null);
    setIsUpdating(true);
    try {
      await updateSettings(next);
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    await updateSetting({ theme });
    logSettingsThemeChange({ theme });
  };

  const handleLanguageChange = async (language: Language) => {
    await updateSetting({ language });
    logSettingsLanguageChange({ language });
  };

  const handleTaskInsertPositionChange = async (
    taskInsertPosition: TaskInsertPosition,
  ) => {
    await updateSetting({ taskInsertPosition });
    logSettingsTaskInsertPositionChange({ position: taskInsertPosition });
  };

  const handleAutoSortChange = async (autoSort: boolean) => {
    await updateSetting({ autoSort });
    logSettingsAutoSortChange({ enabled: autoSort });
  };

  const handleSignOut = async () => {
    if (pendingAction) {
      return;
    }

    setPendingAction("signOut");
    setError(null);

    try {
      await signOut();
      logSignOut();
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setPendingAction(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (pendingAction) {
      return;
    }

    setPendingAction("deleteAccount");
    setError(null);

    try {
      await deleteAccount();
      logDeleteAccount();
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      setPendingAction(null);
    }
  };

  const handleEmailChangeSubmit = async () => {
    if (isChangingEmail) return;
    const errors = validateEmailChangeForm({ newEmail }, t);
    if (errors.email) {
      setEmailChangeError(errors.email);
      return;
    }
    setEmailChangeError(null);
    setIsChangingEmail(true);
    try {
      await sendEmailChangeVerification(newEmail);
      setEmailChangeSuccess(true);
      setNewEmail("");
      logEmailChangeRequested();
    } catch (err) {
      setEmailChangeError(resolveErrorMessage(err, t, "auth.error.general"));
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleEmailChangeClose = () => {
    setShowEmailChangeForm(false);
    setNewEmail("");
    setEmailChangeError(null);
    setEmailChangeSuccess(false);
  };

  if (authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  const isLoading =
    authStatus === "loading" ||
    settingsStatus === "loading" ||
    (!user && settingsStatus !== "error") ||
    (!settings && settingsStatus !== "error");
  const actionsDisabled =
    isLoading || pendingAction !== null || isChangingEmail;
  const settingsDisabled = isLoading || isUpdating || actionsDisabled;
  const signOutLabel =
    pendingAction === "signOut"
      ? t("settings.signingOut")
      : t("settings.danger.signOut");
  const deleteAccountLabel =
    pendingAction === "deleteAccount"
      ? t("settings.deletingAccount")
      : t("settings.deleteAccount");
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language,
    label: LANGUAGE_DISPLAY_NAMES[language],
  }));
  const themeOptions = [
    { value: "system", label: t("settings.theme.system") },
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
  ] as const;
  const taskInsertPositionOptions = [
    { value: "top", label: t("settings.taskInsertPosition.top") },
    { value: "bottom", label: t("settings.taskInsertPosition.bottom") },
  ] as const;

  const skeletonSelect = (
    <div className="h-9 w-full animate-pulse rounded-md bg-border dark:bg-border-dark" />
  );

  return (
    <div className="min-h-full w-full bg-background text-text dark:bg-background-dark dark:text-text-dark">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-10 pt-6 sm:px-6 lg:pt-8">
        <header className="flex items-center gap-3 px-1">
          {showBackButton ? (
            <button
              type="button"
              onClick={onBack}
              title={t("common.back")}
              aria-label={t("common.back")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border dark:text-muted-dark dark:hover:bg-surface-dark dark:focus-visible:outline-border-dark"
            >
              <AppIcon
                name="arrow-back"
                className="h-5 w-5"
                aria-hidden="true"
                focusable="false"
              />
            </button>
          ) : null}
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight">
            {t("settings.title")}
          </h1>
        </header>

        {error && <Alert variant="error">{error}</Alert>}

        {settingsStatus === "error" ? (
          <Alert variant="error">{t("auth.error.general")}</Alert>
        ) : (
          <>
            <SettingsSection>
              <fieldset className="flex flex-col gap-0">
                <legend className="text-sm font-semibold tracking-wide text-muted dark:text-muted-dark">
                  {t("settings.preferences.title")}
                </legend>
                <div className="mt-2 divide-y divide-border dark:divide-border-dark">
                  {settings ? (
                    <>
                      <SelectRow
                        id="settings-language"
                        label={t("settings.language.title")}
                        value={settings.language}
                        disabled={settingsDisabled}
                        options={[...languageOptions]}
                        onChange={(next) =>
                          void handleLanguageChange(next as Language)
                        }
                      />
                      <SelectRow
                        id="settings-theme"
                        label={t("settings.theme.title")}
                        value={settings.theme}
                        disabled={settingsDisabled}
                        options={[...themeOptions]}
                        onChange={(next) =>
                          void handleThemeChange(next as Theme)
                        }
                      />
                      <SelectRow
                        id="settings-task-insert-position"
                        label={t("settings.taskInsertPosition.title")}
                        value={settings.taskInsertPosition}
                        disabled={settingsDisabled}
                        options={[...taskInsertPositionOptions]}
                        onChange={(next) =>
                          void handleTaskInsertPositionChange(
                            next as TaskInsertPosition,
                          )
                        }
                      />
                    </>
                  ) : (
                    <>
                      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center">
                        <span className="text-sm font-medium text-text dark:text-text-dark">
                          {t("settings.language.title")}
                        </span>
                        {skeletonSelect}
                      </div>
                      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center">
                        <span className="text-sm font-medium text-text dark:text-text-dark">
                          {t("settings.theme.title")}
                        </span>
                        {skeletonSelect}
                      </div>
                      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center">
                        <span className="text-sm font-medium text-text dark:text-text-dark">
                          {t("settings.taskInsertPosition.title")}
                        </span>
                        {skeletonSelect}
                      </div>
                    </>
                  )}
                </div>
                <label
                  className={`mt-1 flex cursor-pointer items-center justify-between gap-4 border-t border-border py-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-border dark:border-border-dark dark:focus-within:outline-border-dark ${
                    settingsDisabled ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name="autoSort"
                    checked={settings?.autoSort ?? false}
                    onChange={(event) =>
                      void handleAutoSortChange(event.target.checked)
                    }
                    disabled={settingsDisabled}
                    className="peer sr-only"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text dark:text-text-dark">
                      {t("settings.autoSort.title")}
                    </span>
                    <span className="text-xs text-muted dark:text-muted-dark">
                      {t("settings.autoSort.enable")}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                      settings?.autoSort
                        ? "border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark"
                        : "border-border bg-border dark:border-border-dark dark:bg-surface-dark"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-surface shadow-sm transition dark:bg-background-dark ${
                        settings?.autoSort ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </span>
                </label>
              </fieldset>
            </SettingsSection>

            <SettingsSection>
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold tracking-wide text-text dark:text-text-dark">
                  {t("settings.actions.title")}
                </h2>
                <div className="border-b border-border pb-3 dark:border-border-dark">
                  <p className="text-xs font-medium tracking-wide text-muted dark:text-muted-dark">
                    {t("settings.userInfo.title")}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {user ? (
                      <p className="break-all text-sm font-medium text-text dark:text-text-dark">
                        {user.email}
                      </p>
                    ) : (
                      <div className="h-5 w-48 animate-pulse rounded bg-border dark:bg-border-dark" />
                    )}
                    {!showEmailChangeForm && (
                      <button
                        type="button"
                        onClick={() => setShowEmailChangeForm(true)}
                        disabled={actionsDisabled}
                        className="shrink-0 text-xs text-muted underline hover:text-text disabled:cursor-not-allowed disabled:opacity-60 dark:text-muted-dark dark:hover:text-text-dark"
                      >
                        {t("settings.emailChange.changeButton")}
                      </button>
                    )}
                  </div>
                  {showEmailChangeForm && (
                    <div className="mt-3 flex flex-col gap-3">
                      {emailChangeSuccess ? (
                        <Alert variant="success">
                          {t("settings.emailChange.successMessage")}
                        </Alert>
                      ) : (
                        <>
                          {emailChangeError && (
                            <Alert variant="error">{emailChangeError}</Alert>
                          )}
                          <div>
                            <label
                              htmlFor="new-email"
                              className="mb-1 block text-xs font-medium text-muted dark:text-muted-dark"
                            >
                              {t("settings.emailChange.newEmailLabel")}
                            </label>
                            <input
                              id="new-email"
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              disabled={isChangingEmail}
                              placeholder={t(
                                "settings.emailChange.newEmailPlaceholder",
                              )}
                              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:focus:border-muted-dark"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleEmailChangeClose}
                              disabled={isChangingEmail}
                              className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:border-muted hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:hover:border-muted-dark dark:hover:bg-surface-dark"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleEmailChangeSubmit()}
                              disabled={isChangingEmail || !newEmail.trim()}
                              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark"
                            >
                              {isChangingEmail
                                ? t("settings.emailChange.submitting")
                                : t("settings.emailChange.submitButton")}
                            </button>
                          </div>
                        </>
                      )}
                      {emailChangeSuccess && (
                        <button
                          type="button"
                          onClick={handleEmailChangeClose}
                          className="text-xs text-muted underline hover:text-text dark:text-muted-dark dark:hover:text-text-dark"
                        >
                          {t("common.close")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSignOutConfirm(true)}
                    disabled={actionsDisabled}
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text shadow-sm transition hover:border-muted hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:hover:border-muted-dark dark:hover:bg-surface-dark dark:focus-visible:outline-border-dark"
                  >
                    {signOutLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={actionsDisabled}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100 dark:hover:bg-red-900/40 dark:focus-visible:outline-red-500"
                  >
                    {deleteAccountLabel}
                  </button>
                </div>
              </div>
            </SettingsSection>
          </>
        )}

        <ConfirmDialog
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={() => {
            setShowSignOutConfirm(false);
            void handleSignOut();
          }}
          title={t("auth.signOutConfirm.title")}
          message={t("auth.signOutConfirm.message")}
          confirmText={t("auth.button.signOut")}
          cancelText={t("auth.button.cancel")}
          disabled={actionsDisabled}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            void handleDeleteAccount();
          }}
          title={t("auth.deleteAccountConfirm.title")}
          message={t("auth.deleteAccountConfirm.message")}
          confirmText={t("auth.button.delete")}
          cancelText={t("auth.button.cancel")}
          isDestructive={true}
          disabled={actionsDisabled}
        />
      </div>
    </div>
  );
}

// pages/404.tsx
function NotFoundPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("pages.notFound.title");
  }, [t]);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-surface p-4 text-text dark:bg-background-dark dark:text-text-dark">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <AppIcon
            name="alert-circle"
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
          />
        </div>
        <h1 className="text-lg font-semibold">{t("pages.notFound.title")}</h1>
        <p className="text-sm text-muted dark:text-muted-dark">
          {t("pages.notFound.description")}
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primaryText hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
        >
          {t("pages.notFound.backHome")}
        </a>
      </div>
    </div>
  );
}

// pages/500.tsx
function ServerErrorPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("pages.serverError.title");
  }, [t]);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-surface p-4 text-text dark:bg-background-dark dark:text-text-dark">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AppIcon
            name="alert-circle"
            className="h-6 w-6 text-red-600 dark:text-red-400"
          />
        </div>
        <h1 className="text-lg font-semibold">
          {t("pages.serverError.title")}
        </h1>
        <p className="text-sm text-muted dark:text-muted-dark">
          {t("pages.serverError.description")}
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primaryText hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
        >
          {t("pages.serverError.backHome")}
        </a>
      </div>
    </div>
  );
}

// pages/app.tsx
const COLORS: readonly ColorOption[] = [
  {
    value: null,
    preview: "var(--tasklist-theme-bg)",
  },
  { value: "#F87171" },
  { value: "#FBBF24" },
  { value: "#34D399" },
  { value: "#38BDF8" },
  { value: "#818CF8" },
  { value: "#A78BFA" },
];

const resolveTaskListBackground = (background: string | null): string =>
  background ?? "var(--tasklist-theme-bg)";

const parseTaskDate = (dateStr: string | null | undefined): Date | null => {
  const parsed = dateStr ? new Date(dateStr) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const formatTaskDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const createDateFromKey = (dateKey: string): Date | null => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return [y, m, d].some(Number.isNaN) ? null : new Date(y, m - 1, d);
};

const formatMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type AppView = "taskLists" | "detail" | "settings";

type DatedTask = {
  taskListId: string;
  taskListName: string;
  taskListBackground: string;
  task: Task;
  dateValue: Date;
  dateKey: string;
};

const getDatedTaskId = (task: DatedTask): string =>
  `${task.taskListId}:${task.task.id}`;

const TASK_LISTS_ROUTE = "/task-lists";
const SETTINGS_ROUTE = "/settings";

type KnownAppHashRoute =
  | { view: "taskLists" | "settings" }
  | { view: "detail"; taskListId: string };
type AppHashRoute = KnownAppHashRoute | { view: "unknown" };

const parseAppHashRoute = (hash: string): AppHashRoute => {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash) return { view: "unknown" };
  if (normalizedHash === TASK_LISTS_ROUTE) return { view: "taskLists" };
  if (normalizedHash === SETTINGS_ROUTE) return { view: "settings" };

  const detailPrefix = `${TASK_LISTS_ROUTE}/`;
  if (normalizedHash.startsWith(detailPrefix)) {
    const encodedTaskListId = normalizedHash.slice(detailPrefix.length);
    if (!encodedTaskListId) return { view: "unknown" };

    try {
      return {
        view: "detail",
        taskListId: decodeURIComponent(encodedTaskListId),
      };
    } catch {
      return { view: "unknown" };
    }
  }

  return { view: "unknown" };
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type AppHeaderProps = { backLabel: string; onBack: () => void };

function AppHeader({ backLabel, onBack }: AppHeaderProps) {
  return (
    <header className="flex items-center px-1 py-1.5">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        title={backLabel}
        className="inline-flex items-center justify-center rounded p-3 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark"
      >
        <AppIcon
          className="h-6 w-6"
          name="arrow-back"
          aria-hidden="true"
          focusable="false"
        />
        <span className="sr-only">{backLabel}</span>
      </button>
    </header>
  );
}

const Drawer = DrawerPrimitive.Root;
const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;

const DrawerOverlay = forwardRef<
  ElementRef<typeof DrawerPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(function DrawerOverlay({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={clsx(
        "fixed inset-0 z-1000 bg-black/50 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
});

const DrawerContent = forwardRef<
  ElementRef<typeof DrawerPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    className?: string;
    overlayClassName?: string;
  }
>(function DrawerContent(
  { className, children, overlayClassName, style, ...props },
  ref,
) {
  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerPrimitive.Content
        ref={ref}
        className={clsx(
          "fixed inset-y-0 z-1100 w-full max-w-[460px] outline-none",
          className,
        )}
        style={{ insetInlineStart: 0, ...style }}
        {...props}
      >
        <div className="flex h-full flex-col gap-4 overflow-y-auto bg-surface p-4 text-text shadow-2xl dark:bg-surface-dark dark:text-text-dark">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("flex flex-col gap-3 text-start", className)}
      {...props}
    />
  );
}

type CarouselDirection = "ltr" | "rtl";
type RtlScrollMode = "positive-ascending" | "positive-descending" | "negative";

let rtlScrollModeCache: RtlScrollMode | null = null;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const detectRtlScrollMode = (): RtlScrollMode => {
  if (rtlScrollModeCache) return rtlScrollModeCache;
  if (typeof document === "undefined") {
    rtlScrollModeCache = "positive-ascending";
    return rtlScrollModeCache;
  }

  const container = document.createElement("div");
  const child = document.createElement("div");
  container.dir = "rtl";
  container.style.width = "4px";
  container.style.height = "1px";
  container.style.overflow = "scroll";
  container.style.position = "absolute";
  container.style.top = "-9999px";
  child.style.width = "8px";
  child.style.height = "1px";
  container.appendChild(child);
  document.body.appendChild(container);

  const initial = container.scrollLeft;
  if (initial > 0) {
    rtlScrollModeCache = "positive-descending";
    document.body.removeChild(container);
    return rtlScrollModeCache;
  }

  container.scrollLeft = 1;
  rtlScrollModeCache =
    container.scrollLeft === 0 ? "negative" : "positive-ascending";
  document.body.removeChild(container);
  return rtlScrollModeCache;
};

const getInlineOffsetFromScrollLeft = (
  scrollLeft: number,
  maxOffset: number,
  direction: CarouselDirection,
): number => {
  if (direction === "ltr") return clamp(scrollLeft, 0, maxOffset);
  const mode = detectRtlScrollMode();
  if (mode === "negative") return clamp(-scrollLeft, 0, maxOffset);
  if (mode === "positive-descending") {
    return clamp(maxOffset - scrollLeft, 0, maxOffset);
  }
  return clamp(scrollLeft, 0, maxOffset);
};

const getScrollLeftFromInlineOffset = (
  inlineOffset: number,
  maxOffset: number,
  direction: CarouselDirection,
): number => {
  const clamped = clamp(inlineOffset, 0, maxOffset);
  if (direction === "ltr") return clamped;
  const mode = detectRtlScrollMode();
  if (mode === "negative") return -clamped;
  if (mode === "positive-descending") return maxOffset - clamped;
  return clamped;
};

function Carousel({
  children,
  index,
  onIndexChange,
  direction = "ltr",
  className,
  showIndicators = true,
  indicatorPosition = "bottom",
  ariaLabel,
  getIndicatorLabel,
  scrollEnabled = true,
  indicatorInFlow = false,
}: {
  children: React.ReactNode;
  index: number;
  onIndexChange: (index: number) => void;
  direction?: CarouselDirection;
  className?: string;
  showIndicators?: boolean;
  indicatorPosition?: "top" | "bottom";
  ariaLabel?: string;
  getIndicatorLabel?: (index: number, total: number) => string;
  scrollEnabled?: boolean;
  indicatorInFlow?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);
  const skipSmoothSyncRef = useRef(false);
  const count = Children.count(children);
  const currentIndex =
    count === 0 ? 0 : Math.max(0, Math.min(index, count - 1));
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    if (count === 0 || index === currentIndex) return;
    onIndexChange(currentIndex);
  }, [count, currentIndex, index, onIndexChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || count === 0) return;

    const maxOffset = Math.max(
      0,
      container.scrollWidth - container.clientWidth,
    );
    const targetInlineOffset = currentIndex * container.clientWidth;
    const targetScrollLeft = getScrollLeftFromInlineOffset(
      targetInlineOffset,
      maxOffset,
      direction,
    );
    if (!isScrollingRef.current) {
      if (Math.abs(container.scrollLeft - targetScrollLeft) > 2) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: skipSmoothSyncRef.current ? "auto" : "smooth",
        });
      }
      skipSmoothSyncRef.current = false;
    }
  }, [count, currentIndex, direction]);

  useEffect(() => {
    skipSmoothSyncRef.current = true;
  }, [direction]);

  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    },
    [],
  );

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (container.clientWidth === 0 || count === 0) return;
      const maxOffset = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const inlineOffset = getInlineOffsetFromScrollLeft(
        container.scrollLeft,
        maxOffset,
        direction,
      );
      const nextIndex = Math.round(inlineOffset / container.clientWidth);
      const clampedIndex = Math.max(0, Math.min(nextIndex, count - 1));
      if (clampedIndex !== currentIndexRef.current) {
        skipSmoothSyncRef.current = true;
        onIndexChange(clampedIndex);
      }
    }, 150);
  }, [count, direction, onIndexChange]);

  return (
    <div className={clsx("relative w-full overflow-hidden", className)}>
      {showIndicators && count > 0 ? (
        <nav
          aria-label={ariaLabel}
          className={clsx(
            indicatorInFlow
              ? "flex justify-center gap-0.5"
              : "pointer-events-none absolute left-0 right-0 z-30 flex justify-center gap-0.5",
            indicatorInFlow
              ? indicatorPosition === "top"
                ? "mb-2"
                : "mt-2"
              : indicatorPosition === "top"
                ? "top-14"
                : "bottom-4",
          )}
        >
          {Array.from({ length: count }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (idx === currentIndexRef.current) return;
                skipSmoothSyncRef.current = false;
                onIndexChange(idx);
              }}
              className={clsx(
                "inline-flex items-center justify-center rounded-full p-2 transition-all",
                !indicatorInFlow && "pointer-events-auto",
                "hover:bg-primary/10 dark:hover:bg-primary-dark/10",
              )}
              aria-label={
                getIndicatorLabel?.(idx, count) ?? `Go to slide ${idx + 1}`
              }
              aria-current={idx === currentIndex ? "true" : undefined}
            >
              <span
                className={clsx(
                  "h-2 w-2 rounded-full transition-all",
                  idx === currentIndex
                    ? "scale-110 bg-primary dark:bg-primary-dark"
                    : "bg-primary/20 dark:bg-primary-dark/20",
                )}
              />
            </button>
          ))}
        </nav>
      ) : null}
      <div
        ref={containerRef}
        onScroll={scrollEnabled ? handleScroll : undefined}
        className={clsx(
          "flex h-full w-full snap-x snap-mandatory no-scrollbar scroll-smooth",
          scrollEnabled
            ? "overflow-x-auto overflow-y-hidden"
            : "overflow-hidden",
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          direction,
        }}
      >
        {Children.map(children, (child, idx) => (
          <div
            key={idx}
            className="h-full w-full flex-shrink-0 snap-start snap-always"
            aria-hidden={idx !== currentIndex}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

const useOptimisticReorder = <T extends { id: string }>(
  initialItems: T[],
  onReorder: (draggedId: string, targetId: string) => Promise<void>,
  { suspendExternalSync = false }: { suspendExternalSync?: boolean } = {},
) => {
  const [optimisticItems, setOptimisticItems] = useState<T[] | null>(null);
  const items = optimisticItems ?? initialItems;

  useEffect(() => {
    if (suspendExternalSync || !optimisticItems) return;
    if (optimisticItems.length !== initialItems.length) {
      setOptimisticItems(null);
      return;
    }

    const latestItemsById = new Map(
      initialItems.map((item) => [item.id, item] as const),
    );
    const mergedItems = optimisticItems.map((item) =>
      latestItemsById.get(item.id),
    );
    if (mergedItems.some((item) => item === undefined)) {
      setOptimisticItems(null);
      return;
    }

    const nextOptimisticItems = mergedItems as T[];
    if (
      nextOptimisticItems.every(
        (item, index) => item.id === initialItems[index]?.id,
      )
    ) {
      setOptimisticItems(null);
      return;
    }

    if (
      nextOptimisticItems.every(
        (item, index) => item === optimisticItems[index],
      )
    ) {
      return;
    }

    setOptimisticItems(nextOptimisticItems);
  }, [initialItems, optimisticItems, suspendExternalSync]);

  const reorder = useCallback(
    async (draggedId: string, targetId: string) => {
      if (!draggedId || !targetId || draggedId === targetId) return;
      setOptimisticItems((currentItems) => {
        const sourceItems = currentItems ?? initialItems;
        const oldIndex = sourceItems.findIndex((item) => item.id === draggedId);
        const newIndex = sourceItems.findIndex((item) => item.id === targetId);
        if (oldIndex === -1 || newIndex === -1) return sourceItems;
        const result = sourceItems.slice();
        const [removed] = result.splice(oldIndex, 1);
        result.splice(newIndex, 0, removed);
        return result;
      });
      try {
        await onReorder(draggedId, targetId);
      } catch (error) {
        setOptimisticItems(null);
        throw error;
      }
    },
    [initialItems, onReorder],
  );

  return { items, reorder };
};

const DATE_FNS_LOCALE_BY_LANGUAGE: Record<string, Locale> = {
  ja: dateFnsJa,
  en: enUS,
  es: dateFnsEs,
  de: dateFnsDe,
  fr: dateFnsFr,
  ko: dateFnsKo,
  "zh-CN": dateFnsZhCN,
  hi: dateFnsHi,
  ar: dateFnsAr,
  "pt-BR": dateFnsPtBR,
  id: dateFnsId,
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const resolvedLocale = locale ?? DATE_FNS_LOCALE_BY_LANGUAGE[language];

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={clsx("p-2", className)}
      locale={resolvedLocale}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center justify-between space-x-1",
        nav_button:
          "h-8 w-8 rounded-lg border border-border bg-surface p-0 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark dark:text-muted-dark dark:hover:bg-background-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark",
        nav_button_previous: "absolute ltr:left-1 rtl:right-1",
        nav_button_next: "absolute ltr:right-1 rtl:left-1",
        table: "w-full border-collapse space-y-1",
        month_grid: "w-full",
        head_row: "flex",
        head_cell:
          "w-9 text-[0.8rem] font-medium text-placeholder dark:text-placeholder-dark",
        row: "mt-2 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-lg p-0 font-medium text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted aria-selected:bg-primary aria-selected:text-primaryText dark:text-text-dark dark:focus-visible:outline-muted-dark dark:aria-selected:bg-primary-dark dark:aria-selected:text-primaryText-dark",
        selected: "rounded-lg bg-border dark:bg-surface",
        today: "border border-border dark:border-border-dark",
        day_today: "border border-border dark:border-border-dark",
        outside: "text-placeholder opacity-50 dark:text-placeholder-dark",
        day_outside: "text-placeholder opacity-50 dark:text-placeholder-dark",
        disabled: "text-placeholder opacity-50 dark:text-placeholder-dark",
        day_disabled: "text-placeholder opacity-50 dark:text-placeholder-dark",
        hidden: "invisible",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

const parseTaskDateValue = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return undefined;
    }
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatTaskDateValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent(
  { className, align = "center", sideOffset = 4, ...props },
  ref: ForwardedRef<ElementRef<typeof PopoverPrimitive.Content>>,
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={clsx(
          "z-50 w-auto rounded-xl border border-border bg-surface p-2 text-text shadow-lg outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

function TaskItemComponent({
  task,
  isEditing,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onDateChange,
  onDragInteractionChange,
}: {
  task: Task;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task, text?: string) => void;
  onToggle: (task: Task) => void;
  onDateChange?: (taskId: string, date: string) => void;
  onDragInteractionChange?: (active: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [isHandlePointerDown, setIsHandlePointerDown] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const taskTextId = `task-item-text-${task.id}`;
  const selectedDate = parseTaskDateValue(task.date);
  const setDateLabel = t("pages.tasklist.setDate");
  const dateDisplayValue = selectedDate
    ? new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
        weekday: "short",
      }).format(selectedDate)
    : null;
  const dateTitle = dateDisplayValue
    ? `${setDateLabel}: ${dateDisplayValue}`
    : setDateLabel;

  useEffect(() => {
    if (!isHandlePointerDown) return;
    const release = () => setIsHandlePointerDown(false);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    return () => {
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  }, [isHandlePointerDown]);

  useEffect(() => {
    onDragInteractionChange?.(isHandlePointerDown || isDragging);
  }, [isDragging, isHandlePointerDown, onDragInteractionChange]);

  useEffect(
    () => () => {
      onDragInteractionChange?.(false);
    },
    [onDragInteractionChange],
  );

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 py-2">
      <button
        {...attributes}
        {...listeners}
        title={t("pages.tasklist.dragHint")}
        aria-label={t("pages.tasklist.dragHint")}
        type="button"
        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          setIsHandlePointerDown(true);
          listeners?.onPointerDown?.(event);
        }}
        className="flex touch-none items-center text-placeholder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="relative right-[5px]">
          <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
        </span>
      </button>
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          aria-labelledby={taskTextId}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface transition-colors peer-checked:border-transparent peer-checked:bg-border peer-focus-visible:ring-2 peer-focus-visible:ring-muted dark:border-border-dark dark:bg-surface-dark dark:peer-checked:bg-surface">
          <svg
            className="h-3.5 w-3.5 text-surface opacity-0 transition-opacity peer-checked:opacity-100 dark:text-surface-dark"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {dateDisplayValue ? (
          <span
            className="absolute -top-2 text-xs leading-none text-muted dark:text-muted-dark"
            style={{ insetInlineStart: 0 }}
          >
            {dateDisplayValue}
          </span>
        ) : null}
        {isEditing ? (
          <input
            id={taskTextId}
            type="text"
            value={editingText}
            onChange={(event) => onEditingTextChange(event.target.value)}
            onBlur={() => onEditEnd(task)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") onEditEnd(task);
              if (event.key === "Escape") onEditEnd(task, task.text);
            }}
            autoFocus
            className={clsx(
              "min-w-0 w-full bg-transparent p-0 font-medium leading-7 focus:outline-none",
              task.completed
                ? "text-muted line-through dark:text-muted-dark"
                : "text-text dark:text-text-dark",
            )}
          />
        ) : (
          <span
            id={taskTextId}
            role="button"
            tabIndex={0}
            onClick={() => onEditStart(task)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEditStart(task);
              }
            }}
            className={
              task.completed
                ? "min-w-0 cursor-pointer text-start font-medium leading-7 text-muted line-through underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:focus-visible:outline-muted-dark"
                : "min-w-0 cursor-pointer text-start font-medium leading-7 text-text underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-text-dark dark:focus-visible:outline-muted-dark"
            }
          >
            {task.text}
          </span>
        )}
      </div>
      <PopoverPrimitive.Root
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={setDateLabel}
            title={dateTitle}
            className="flex items-center rounded-lg p-1 text-placeholder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark"
          >
            <AppIcon
              name="calendar-today"
              aria-hidden="true"
              focusable="false"
            />
            <span className="sr-only">{setDateLabel}</span>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverContent align="end" className="p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(next) => {
              onDateChange?.(task.id, next ? formatTaskDateValue(next) : "");
              setDatePickerOpen(false);
            }}
          />
        </PopoverContent>
      </PopoverPrimitive.Root>
    </div>
  );
}

const TaskItem = memo(TaskItemComponent);

function TaskListCard({
  taskList,
  isActive,
  onActivate,
  sensorsList,
  onSortingChange,
  onDragInteractionChange,
  onDeleted,
}: {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  sensorsList: SensorDescriptor<SensorOptions>[];
  onSortingChange?: (sorting: boolean) => void;
  onDragInteractionChange?: (active: boolean) => void;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation();
  const reactId = useId();
  const [taskError, setTaskError] = useState<string | null>(null);
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    taskList.tasks,
    (draggedId, targetId) => updateTasksOrder(taskList.id, draggedId, targetId),
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const editingTaskIdRef = useRef<string | null>(null);
  editingTaskIdRef.current = editingTaskId;
  const [newTaskText, setNewTaskText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteCompletedPending, setDeleteCompletedPending] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
  const [showEditListDialog, setShowEditListDialog] = useState(false);
  const [editListName, setEditListName] = useState(taskList.name);
  const [editListBackground, setEditListBackground] = useState<string | null>(
    taskList.background,
  );
  const [deletingList, setDeletingList] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(
    taskList.shareCode ?? null,
  );
  const [generatingShareCode, setGeneratingShareCode] = useState(false);
  const [removingShareCode, setRemovingShareCode] = useState(false);
  const [shareCopySuccess, setShareCopySuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!showShareDialog) return;
    setShareCode(taskList.shareCode ?? null);
  }, [taskList.shareCode, showShareDialog]);

  useEffect(() => {
    if (isActive) return;
    onDragInteractionChange?.(false);
  }, [isActive, onDragInteractionChange]);

  const historyOptions = (() => {
    const input = newTaskText.trim();
    if (
      !taskList.history ||
      taskList.history.length === 0 ||
      input.length < 2
    ) {
      return [];
    }
    const inputLower = input.toLowerCase();
    const seen = new Set<string>();
    const options: string[] = [];
    for (const candidate of taskList.history) {
      const option = candidate.trim();
      if (option === "") continue;
      const optionLower = option.toLowerCase();
      if (optionLower === inputLower || !optionLower.includes(inputLower)) {
        continue;
      }
      if (seen.has(optionLower)) continue;
      seen.add(optionLower);
      options.push(option);
      if (options.length >= 20) break;
    }
    return options;
  })();

  useEffect(() => {
    if (historyOptions.length === 0) setHistoryOpen(false);
  }, [historyOptions.length]);

  const completedTaskCount = tasks.reduce(
    (count, task) => count + (task.completed ? 1 : 0),
    0,
  );
  const historyListId = `task-history-${reactId.replace(/:/g, "")}`;
  const inputClass =
    "rounded-xl border border-border bg-inputBackground px-3 py-2 text-text focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 font-semibold text-primaryText hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";
  const secondaryButtonClass =
    "inline-flex items-center justify-center h-12 w-12 rounded-xl border-border font-semibold text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-error px-4 py-2 font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-50 dark:bg-error-dark dark:focus-visible:outline-error-dark";
  const iconButtonClass = clsx(secondaryButtonClass, "px-2");

  return (
    <section
      className={clsx(
        "h-full overflow-y-auto",
        isActive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{ backgroundColor: taskList.background ?? undefined }}
    >
      <div className="min-h-full px-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <h2 className="m-0 text-xl font-semibold">{taskList.name}</h2>
                </div>
                <div className="relative left-2 flex flex-wrap justify-end">
                  <Dialog
                    open={isActive && showEditListDialog}
                    onOpenChange={(open: boolean) => {
                      onActivate?.(taskList.id);
                      setShowEditListDialog(open);
                      if (open) {
                        setEditListName(taskList.name);
                        setEditListBackground(taskList.background);
                        setEditError(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onActivate?.(taskList.id)}
                        className={iconButtonClass}
                        aria-label={t("taskList.editDetails")}
                        title={t("taskList.editDetails")}
                      >
                        <AppIcon
                          name="edit"
                          aria-hidden="true"
                          focusable="false"
                        />
                        <span className="sr-only">
                          {t("taskList.editDetails")}
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent
                      title={t("taskList.editDetails")}
                      description={t("app.taskListName")}
                    >
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!editListName.trim()) return;
                          void updateTaskList(taskList.id, {
                            ...(editListName.trim() !== taskList.name
                              ? { name: editListName.trim() }
                              : {}),
                            ...(editListBackground !== taskList.background
                              ? { background: editListBackground }
                              : {}),
                          })
                            .then(() => setShowEditListDialog(false))
                            .catch((error) =>
                              setEditError(
                                resolveErrorMessage(error, t, "common.error"),
                              ),
                            );
                        }}
                      >
                        <div className="mt-4 flex flex-col gap-3">
                          {editError ? (
                            <Alert variant="error">{editError}</Alert>
                          ) : null}
                          <label className="flex flex-col gap-1">
                            <span>{t("app.taskListName")}</span>
                            <input
                              type="text"
                              value={editListName}
                              onChange={(event) =>
                                setEditListName(event.target.value)
                              }
                              placeholder={t("app.taskListNamePlaceholder")}
                              className={inputClass}
                            />
                          </label>
                          <div className="flex flex-col gap-2">
                            <span>{t("taskList.selectColor")}</span>
                            <ColorPicker
                              colors={COLORS}
                              selectedColor={editListBackground ?? null}
                              onSelect={setEditListBackground}
                              ariaLabelPrefix={t("taskList.selectColor")}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  t("taskList.deleteListConfirm.message"),
                                )
                              ) {
                                return;
                              }
                              setDeletingList(true);
                              setEditError(null);
                              void deleteTaskList(taskList.id)
                                .then(() => {
                                  setShowEditListDialog(false);
                                  onDeleted?.();
                                })
                                .catch((error) =>
                                  setEditError(
                                    resolveErrorMessage(
                                      error,
                                      t,
                                      "common.error",
                                    ),
                                  ),
                                )
                                .finally(() => setDeletingList(false));
                            }}
                            disabled={deletingList}
                            className={clsx(
                              destructiveButtonClass,
                              "mt-6 w-full",
                            )}
                          >
                            {deletingList
                              ? t("common.deleting")
                              : t("taskList.deleteList")}
                          </button>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <button
                              type="button"
                              className={secondaryButtonClass}
                            >
                              {t("common.cancel")}
                            </button>
                          </DialogClose>
                          <button
                            type="submit"
                            disabled={!editListName.trim()}
                            className={primaryButtonClass}
                          >
                            {t("taskList.editDetails")}
                          </button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={isActive && showShareDialog}
                    onOpenChange={(open: boolean) => {
                      onActivate?.(taskList.id);
                      setShowShareDialog(open);
                      if (open) {
                        setShareCode(taskList.shareCode ?? null);
                        setShareCopySuccess(false);
                        setShareError(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onActivate?.(taskList.id)}
                        className={iconButtonClass}
                        aria-label={t("taskList.share")}
                        title={t("taskList.share")}
                      >
                        <AppIcon
                          name="share"
                          aria-hidden="true"
                          focusable="false"
                        />
                        <span className="sr-only">{t("taskList.share")}</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent
                      title={t("taskList.shareTitle")}
                      description={t("taskList.shareDescription")}
                    >
                      {shareError ? (
                        <Alert variant="error">{shareError}</Alert>
                      ) : null}
                      {shareCode ? (
                        <div className="mt-4 flex flex-col gap-3">
                          <label className="flex flex-col gap-1.5">
                            <span>{t("taskList.shareCode")}</span>
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={shareCode}
                                readOnly
                                className={clsx(inputClass, "font-mono")}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      `${window.location.origin}/sharecodes/?code=${shareCode}`,
                                    );
                                    setShareCopySuccess(true);
                                    setTimeout(
                                      () => setShareCopySuccess(false),
                                      2000,
                                    );
                                  } catch {
                                    setShareError(t("common.error"));
                                  }
                                }}
                                className={secondaryButtonClass}
                              >
                                {shareCopySuccess
                                  ? t("common.copied")
                                  : t("common.copy")}
                              </button>
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setRemovingShareCode(true);
                              setShareError(null);
                              void removeShareCode(taskList.id)
                                .then(() => {
                                  setShareCode(null);
                                  logShareCodeRemove();
                                })
                                .catch((error) =>
                                  setShareError(
                                    resolveErrorMessage(
                                      error,
                                      t,
                                      "common.error",
                                    ),
                                  ),
                                )
                                .finally(() => setRemovingShareCode(false));
                            }}
                            disabled={removingShareCode}
                            className={destructiveButtonClass}
                          >
                            {removingShareCode
                              ? t("common.deleting")
                              : t("taskList.removeShare")}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratingShareCode(true);
                              setShareError(null);
                              void generateShareCode(taskList.id)
                                .then((code) => {
                                  setShareCode(code);
                                  logShareCodeGenerate();
                                })
                                .catch((error) =>
                                  setShareError(
                                    resolveErrorMessage(
                                      error,
                                      t,
                                      "common.error",
                                    ),
                                  ),
                                )
                                .finally(() => setGeneratingShareCode(false));
                            }}
                            disabled={generatingShareCode}
                            className={primaryButtonClass}
                          >
                            {generatingShareCode
                              ? t("common.loading")
                              : t("taskList.generateShare")}
                          </button>
                        </div>
                      )}
                      <DialogFooter>
                        <DialogClose asChild>
                          <button
                            type="button"
                            className={secondaryButtonClass}
                          >
                            {t("common.close")}
                          </button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              {taskError ? <Alert variant="error">{taskError}</Alert> : null}
            </div>
            <form
              className="flex items-center"
              onSubmit={(event) => {
                event.preventDefault();
                if (newTaskText.trim() === "") return;
                setHistoryOpen(false);
                newTaskInputRef.current?.focus();
                void addTask(taskList.id, newTaskText.trim())
                  .then(() => {
                    setNewTaskText("");
                    setTaskError(null);
                    setAddTaskError(null);
                    logTaskAdd({ has_date: false });
                  })
                  .catch((error) =>
                    setAddTaskError(
                      resolveErrorMessage(error, t, "common.error"),
                    ),
                  );
              }}
            >
              <div className="relative min-w-0 flex-1">
                <CommandPrimitive
                  shouldFilter={false}
                  className="bg-transparent"
                >
                  <input
                    ref={newTaskInputRef}
                    type="text"
                    aria-label={t("pages.tasklist.addTaskPlaceholder")}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-controls={
                      historyOptions.length > 0 ? historyListId : undefined
                    }
                    aria-expanded={historyOpen && historyOptions.length > 0}
                    value={newTaskText}
                    onChange={(event) => {
                      setNewTaskText(event.target.value);
                      setAddTaskError(null);
                      setHistoryOpen(true);
                    }}
                    onFocus={() => {
                      setHistoryOpen(true);
                      setIsInputFocused(true);
                    }}
                    onBlur={() => {
                      setHistoryOpen(false);
                      setIsInputFocused(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing) return;
                      if (event.key === "Enter" && newTaskText.trim() !== "") {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                      if (event.key === "Escape") setHistoryOpen(false);
                    }}
                    placeholder={t("pages.tasklist.addTaskPlaceholder")}
                    className="w-full rounded-xl border border-border bg-inputBackground px-3 py-2 text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                  />
                  {historyOpen && historyOptions.length > 0 ? (
                    <CommandPrimitive.List
                      id={historyListId}
                      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-surface p-1 shadow-lg dark:border-border-dark dark:bg-surface-dark"
                    >
                      {historyOptions.map((text) => (
                        <CommandPrimitive.Item
                          key={text}
                          value={text}
                          onMouseDown={(event: MouseEvent<HTMLDivElement>) =>
                            event.preventDefault()
                          }
                          onSelect={() => {
                            setAddTaskError(null);
                            setHistoryOpen(false);
                            newTaskInputRef.current?.focus();
                            void addTask(taskList.id, text)
                              .then(() => {
                                setNewTaskText("");
                                logTaskAdd({ has_date: false });
                              })
                              .catch((error) =>
                                setAddTaskError(
                                  resolveErrorMessage(error, t, "common.error"),
                                ),
                              );
                          }}
                          className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[selected=true]:bg-background dark:data-[selected=true]:bg-background-dark"
                        >
                          {text}
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.List>
                  ) : null}
                </CommandPrimitive>
              </div>
              <button
                type="submit"
                onMouseDown={(event) => event.preventDefault()}
                disabled={newTaskText.trim() === ""}
                aria-label={t("common.add")}
                title={t("common.add")}
                className={clsx(
                  "inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-placeholder transition-all duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed dark:text-text-dark dark:focus-visible:outline-muted-dark dark:disabled:opacity-50",
                  isInputFocused
                    ? "ml-2 w-8 pointer-events-auto opacity-100"
                    : "ml-0 w-0 pointer-events-none opacity-0",
                )}
              >
                <span className="sr-only">{t("common.add")}</span>
                <span className="relative left-[1px]">
                  <AppIcon name="send" aria-hidden="true" focusable="false" />
                </span>
              </button>
            </form>
            {addTaskError ? (
              <Alert variant="error">{addTaskError}</Alert>
            ) : null}
            <div className="flex items-center justify-between gap-2 pb-6">
              <button
                type="button"
                disabled={tasks.length < 2}
                onClick={() => {
                  setTaskError(null);
                  void sortTasks(taskList.id)
                    .then(() => logTaskSort())
                    .catch((error) =>
                      setTaskError(
                        resolveErrorMessage(error, t, "common.error"),
                      ),
                    );
                }}
                className="inline-flex items-center justify-center rounded-xl font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:text-text-dark dark:focus-visible:outline-muted-dark"
              >
                <AppIcon name="sort" aria-hidden="true" focusable="false" />
                {t("pages.tasklist.sort")}
              </button>
              <button
                type="button"
                disabled={deleteCompletedPending || completedTaskCount === 0}
                onClick={async () => {
                  if (
                    completedTaskCount === 0 ||
                    !window.confirm(
                      t("pages.tasklist.deleteCompletedConfirm", {
                        count: completedTaskCount,
                      }),
                    )
                  ) {
                    return;
                  }
                  setDeleteCompletedPending(true);
                  try {
                    await deleteCompletedTasks(taskList.id);
                    logTaskDeleteCompleted({ count: completedTaskCount });
                  } catch (error) {
                    setTaskError(resolveErrorMessage(error, t, "common.error"));
                  } finally {
                    setDeleteCompletedPending(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:cursor-not-allowed disabled:opacity-60 dark:text-text-dark dark:focus-visible:outline-error-dark"
              >
                {deleteCompletedPending
                  ? t("common.deleting")
                  : t("pages.tasklist.deleteCompleted")}
                <span className="pr-1">
                  <AppIcon name="delete" aria-hidden="true" focusable="false" />
                </span>
              </button>
            </div>
          </div>
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={(event: DragStartEvent) => {
              if (typeof event.active.id === "string") {
                onSortingChange?.(true);
              }
            }}
            onDragEnd={async (event: DragEndEvent) => {
              onSortingChange?.(false);
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const draggedTaskId =
                typeof active.id === "string" ? active.id : null;
              const targetTaskId = typeof over.id === "string" ? over.id : null;
              if (!draggedTaskId || !targetTaskId) return;
              setTaskError(null);
              try {
                await reorderTask(draggedTaskId, targetTaskId);
                logTaskReorder();
              } catch (error) {
                setTaskError(resolveErrorMessage(error, t, "common.error"));
              }
            }}
            onDragCancel={() => onSortingChange?.(false)}
          >
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.length === 0 ? (
                <p className="text-muted dark:text-muted-dark">
                  {t("pages.tasklist.noTasks")}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isEditing={editingTaskId === task.id}
                      editingText={editingTaskText}
                      onEditingTextChange={setEditingTaskText}
                      onEditStart={(task) => {
                        setEditingTaskId(task.id);
                        setEditingTaskText(task.text);
                      }}
                      onEditEnd={(task, text) => {
                        if (editingTaskIdRef.current !== task.id) return;
                        const currentText = text ?? editingTaskText;
                        const trimmedText = currentText.trim();
                        if (trimmedText === "" || trimmedText === task.text) {
                          setEditingTaskId(null);
                          return;
                        }
                        setTaskError(null);
                        void updateTask(taskList.id, task.id, {
                          text: currentText,
                        })
                          .then(() => {
                            setEditingTaskId(null);
                            logTaskUpdate({ fields: "text,date" });
                          })
                          .catch((error) =>
                            setTaskError(
                              resolveErrorMessage(error, t, "common.error"),
                            ),
                          );
                      }}
                      onDragInteractionChange={(active) => {
                        if (!isActive) {
                          onDragInteractionChange?.(false);
                          return;
                        }
                        onDragInteractionChange?.(active);
                      }}
                      onToggle={(task) => {
                        setTaskError(null);
                        void updateTask(taskList.id, task.id, {
                          completed: !task.completed,
                        })
                          .then(() => logTaskUpdate({ fields: "completed" }))
                          .catch((error) =>
                            setTaskError(
                              resolveErrorMessage(error, t, "common.error"),
                            ),
                          );
                      }}
                      onDateChange={(taskId, date) => {
                        setTaskError(null);
                        void updateTask(taskList.id, taskId, { date })
                          .then(() => logTaskUpdate({ fields: "date" }))
                          .catch((error) =>
                            setTaskError(
                              resolveErrorMessage(error, t, "common.error"),
                            ),
                          );
                      }}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </section>
  );
}

const toAppUrl = (route: KnownAppHashRoute): string => {
  if (typeof window === "undefined") return "/app/";
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  return route.view === "detail"
    ? `${baseUrl}#${TASK_LISTS_ROUTE}/${encodeURIComponent(route.taskListId)}`
    : `${baseUrl}#${route.view === "settings" ? SETTINGS_ROUTE : TASK_LISTS_ROUTE}`;
};

const buildAppHistoryState = (
  route: KnownAppHashRoute,
  currentState: unknown,
): Record<string, unknown> => ({
  ...(currentState && typeof currentState === "object"
    ? (currentState as Record<string, unknown>)
    : {}),
  lightlistMobileStackInitialized: true,
  lightlistAppView: route.view,
  lightlistTaskListId: route.view === "detail" ? route.taskListId : null,
});

type SortableTaskListItemProps = {
  taskList: TaskList;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
  taskCountLabel: string;
  isActive: boolean;
};

function SortableTaskListItem({
  taskList,
  onSelect,
  dragHintLabel,
  taskCountLabel,
  isActive,
}: SortableTaskListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskList.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={clsx(
        "flex items-center gap-2 rounded-[10px] p-2",
        isActive ? "bg-background dark:bg-surface-dark" : "bg-transparent",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="flex touch-none items-center rounded-lg p-1 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
      >
        <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
      </button>

      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-border dark:border-border-dark"
        style={{
          backgroundColor: resolveTaskListBackground(taskList.background),
        }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="flex flex-1 flex-col items-start gap-0.5 text-start"
      >
        <span className={clsx(isActive ? "font-bold" : "font-medium")}>
          {taskList.name}
        </span>
        <span className="text-xs text-muted dark:text-muted-dark">
          {taskCountLabel}
        </span>
      </button>
    </div>
  );
}

type CalendarTaskItemProps = {
  task: DatedTask;
  onOpenTaskList: (taskListId: string) => void;
  onSelectDate: (date: Date) => void;
  itemRef: (element: HTMLDivElement | null) => void;
  isHighlighted: boolean;
};

function CalendarTaskItem({
  task,
  onOpenTaskList,
  onSelectDate,
  itemRef,
  isHighlighted,
}: CalendarTaskItemProps) {
  const dateDisplayValue = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(task.dateValue);

  return (
    <div
      ref={itemRef}
      className={clsx(
        "flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0 dark:border-border-dark",
        isHighlighted && "bg-background dark:bg-surface-dark",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(task.dateValue)}
            className="shrink-0 rounded-md text-xs text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:focus-visible:outline-muted-dark"
          >
            {dateDisplayValue}
          </button>
          <button
            type="button"
            onClick={() => onOpenTaskList(task.taskListId)}
            className="inline-flex min-w-0 items-center justify-end gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rounded-full border border-border dark:border-border-dark"
              style={{ backgroundColor: task.taskListBackground }}
            />
            <span className="truncate text-xs font-medium text-text dark:text-text-dark">
              {task.taskListName}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelectDate(task.dateValue)}
          className="truncate rounded-md text-start font-medium leading-6 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-text-dark dark:focus-visible:outline-muted-dark"
        >
          {task.task.text}
        </button>
      </div>
    </div>
  );
}

type CalendarSheetProps = {
  isWideLayout: boolean;
  taskLists: TaskList[];
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
};

function CalendarSheet({
  isWideLayout,
  taskLists,
  onSelectTaskList,
  onCloseDrawer,
}: CalendarSheetProps) {
  const { t, i18n } = useTranslation();
  const calendarSheetStateKey = "calendar-sheet-open";
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >(undefined);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => new Date());
  const [calendarError] = useState<string | null>(null);
  const datedTaskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const datedTasks = useMemo<DatedTask[]>(() => {
    const flattened: DatedTask[] = [];
    for (const taskList of taskLists) {
      for (const task of taskList.tasks) {
        if (task.completed) continue;
        const parsedDate = parseTaskDate(task.date);
        if (!parsedDate) continue;
        flattened.push({
          taskListId: taskList.id,
          taskListName: taskList.name,
          taskListBackground: resolveTaskListBackground(taskList.background),
          task,
          dateValue: parsedDate,
          dateKey: formatTaskDate(parsedDate),
        });
      }
    }
    flattened.sort((left, right) => {
      const byDate = left.dateValue.getTime() - right.dateValue.getTime();
      if (byDate !== 0) return byDate;
      const byTaskText = left.task.text.localeCompare(right.task.text);
      if (byTaskText !== 0) return byTaskText;
      return left.taskListName.localeCompare(right.taskListName);
    });
    return flattened;
  }, [taskLists]);

  const datedTasksByMonth = useMemo<Record<string, DatedTask[]>>(() => {
    const map: Record<string, DatedTask[]> = {};
    for (const task of datedTasks) {
      const monthKey = formatMonthKey(task.dateValue);
      if (!map[monthKey]) {
        map[monthKey] = [];
      }
      map[monthKey].push(task);
    }
    return map;
  }, [datedTasks]);

  const monthTaskDates = useMemo<Record<string, Date[]>>(() => {
    const map: Record<string, Date[]> = {};
    for (const [monthKey, tasks] of Object.entries(datedTasksByMonth)) {
      const dateSet = new Set(tasks.map((task) => task.dateKey));
      map[monthKey] = Array.from(dateSet)
        .map((dateKey) => createDateFromKey(dateKey))
        .filter((date): date is Date => Boolean(date));
    }
    return map;
  }, [datedTasksByMonth]);

  const monthDateDotColors = useMemo<
    Record<string, Record<string, string[]>>
  >(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const [monthKey, tasks] of Object.entries(datedTasksByMonth)) {
      const monthDotColors: Record<string, string[]> = {};
      for (const task of tasks) {
        if (!monthDotColors[task.dateKey]) {
          monthDotColors[task.dateKey] = [];
        }
        if (!monthDotColors[task.dateKey].includes(task.taskListBackground)) {
          if (monthDotColors[task.dateKey].length < 3) {
            monthDotColors[task.dateKey].push(task.taskListBackground);
          }
        }
      }
      map[monthKey] = monthDotColors;
    }
    return map;
  }, [datedTasksByMonth]);

  useEffect(() => {
    if (typeof window === "undefined" || !calendarSheetOpen) return;

    const currentState = window.history.state;
    if (currentState?.calendarSheet !== calendarSheetStateKey) {
      window.history.pushState(
        { ...currentState, calendarSheet: calendarSheetStateKey },
        "",
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.calendarSheet === calendarSheetStateKey) return;
      setCalendarSheetOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [calendarSheetOpen, calendarSheetStateKey]);

  const selectedCalendarDateKey = useMemo(
    () => (selectedCalendarDate ? formatTaskDate(selectedCalendarDate) : null),
    [selectedCalendarDate],
  );

  const handleSelectCalendarDate = (
    next: Date | undefined,
    tasksInMonth: DatedTask[],
  ) => {
    setSelectedCalendarDate(next);
    if (!next) return;
    const dateKey = formatTaskDate(next);
    const targetTask = tasksInMonth.find((task) => task.dateKey === dateKey);
    if (!targetTask) return;
    const targetElement = datedTaskRefs.current[getDatedTaskId(targetTask)];
    if (!targetElement) return;

    requestAnimationFrame(() => {
      const container = targetElement.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const top =
        targetRect.top -
        containerRect.top -
        container.clientHeight / 2 +
        targetElement.clientHeight / 2;

      container.scrollTo({
        top: container.scrollTop + top,
        behavior: "smooth",
      });
    });
  };

  const handleCalendarSheetOpenChange = (open: boolean) => {
    if (open) {
      setCalendarSheetOpen(true);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.history.state?.calendarSheet === calendarSheetStateKey
    ) {
      window.history.back();
      return;
    }

    setCalendarSheetOpen(false);
  };

  const handleOpenTaskListFromCalendar = (taskListId: string) => {
    onSelectTaskList(taskListId);

    if (!isWideLayout) {
      if (
        typeof window !== "undefined" &&
        window.history.state?.calendarSheet === calendarSheetStateKey &&
        window.history.state?.drawer === "drawer-open"
      ) {
        window.history.go(-2);
        return;
      }

      handleCalendarSheetOpenChange(false);
      onCloseDrawer();
      return;
    }

    handleCalendarSheetOpenChange(false);
  };

  const displayedMonthKey = formatMonthKey(displayedMonth);
  const visibleDatedTasks = datedTasksByMonth[displayedMonthKey] ?? [];
  const calendarTaskDates = monthTaskDates[displayedMonthKey] ?? [];
  const dateDotColors = monthDateDotColors[displayedMonthKey] ?? {};

  return (
    <Drawer
      direction="bottom"
      open={calendarSheetOpen}
      onOpenChange={handleCalendarSheetOpenChange}
    >
      <DrawerTrigger asChild>
        <button
          type="button"
          data-vaul-no-drag
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark"
        >
          <AppIcon
            name="calendar-today"
            aria-hidden="true"
            focusable="false"
            className="h-5 w-5"
          />
          <span>{t("app.calendarCheckButton")}</span>
        </button>
      </DrawerTrigger>
      <DrawerContent
        overlayClassName="z-1400"
        className="inset-x-0 bottom-0 left-0 right-0 top-auto z-1500 h-[min(94vh,920px)] max-w-none overflow-hidden rounded-t-2xl"
      >
        <div className="flex h-full min-h-0 flex-col">
          {calendarError ? (
            <Alert variant="error">{calendarError}</Alert>
          ) : null}
          {datedTasks.length > 0 ? (
            <div
              className={clsx(
                "min-h-0 flex-1 overflow-y-auto pb-12",
                isWideLayout
                  ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
                  : "flex flex-col gap-3",
              )}
            >
              <div
                data-vaul-no-drag
                className={clsx(
                  "w-full",
                  isWideLayout && "sticky top-0 self-start",
                )}
              >
                <Calendar
                  className="w-full"
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={(next) =>
                    handleSelectCalendarDate(next, visibleDatedTasks)
                  }
                  month={displayedMonth}
                  onMonthChange={(newMonth) => {
                    setDisplayedMonth(newMonth);
                    setSelectedCalendarDate(undefined);
                  }}
                  modifiers={{ hasTask: calendarTaskDates }}
                  components={{
                    DayButton: (props) => {
                      const dateKey = formatTaskDate(props.day.date);
                      const colors = dateDotColors[dateKey] ?? [];
                      return (
                        <DayPickerDayButton {...props}>
                          <span className="relative flex h-full w-full items-center justify-center">
                            <span className={clsx(colors.length > 0 && "pb-2")}>
                              {props.day.date.getDate()}
                            </span>
                            {colors.length > 0 ? (
                              <span className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                                {colors.map((color, index) => (
                                  <span
                                    key={`${dateKey}-${color}-${index}`}
                                    className="h-1.5 w-1.5 rounded-full border border-primary dark:border-primary-dark"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </DayPickerDayButton>
                      );
                    },
                  }}
                />
              </div>
              <div
                data-vaul-no-drag
                className={clsx(
                  "min-h-0 overflow-y-auto rounded-xl border border-border dark:border-border-dark",
                  isWideLayout ? "h-full" : "flex-1",
                )}
              >
                {visibleDatedTasks.length > 0 ? (
                  visibleDatedTasks.map((task) => {
                    const taskId = getDatedTaskId(task);
                    return (
                      <CalendarTaskItem
                        key={taskId}
                        task={task}
                        onOpenTaskList={handleOpenTaskListFromCalendar}
                        onSelectDate={(date) =>
                          handleSelectCalendarDate(date, visibleDatedTasks)
                        }
                        isHighlighted={selectedCalendarDateKey === task.dateKey}
                        itemRef={(element) => {
                          datedTaskRefs.current[taskId] = element;
                        }}
                      />
                    );
                  })
                ) : (
                  <p className="p-4 text-sm text-muted dark:text-muted-dark">
                    {t("app.calendarNoDatedTasks")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted dark:text-muted-dark">
              {t("app.calendarNoDatedTasks")}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type DrawerPanelProps = {
  isWideLayout: boolean;
  userEmail: string;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  sensorsList: SensorDescriptor<SensorOptions>[];
  onReorderTaskList: (
    draggedId: string,
    targetId: string,
  ) => void | Promise<void>;
  selectedTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  onCreateList: (name: string, background: string | null) => Promise<string>;
  onJoinList: (code: string) => Promise<void>;
};

function DrawerPanel({
  isWideLayout,
  userEmail,
  hasTaskLists,
  taskLists,
  sensorsList,
  onReorderTaskList,
  selectedTaskListId,
  onSelectTaskList,
  onCloseDrawer,
  onOpenSettings,
  onCreateList,
  onJoinList,
}: DrawerPanelProps) {
  const { t } = useTranslation();
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [createListInput, setCreateListInput] = useState("");
  const [createListBackground, setCreateListBackground] = useState<
    string | null
  >(COLORS[0].value);
  const [showJoinListDialog, setShowJoinListDialog] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [joiningList, setJoiningList] = useState(false);
  const [joinListError, setJoinListError] = useState<string | null>(null);
  const dialogPrimaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primaryText shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";
  const dialogSecondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark";

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const draggedId = getStringId(active.id);
    const targetId = getStringId(over.id);
    if (draggedId && targetId) {
      await onReorderTaskList(draggedId, targetId);
    }
  };

  const handleCreateList = async () => {
    const name = createListInput.trim();
    if (!name) return;
    await onCreateList(name, createListBackground);
    setCreateListInput("");
    setCreateListBackground(COLORS[0].value);
    setShowCreateListDialog(false);
  };

  const handleJoinList = async () => {
    const code = joinListInput.trim();
    if (!code) return;
    setJoiningList(true);
    setJoinListError(null);
    try {
      await onJoinList(code);
      setJoinListInput("");
      setJoinListError(null);
      setShowJoinListDialog(false);
    } catch (err) {
      setJoinListError(
        err instanceof Error ? err.message : t("pages.sharecode.error"),
      );
    } finally {
      setJoiningList(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <DrawerHeader>
        <h2 id="drawer-task-lists-title" className="sr-only">
          {t("app.drawerTitle")}
        </h2>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p
              id="drawer-task-lists-description"
              className="m-0 min-w-0 flex-1 truncate text-sm text-muted dark:text-muted-dark"
            >
              {userEmail}
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              title={t("settings.title")}
              aria-label={t("settings.title")}
              data-vaul-no-drag
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:text-muted-dark dark:hover:bg-surface-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark"
            >
              <AppIcon name="settings" aria-hidden="true" focusable="false" />
            </button>
          </div>
        </div>
      </DrawerHeader>

      <CalendarSheet
        isWideLayout={isWideLayout}
        taskLists={taskLists}
        onSelectTaskList={onSelectTaskList}
        onCloseDrawer={onCloseDrawer}
      />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {hasTaskLists ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={taskLists.map((taskList) => taskList.id)}>
              {taskLists.map((taskList) => (
                <SortableTaskListItem
                  key={taskList.id}
                  taskList={taskList}
                  onSelect={(taskListId) => {
                    onSelectTaskList(taskListId);
                    onCloseDrawer();
                  }}
                  dragHintLabel={t("app.dragHint")}
                  taskCountLabel={t("taskList.taskCount", {
                    count: taskList.tasks.length,
                  })}
                  isActive={selectedTaskListId === taskList.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted dark:text-muted-dark">
            {t("app.emptyState")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Dialog
            open={showCreateListDialog}
            onOpenChange={(open: boolean) => {
              setShowCreateListDialog(open);
              if (!open) {
                setCreateListInput("");
                setCreateListBackground(COLORS[0].value);
              }
            }}
          >
            <DialogTrigger asChild>
              <button type="button" className={dialogPrimaryButtonClass}>
                {t("app.createNew")}
              </button>
            </DialogTrigger>
            <DialogContent
              title={t("app.createTaskList")}
              description={t("app.taskListName")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreateList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => setCreateListInput(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <span>{t("taskList.selectColor")}</span>
                    <ColorPicker
                      colors={COLORS}
                      selectedColor={createListBackground}
                      onSelect={setCreateListBackground}
                      ariaLabelPrefix={t("taskList.selectColor")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className={dialogSecondaryButtonClass}
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!createListInput.trim()}
                    className={dialogPrimaryButtonClass}
                  >
                    {t("app.create")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showJoinListDialog}
            onOpenChange={(open: boolean) => {
              setShowJoinListDialog(open);
              if (!open) {
                setJoinListInput("");
                setJoinListError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <button type="button" className={dialogSecondaryButtonClass}>
                {t("app.joinList")}
              </button>
            </DialogTrigger>
            <DialogContent
              title={t("app.joinListTitle")}
              description={t("app.joinListDescription")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleJoinList();
                }}
              >
                <div className="mt-4 flex flex-col gap-3">
                  {joinListError ? (
                    <Alert variant="error">{joinListError}</Alert>
                  ) : null}
                  <label className="flex flex-col gap-1">
                    <span>{t("taskList.shareCode")}</span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => {
                        setJoinListInput(e.target.value);
                        setJoinListError(null);
                      }}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
                    />
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      disabled={joiningList}
                      className={dialogSecondaryButtonClass}
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!joinListInput.trim() || joiningList}
                    className={dialogPrimaryButtonClass}
                  >
                    {joiningList ? t("app.joining") : t("app.join")}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

function AppPage() {
  const { t, i18n } = useTranslation();
  const { authStatus } = useSessionState();
  const user = useUser();
  const {
    hasStartupError,
    taskListOrderStatus,
    taskLists: stateTaskLists,
  } = useTaskListIndexState();
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    stateTaskLists,
    async (draggedId, targetId) => {
      const sourceItems = [...stateTaskLists];
      const oldIndex = sourceItems.findIndex(
        (taskList) => taskList.id === draggedId,
      );
      const newIndex = sourceItems.findIndex(
        (taskList) => taskList.id === targetId,
      );
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      const [draggedTaskList] = sourceItems.splice(oldIndex, 1);
      sourceItems.splice(newIndex, 0, draggedTaskList);
      await updateTaskListOrder(
        sourceItems.map((taskList, index) => ({
          taskListId: taskList.id,
          order: index + 1,
        })),
      );
    },
  );
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isTaskSorting, setIsTaskSorting] = useState(false);
  const [isTaskDragInteracting, setIsTaskDragInteracting] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("detail");
  const [isViewAnimationReady, setIsViewAnimationReady] = useState(false);
  const [pendingInitialTaskListRoute, setPendingInitialTaskListRoute] =
    useState(false);

  const sensorsList = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      window.location.replace("/");
    }
  }, [authStatus]);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncView = () => {
      const route = parseAppHashRoute(window.location.hash);
      if (route.view === "unknown") {
        return;
      }

      setCurrentView(route.view);
      if (route.view === "detail") {
        setSelectedTaskListId(route.taskListId);
      }
    };

    syncView();
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsViewAnimationReady(true);
    });
    window.addEventListener("hashchange", syncView);
    window.addEventListener("popstate", syncView);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("hashchange", syncView);
      window.removeEventListener("popstate", syncView);
    };
  }, []);

  useEffect(() => {
    if (taskLists.length > 0 && !selectedTaskListId) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [selectedTaskListId, taskLists]);

  useEffect(() => {
    const updateLayout = () => {
      setIsWideLayout(window.innerWidth >= 1024);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || authStatus !== "authenticated") {
      return;
    }

    const currentState =
      window.history.state && typeof window.history.state === "object"
        ? (window.history.state as Record<string, unknown>)
        : null;
    if (currentState?.lightlistMobileStackInitialized === true) {
      return;
    }

    const routeFromLocation = parseAppHashRoute(window.location.hash);

    if (routeFromLocation.view === "taskLists") {
      window.history.replaceState(
        buildAppHistoryState({ view: "taskLists" }, currentState),
        "",
        toAppUrl({ view: "taskLists" }),
      );
      setCurrentView("taskLists");
      setPendingInitialTaskListRoute(false);
      return;
    }

    if (routeFromLocation.view === "settings") {
      window.history.replaceState(
        buildAppHistoryState({ view: "taskLists" }, currentState),
        "",
        toAppUrl({ view: "taskLists" }),
      );
      window.history.pushState(
        buildAppHistoryState({ view: "settings" }, currentState),
        "",
        toAppUrl({ view: "settings" }),
      );
      setCurrentView("settings");
      setPendingInitialTaskListRoute(false);
      return;
    }

    if (routeFromLocation.view === "detail") {
      window.history.replaceState(
        buildAppHistoryState({ view: "taskLists" }, currentState),
        "",
        toAppUrl({ view: "taskLists" }),
      );
      window.history.pushState(
        buildAppHistoryState(routeFromLocation, currentState),
        "",
        toAppUrl(routeFromLocation),
      );
      setCurrentView("detail");
      setSelectedTaskListId(routeFromLocation.taskListId);
      setPendingInitialTaskListRoute(false);
      return;
    }

    window.history.replaceState(
      buildAppHistoryState({ view: "taskLists" }, currentState),
      "",
      toAppUrl({ view: "taskLists" }),
    );
    setCurrentView("taskLists");
    setPendingInitialTaskListRoute(true);
  }, [authStatus]);

  const isAuthLoading = authStatus === "loading";
  const isTaskListsHydrating = taskListOrderStatus !== "ready";
  const hasResolvedTaskLists = taskListOrderStatus === "ready";
  const hasTaskLists = taskLists.length > 0;
  const selectedTaskList = taskLists.find(
    (taskList) => taskList.id === selectedTaskListId,
  );
  const firstTaskListId = taskLists[0]?.id ?? null;
  const userEmail = user?.email || t("app.drawerNoEmail");
  const selectedTaskListIndex = Math.max(
    0,
    taskLists.findIndex((taskList) => taskList.id === selectedTaskListId),
  );
  const carouselDirection = getLanguageDirection(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const isRtl = carouselDirection === "rtl";
  const taskListsPanelSkeleton = (
    <div className="flex flex-col gap-3 p-2">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-border dark:bg-border-dark" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-border dark:bg-border-dark" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-border dark:bg-border-dark" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-border dark:bg-border-dark" />
    </div>
  );

  const setViewState = (route: KnownAppHashRoute, mode: "push" | "replace") => {
    setCurrentView(route.view);
    if (route.view === "detail") {
      setSelectedTaskListId(route.taskListId);
    }
    setPendingInitialTaskListRoute(false);

    if (typeof window === "undefined") {
      return;
    }

    const nextState = buildAppHistoryState(route, window.history.state);
    if (mode === "push") {
      window.history.pushState(nextState, "", toAppUrl(route));
      return;
    }

    window.history.replaceState(nextState, "", toAppUrl(route));
  };
  const showTaskListsRoot = () =>
    setViewState({ view: "taskLists" }, "replace");
  const openTaskList = (
    taskListId: string,
    mode: "push" | "replace" = "replace",
  ) =>
    setViewState(
      { view: "detail", taskListId },
      isWideLayout ? "replace" : mode,
    );
  const openSettings = (mode: "push" | "replace" = "replace") =>
    setViewState({ view: "settings" }, isWideLayout ? "replace" : mode);

  const handleBackToTaskLists = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      (currentView === "detail" || currentView === "settings")
    ) {
      window.history.back();
      return;
    }

    showTaskListsRoot();
  };

  useEffect(() => {
    if (!pendingInitialTaskListRoute || !hasResolvedTaskLists) return;

    if (!hasTaskLists || !firstTaskListId) {
      setPendingInitialTaskListRoute(false);
      showTaskListsRoot();
      return;
    }

    openTaskList(selectedTaskListId ?? firstTaskListId, "push");
  }, [
    firstTaskListId,
    hasResolvedTaskLists,
    hasTaskLists,
    isWideLayout,
    pendingInitialTaskListRoute,
    selectedTaskListId,
  ]);

  useEffect(() => {
    if (!hasResolvedTaskLists || currentView !== "detail" || selectedTaskList) {
      return;
    }

    if (!hasTaskLists || !firstTaskListId) {
      showTaskListsRoot();
      return;
    }

    openTaskList(firstTaskListId);
  }, [
    currentView,
    firstTaskListId,
    hasResolvedTaskLists,
    hasTaskLists,
    selectedTaskList,
  ]);

  const drawerPanel = (
    <DrawerPanel
      isWideLayout={isWideLayout}
      userEmail={userEmail}
      hasTaskLists={!isTaskListsHydrating && hasTaskLists}
      taskLists={taskLists}
      sensorsList={sensorsList}
      onReorderTaskList={async (draggedTaskListId, targetTaskListId) => {
        setError(null);
        try {
          await reorderTaskList(draggedTaskListId, targetTaskListId);
          logTaskListReorder();
        } catch (err) {
          setError(resolveErrorMessage(err, t, "common.error"));
        }
      }}
      selectedTaskListId={selectedTaskListId}
      onSelectTaskList={(taskListId) => openTaskList(taskListId, "push")}
      onCloseDrawer={() => {}}
      onOpenSettings={() => openSettings("push")}
      onCreateList={async (name, background) => {
        setError(null);
        const newTaskListId = await createTaskList(name, background);
        openTaskList(newTaskListId, "push");
        logTaskListCreate();
        return newTaskListId;
      }}
      onJoinList={async (code) => {
        setError(null);
        const normalizedCode = code.trim().toUpperCase();
        const taskListId = await fetchTaskListIdByShareCode(normalizedCode);
        if (!taskListId) {
          throw new Error(t("pages.sharecode.notFound"));
        }

        if (stateTaskLists.some((taskList) => taskList.id === taskListId)) {
          openTaskList(taskListId, "push");
          return;
        }

        await addSharedTaskListToOrder(taskListId);
        openTaskList(taskListId, "push");
        logShareCodeJoin();
      }}
    />
  );

  const mobileSlideTransitionClass = isViewAnimationReady
    ? "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0"
    : "transition-none";
  const compactForwardTransform = isRtl
    ? "translateX(-100%)"
    : "translateX(100%)";
  const compactBackTransform = isRtl ? "translateX(100%)" : "translateX(-100%)";
  const getCompactPanelTransform = (view: AppView) => {
    if (currentView === view) {
      return "translateX(0%)";
    }

    if (view === "taskLists") {
      return compactBackTransform;
    }

    return compactForwardTransform;
  };
  const renderDetailSkeleton = (taskRowCount: number) => (
    <div className="flex h-full flex-col gap-4 p-4 pt-24">
      <div className="h-6 w-40 animate-pulse rounded bg-border dark:bg-border-dark" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: taskRowCount }, (_, index) => (
          <div
            key={index}
            className={clsx(
              "h-10 animate-pulse rounded-lg bg-border dark:bg-border-dark",
              index === taskRowCount - 1 && taskRowCount > 3
                ? "w-3/4"
                : "w-full",
            )}
          />
        ))}
      </div>
    </div>
  );
  const renderCompactPanel = (
    view: AppView,
    content: ReactNode,
    className?: string,
  ) => (
    <div
      aria-hidden={currentView !== view}
      className={clsx(
        "absolute inset-0 h-full overflow-hidden will-change-transform",
        mobileSlideTransitionClass,
        currentView === view ? "z-20" : "pointer-events-none z-10",
        className,
      )}
      style={{ transform: getCompactPanelTransform(view) }}
    >
      {content}
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-hidden">
      {isAuthLoading ? (
        renderDetailSkeleton(4)
      ) : hasStartupError ? (
        <div className="flex h-full items-center justify-center p-4">
          <Alert variant="error">{t("app.error")}</Alert>
        </div>
      ) : isTaskListsHydrating ? (
        renderDetailSkeleton(3)
      ) : hasTaskLists ? (
        <Carousel
          className="h-full"
          index={selectedTaskListIndex}
          direction={carouselDirection}
          scrollEnabled={!isTaskSorting && !isTaskDragInteracting}
          onIndexChange={(index) => {
            const taskList = taskLists[index];
            if (taskList) {
              openTaskList(taskList.id);
            }
          }}
          showIndicators={true}
          indicatorPosition="top"
          ariaLabel={t("app.taskListLocator.label")}
          getIndicatorLabel={(index, total) =>
            t("app.taskListLocator.goTo", {
              index: index + 1,
              total,
            })
          }
        >
          {taskLists.map((taskList) => (
            <div
              key={taskList.id}
              className="flex h-full w-full flex-col"
              style={{
                backgroundColor: resolveTaskListBackground(taskList.background),
              }}
            >
              <div className="h-[88px]" />
              <div
                className={clsx(
                  "h-full overflow-y-auto",
                  isWideLayout && "mx-auto max-w-3xl min-w-[480px]",
                )}
              >
                <TaskListCard
                  taskList={taskList}
                  isActive={selectedTaskListId === taskList.id}
                  onActivate={openTaskList}
                  sensorsList={sensorsList}
                  onSortingChange={setIsTaskSorting}
                  onDragInteractionChange={setIsTaskDragInteracting}
                  onDeleted={() => {
                    const remainingLists = stateTaskLists.filter(
                      (currentTaskList) =>
                        currentTaskList.id !== selectedTaskListId,
                    );
                    const nextTaskListId = remainingLists[0]?.id ?? null;
                    if (nextTaskListId) {
                      openTaskList(nextTaskListId);
                      return;
                    }

                    setSelectedTaskListId(null);
                    showTaskListsRoot();
                  }}
                />
              </div>
            </div>
          ))}
        </Carousel>
      ) : (
        <div className="flex h-full items-center justify-center p-4">
          <p className="text-muted dark:text-muted-dark">
            {t("app.emptyState")}
          </p>
        </div>
      )}
    </div>
  );

  const taskListsRootContent = (
    <div className="h-full overflow-y-auto bg-surface p-4 dark:bg-surface-dark">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {isAuthLoading ? taskListsPanelSkeleton : drawerPanel}
    </div>
  );

  if (authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  return (
    <div className="h-full min-h-full w-full overflow-hidden text-text dark:text-text-dark">
      <div
        className={clsx(
          "flex h-full",
          isWideLayout
            ? isRtl
              ? "flex-row-reverse items-start"
              : "flex-row items-start"
            : "flex-col",
        )}
      >
        {isWideLayout ? (
          <aside
            className={clsx(
              "sticky top-0 w-[360px] max-w-[420px] shrink-0 self-stretch border-border",
              isRtl ? "border-l" : "border-r",
            )}
          >
            <div className="flex h-full flex-col overflow-y-auto bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
              {isAuthLoading ? taskListsPanelSkeleton : drawerPanel}
            </div>
          </aside>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
        >
          {isWideLayout ? (
            <div className="h-full overflow-hidden">
              {currentView === "settings" ? (
                <div className="h-full overflow-y-auto">
                  <SettingsView showBackButton={false} />
                </div>
              ) : (
                detailContent
              )}
            </div>
          ) : (
            <div className="relative h-full overflow-hidden">
              {renderCompactPanel("taskLists", taskListsRootContent)}
              {renderCompactPanel(
                "detail",
                <>
                  <div className="absolute z-20 w-full">
                    <AppHeader
                      backLabel={t("common.back")}
                      onBack={handleBackToTaskLists}
                    />
                  </div>
                  {detailContent}
                </>,
              )}
              {renderCompactPanel(
                "settings",
                <div className="h-full overflow-y-auto">
                  <SettingsView
                    onBack={handleBackToTaskLists}
                    showBackButton={true}
                  />
                </div>,
                "bg-background dark:bg-background-dark",
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// pages/index.tsx
const OG_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  ja: "ja_JP",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  fr: "fr_FR",
  ko: "ko_KR",
  "zh-CN": "zh_CN",
  hi: "hi_IN",
  ar: "ar_AR",
  "pt-BR": "pt_BR",
  id: "id_ID",
};

const setHeadValue = (
  selector: string,
  attribute: "content" | "href",
  value: string,
) => {
  const element = document.querySelector(selector);
  if (
    element instanceof HTMLMetaElement ||
    element instanceof HTMLLinkElement
  ) {
    element.setAttribute(attribute, value);
  }
};

function IndexPage() {
  const { t } = useTranslation();
  const currentLang = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const pageUrl =
    currentLang === "ja" ? `${origin}/` : `${origin}/?lang=${currentLang}`;
  const pageTitle = t("pages.index.seo.title");
  const pageDescription = t("pages.index.seo.description");

  useEffect(() => {
    const queryLang = new URLSearchParams(window.location.search).get("lang");
    if (!queryLang) return;
    const normalizedLanguage = normalizeLanguage(queryLang);
    if (i18n.language !== normalizedLanguage) {
      void i18n.changeLanguage(normalizedLanguage);
    }
  }, []);

  useEffect(() => {
    document.title = pageTitle;
    setHeadValue('meta[name="description"]', "content", pageDescription);
    setHeadValue(
      'meta[name="keywords"]',
      "content",
      t("pages.index.seo.keywords"),
    );
    setHeadValue('link[rel="canonical"]', "href", pageUrl);
    setHeadValue('meta[property="og:title"]', "content", pageTitle);
    setHeadValue('meta[property="og:description"]', "content", pageDescription);
    setHeadValue('meta[property="og:url"]', "content", pageUrl);
    setHeadValue(
      'meta[property="og:locale"]',
      "content",
      OG_LOCALE_BY_LANGUAGE[currentLang],
    );
    setHeadValue(
      'meta[property="og:image:alt"]',
      "content",
      t("pages.index.preview.desktopAlt"),
    );
    setHeadValue('meta[name="twitter:title"]', "content", pageTitle);
    setHeadValue(
      'meta[name="twitter:description"]',
      "content",
      pageDescription,
    );
  }, [currentLang, pageDescription, pageTitle, pageUrl, t]);

  const handleLangChange = (newLang: Language) => {
    if (i18n.language !== newLang) {
      void i18n.changeLanguage(newLang);
    }
    const url = new URL(window.location.href);
    if (newLang === "ja") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", newLang);
    }
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const features = [
    {
      key: "simple",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-[#4d4d4d] dark:text-[#d7d7d7]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      key: "multidevice",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-[#4d4d4d] dark:text-[#d7d7d7]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3"
          />
        </svg>
      ),
    },
    {
      key: "share",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-[#4d4d4d] dark:text-[#d7d7d7]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
          />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="min-h-screen bg-white text-text dark:bg-[#111111] dark:text-text-dark">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/92 backdrop-blur dark:border-white/10 dark:bg-[#111111]/92">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/brand/logo.svg"
              alt=""
              aria-hidden="true"
              className="block h-9 w-auto sm:h-12"
            />
            <p className="text-base font-semibold tracking-[0.16em] text-[#1a1a1a] dark:text-[#f2f2f2] sm:text-lg sm:tracking-[0.18em]">
              Lightlist
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="sr-only">Language</span>
              <select
                value={currentLang}
                onChange={(event) =>
                  handleLangChange(normalizeLanguage(event.target.value))
                }
                className="max-w-[calc(100vw-8.5rem)] rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-text outline-none transition focus:border-[#666666] dark:border-white/10 dark:bg-[#171717] dark:text-text-dark dark:focus:border-white/30 sm:max-w-none sm:px-4 sm:py-2"
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {LANGUAGE_DISPLAY_NAMES[language]}
                  </option>
                ))}
              </select>
            </label>
            <a
              href="/login/"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#171717] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2d2d2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] dark:bg-[#f2f2f2] dark:text-[#111111] dark:hover:bg-[#dedede] dark:focus-visible:outline-[#f2f2f2] sm:px-5 sm:py-2"
            >
              Login
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section
          aria-labelledby="landing-hero-title"
          className="px-6 pb-20 pt-6 sm:pb-24 sm:pt-10"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <h1
                id="landing-hero-title"
                className="whitespace-pre-line text-[2.6rem] font-semibold tracking-[-0.05em] text-[#121212] dark:text-[#f5f5f5] sm:text-6xl lg:text-7xl"
              >
                {t("pages.index.headline")}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-8 text-[#5d5d5d] dark:text-[#c9c9c9] sm:text-xl">
                {t("pages.index.subheadline")}
              </p>
              <div className="mt-10 flex flex-col items-center gap-4">
                <a
                  href="/login/"
                  className="inline-flex items-center justify-center rounded-full bg-[#171717] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#2d2d2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] dark:bg-[#f2f2f2] dark:text-[#111111] dark:hover:bg-[#dedede] dark:focus-visible:outline-[#f2f2f2]"
                >
                  {t("pages.index.getStarted")}
                </a>
              </div>
            </div>

            <div className="mx-auto mt-16 max-w-5xl">
              <div className="relative mx-auto max-w-[920px] pt-8 sm:pt-4">
                <div className="mx-auto w-[88%] overflow-hidden rounded-[30px] border border-black/10 bg-white p-3 shadow-[0_26px_70px_rgba(17,17,17,0.1)] dark:border-white/10 dark:bg-[#171717] dark:shadow-[0_26px_70px_rgba(0,0,0,0.34)] sm:w-[78%] sm:p-4">
                  <div className="overflow-hidden rounded-[24px] border border-black/10 bg-[#fafafa] dark:border-white/10 dark:bg-[#121212]">
                    <img
                      src="/screenshot_ja_desktop.png"
                      alt={t("pages.index.preview.desktopAlt")}
                      width={1280}
                      height={800}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="absolute right-0 top-0 z-20 w-[34%] min-w-[150px] max-w-[220px] sm:right-[8%] sm:top-[8%] sm:w-[24%]">
                  <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white p-2.5 shadow-[0_18px_40px_rgba(17,17,17,0.12)] dark:border-white/10 dark:bg-[#171717] dark:shadow-[0_18px_40px_rgba(0,0,0,0.3)] sm:rounded-[28px] sm:p-3">
                    <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#fafafa] dark:border-white/10 dark:bg-[#121212] sm:rounded-[22px]">
                      <img
                        src="/screenshot_ja_mobile.png"
                        alt={t("pages.index.preview.mobileAlt")}
                        width={720}
                        height={1560}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="landing-features-title"
          className="border-t border-black/10 px-6 py-20 dark:border-white/10 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="landing-features-title"
                className="text-3xl font-semibold tracking-[-0.04em] text-[#151515] dark:text-[#f2f2f2] sm:text-4xl"
              >
                {t("pages.index.features.title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-[#666666] dark:text-[#bbbbbb]">
                {t("pages.index.preview.title")}
              </p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {features.map(({ key, icon }) => (
                <div
                  key={key}
                  className="rounded-[28px] border border-black/10 bg-white p-7 dark:border-white/10 dark:bg-[#171717]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f5] dark:bg-white/5">
                    {icon}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#1c1c1c] dark:text-[#f2f2f2]">
                    {t(`pages.index.features.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#666666] dark:text-[#b8b8b8]">
                    {t(`pages.index.features.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="landing-cta-title"
          className="border-t border-black/10 px-6 py-20 dark:border-white/10 sm:py-24"
        >
          <div className="mx-auto max-w-4xl text-center">
            <img
              src="/brand/logo.svg"
              alt=""
              aria-hidden="true"
              className="mx-auto h-20 w-auto sm:h-24"
            />
            <h2
              id="landing-cta-title"
              className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-[#121212] dark:text-[#f5f5f5] sm:text-5xl"
            >
              {t("pages.index.cta.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#666666] dark:text-[#bbbbbb] sm:text-lg">
              {t("pages.index.cta.description")}
            </p>
            <div className="mt-10">
              <a
                href="/login/"
                className="inline-flex items-center justify-center rounded-full bg-[#171717] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#2d2d2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] dark:bg-[#f2f2f2] dark:text-[#111111] dark:hover:bg-[#dedede] dark:focus-visible:outline-[#f2f2f2]"
              >
                {t("pages.index.cta.button")}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 px-6 py-10 text-center dark:border-white/10">
        <p className="text-sm text-muted dark:text-muted-dark">
          {t("copyright")}
        </p>
      </footer>
    </div>
  );
}

// pages/login.tsx
type AuthTab = "signin" | "signup" | "reset";

type FormInputProps = {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder: string;
};

function FormInput({
  id,
  label,
  type,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-text dark:text-text-dark"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs text-error dark:text-error-dark"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LoginPage() {
  const { t, i18n } = useTranslation();
  const authStatus = useAuthStatus();
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated") {
      window.location.replace("/app/");
    }
  }, [authStatus]);

  const handleAuthAction = async (
    e: React.FormEvent,
    action: () => Promise<void>,
    validationData: Parameters<typeof validateAuthForm>[0],
    setLoadingState: (loading: boolean) => void,
  ) => {
    e.preventDefault();

    const newErrors = validateAuthForm(validationData, t);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoadingState(true);
    setErrors({});

    try {
      await action();
    } catch (error) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setLoadingState(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    handleAuthAction(
      e,
      async () => {
        await signIn(email, password);
        logLogin();
      },
      { email, password },
      setLoading,
    );
  };

  const handleSignUp = (e: React.FormEvent) => {
    const resolvedLanguage = normalizeLanguage(i18n.language);
    handleAuthAction(
      e,
      async () => {
        await signUp(email, password, resolvedLanguage);
        logSignUp();
      },
      { email, password, confirmPassword, requirePasswordConfirm: true },
      setLoading,
    );
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validateAuthForm({ email, password: "" }, t);
    if (newErrors.email) {
      setErrors({ email: newErrors.email });
      return;
    }

    setResetLoading(true);
    setErrors({});

    try {
      await sendPasswordResetEmail(email, normalizeLanguage(i18n.language));
      setResetSent(true);
      logPasswordResetEmailSent();
    } catch (error) {
      setErrors({
        general: resolveErrorMessage(error, t, "auth.error.general"),
      });
    } finally {
      setResetLoading(false);
    }
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setResetSent(false);
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    resetForm();
  };

  const tabButtonClass = (isActive: boolean) =>
    [
      "inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted dark:focus-visible:outline-muted-dark",
      isActive
        ? "bg-surface text-text shadow-sm dark:bg-surface-dark dark:text-text-dark"
        : "text-muted hover:bg-surface/70 dark:text-muted-dark dark:hover:bg-surface-dark/60",
    ].join(" ");

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primaryText shadow-sm transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";

  const secondaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark";
  const selectedLanguage = normalizeLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );

  return (
    <div className="min-h-screen w-full bg-background text-text dark:bg-background-dark dark:text-text-dark">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6"
      >
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
          </div>
          <div className="mb-6 flex justify-end">
            <select
              value={selectedLanguage}
              onChange={(event) =>
                void i18n.changeLanguage(normalizeLanguage(event.target.value))
              }
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-muted dark:border-border-dark dark:bg-background-dark dark:text-text-dark dark:focus:border-muted-dark"
              aria-label="Language"
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_DISPLAY_NAMES[language]}
                </option>
              ))}
            </select>
          </div>

          <div
            className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-background p-1 dark:bg-surface-dark"
            role="tablist"
            aria-label={t("title")}
          >
            <button
              id="auth-tab-signin"
              type="button"
              role="tab"
              aria-selected={activeTab === "signin"}
              aria-controls="auth-panel-signin"
              className={tabButtonClass(activeTab === "signin")}
              onClick={() => handleTabChange("signin")}
            >
              {t("auth.tabs.signin")}
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              role="tab"
              aria-selected={activeTab === "signup"}
              aria-controls="auth-panel-signup"
              className={tabButtonClass(activeTab === "signup")}
              onClick={() => handleTabChange("signup")}
            >
              {t("auth.tabs.signup")}
            </button>
          </div>

          {activeTab === "signin" && (
            <section
              id="auth-panel-signin"
              role="tabpanel"
              aria-labelledby="auth-tab-signin"
              className="space-y-4"
            >
              <form onSubmit={handleSignIn} className="space-y-4">
                <FormInput
                  id="signin-email"
                  label={t("auth.form.email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  disabled={loading}
                  placeholder={t("auth.placeholder.email")}
                />
                <FormInput
                  id="signin-password"
                  label={t("auth.form.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  disabled={loading}
                  placeholder={t("auth.placeholder.password")}
                />
                {errors.general && (
                  <Alert variant="error">{errors.general}</Alert>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading
                    ? t("auth.button.signingIn")
                    : t("auth.button.signin")}
                </button>
              </form>
              <button
                type="button"
                onClick={() => handleTabChange("reset")}
                className={secondaryButtonClass}
              >
                {t("auth.button.forgotPassword")}
              </button>
            </section>
          )}

          {activeTab === "signup" && (
            <section
              id="auth-panel-signup"
              role="tabpanel"
              aria-labelledby="auth-tab-signup"
              className="space-y-4"
            >
              <form onSubmit={handleSignUp} className="space-y-4">
                <FormInput
                  id="signup-email"
                  label={t("auth.form.email")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  disabled={loading}
                  placeholder={t("auth.placeholder.email")}
                />
                <FormInput
                  id="signup-password"
                  label={t("auth.form.password")}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  disabled={loading}
                  placeholder={t("auth.placeholder.password")}
                />
                <FormInput
                  id="signup-confirm"
                  label={t("auth.form.confirmPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  error={errors.confirmPassword}
                  disabled={loading}
                  placeholder={t("auth.placeholder.password")}
                />
                {errors.general && (
                  <Alert variant="error">{errors.general}</Alert>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading
                    ? t("auth.button.signingUp")
                    : t("auth.button.signup")}
                </button>
              </form>
            </section>
          )}

          {activeTab === "reset" && (
            <section className="space-y-4">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetSent ? (
                  <Alert variant="success">
                    {t("auth.passwordReset.success")}
                  </Alert>
                ) : (
                  <>
                    <p className="text-sm text-muted dark:text-muted-dark">
                      {t("auth.passwordReset.instruction")}
                    </p>
                    <FormInput
                      id="reset-email"
                      label={t("auth.form.email")}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      error={errors.email}
                      disabled={resetLoading}
                      placeholder={t("auth.placeholder.email")}
                    />
                    {errors.general && (
                      <Alert variant="error">{errors.general}</Alert>
                    )}
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className={primaryButtonClass}
                    >
                      {resetLoading
                        ? t("auth.button.sending")
                        : t("auth.button.sendResetEmail")}
                    </button>
                  </>
                )}
              </form>
              <button
                type="button"
                onClick={() => handleTabChange("signin")}
                className={secondaryButtonClass}
              >
                {t("auth.button.backToSignIn")}
              </button>
            </section>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted dark:text-muted-dark">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}

// pages/password_reset.tsx
type PasswordResetFormInputProps = {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder: string;
};

function PasswordResetFormInput({
  id,
  label,
  type,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: PasswordResetFormInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-text dark:text-text-dark"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs text-error dark:text-error-dark"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordResetPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primaryText shadow-sm transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:bg-primary-dark dark:text-primaryText-dark dark:focus-visible:outline-muted-dark";

  const secondaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:cursor-not-allowed disabled:opacity-70 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark dark:focus-visible:outline-muted-dark";

  useEffect(() => {
    const oobCode = new URLSearchParams(window.location.search).get("oobCode");

    if (!oobCode) {
      setCodeValid(false);
      return;
    }

    const verifyCode = async () => {
      try {
        await verifyPasswordResetCode(oobCode);
        setCodeValid(true);
      } catch (err) {
        setErrors({
          general: resolveErrorMessage(err, t, "auth.error.general"),
        });
        setCodeValid(false);
      }
    };

    verifyCode();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validatePasswordForm(
      { password, confirmPassword },
      t,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const oobCode = new URLSearchParams(window.location.search).get(
        "oobCode",
      );

      if (!oobCode) {
        throw new Error(t("auth.passwordReset.invalidCode"));
      }

      await confirmPasswordReset(oobCode, password);
      setResetSuccess(true);

      setTimeout(() => {
        window.location.replace("/");
      }, 2000);
    } catch (err) {
      setErrors({
        general: resolveErrorMessage(err, t, "auth.error.general"),
      });
      setLoading(false);
    }
  };

  const content = (() => {
    if (codeValid === false) {
      return (
        <div className="space-y-4">
          <Alert variant="error">
            {errors.general || t("auth.passwordReset.invalidCode")}
          </Alert>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className={secondaryButtonClass}
          >
            {t("auth.button.backToSignIn")}
          </button>
        </div>
      );
    }

    if (resetSuccess) {
      return (
        <div className="space-y-4">
          <Alert variant="success">
            {t("auth.passwordReset.resetSuccess")}
          </Alert>
          <div className="flex justify-center">
            <Spinner />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {errors.general && <Alert variant="error">{errors.general}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordResetFormInput
            id="password"
            label={t("auth.passwordReset.newPassword")}
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={loading}
            placeholder={t("auth.placeholder.password")}
          />

          <PasswordResetFormInput
            id="confirmPassword"
            label={t("auth.passwordReset.confirmNewPassword")}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            disabled={loading}
            placeholder={t("auth.placeholder.password")}
          />

          <button
            type="submit"
            disabled={loading}
            className={primaryButtonClass}
          >
            {loading
              ? t("auth.passwordReset.settingNewPassword")
              : t("auth.passwordReset.setNewPassword")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className={secondaryButtonClass}
        >
          {t("auth.button.backToSignIn")}
        </button>
      </div>
    );
  })();

  return (
    <div className="min-h-screen w-full bg-background text-text dark:bg-background-dark dark:text-text-dark">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6"
      >
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("auth.passwordReset.title")}
            </h1>
          </div>
          {content}
        </div>
        <p className="mt-6 text-center text-xs text-muted dark:text-muted-dark">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}

// pages/sharecodes.tsx
function SharecodesPage() {
  const { t } = useTranslation();
  const user = useUser();
  const [sharecode, setSharecode] = useState<string | null>(null);
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get("code");
    setSharecode(code);
    if (!code) {
      setError(t("pages.sharecode.notFound"));
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!sharecode) return;

    let cancelled = false;

    const loadTaskList = async () => {
      try {
        setLoading(true);
        setError(null);
        const taskListId = await fetchTaskListIdByShareCode(sharecode);
        if (cancelled) return;
        if (!taskListId) {
          setSharedTaskListId(null);
          setError(t("pages.sharecode.notFound"));
          return;
        }

        setSharedTaskListId(taskListId);
        logShare();
      } catch (err) {
        setError(resolveErrorMessage(err, t, "pages.sharecode.error"));
        setSharedTaskListId(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTaskList();
    return () => {
      cancelled = true;
    };
  }, [sharecode, t]);

  const taskList = useTaskList(sharedTaskListId);

  const handleAddToOrder = async () => {
    if (!taskList || !user) return;

    try {
      setAddToOrderLoading(true);
      setAddToOrderError(null);
      await addSharedTaskListToOrder(taskList.id);
      logShareCodeJoin();
      window.location.assign("/app/");
    } catch (err) {
      setAddToOrderError(
        resolveErrorMessage(err, t, "pages.sharecode.addToOrderError"),
      );
    } finally {
      setAddToOrderLoading(false);
    }
  };

  if (loading) return <Spinner fullPage />;

  if (error) {
    return (
      <div className="flex h-full flex-col bg-background dark:bg-background-dark">
        <div className="bg-surface p-4 shadow-sm dark:bg-surface-dark">
          <button
            onClick={() => window.history.back()}
            className="rounded-full p-2 text-muted hover:bg-background dark:text-muted-dark dark:hover:bg-surface-dark"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  if (!loading && sharedTaskListId && !taskList) return <Spinner fullPage />;

  if (!taskList) {
    return (
      <div className="flex h-full flex-col bg-background dark:bg-background-dark">
        <div className="bg-surface p-4 shadow-sm dark:bg-surface-dark">
          <button
            onClick={() => window.history.back()}
            className="rounded-full p-2 text-muted hover:bg-background dark:text-muted-dark dark:hover:bg-surface-dark"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-center text-muted dark:text-muted-dark">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background dark:bg-background-dark">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
        <button
          onClick={() => window.history.back()}
          className="rounded-full p-2 text-muted hover:bg-background dark:text-muted-dark dark:hover:bg-surface-dark"
          aria-label={t("common.back")}
        >
          <AppIcon name="arrow-back" className="h-6 w-6" />
        </button>
        {user && (
          <button
            onClick={handleAddToOrder}
            disabled={addToOrderLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {addToOrderLoading
              ? t("common.loading")
              : t("pages.sharecode.addToOrder")}
          </button>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
        {addToOrderError && (
          <div className="p-4 pb-0">
            <Alert variant="error">{addToOrderError}</Alert>
          </div>
        )}

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
          <section
            className="rounded-2xl border border-border p-4 dark:border-border-dark"
            style={{ backgroundColor: taskList.background ?? undefined }}
          >
            <header className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold text-text dark:text-text-dark">
                {taskList.name}
              </h1>
            </header>
            <ul className="mt-4 flex flex-col gap-2">
              {taskList.tasks.length === 0 ? (
                <li className="text-sm text-muted dark:text-muted-dark">
                  {t("pages.tasklist.noTasks")}
                </li>
              ) : (
                taskList.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-xl border border-border/70 bg-surface/80 px-3 py-2 dark:border-border-dark/70 dark:bg-surface-dark/80"
                  >
                    {task.date ? (
                      <div className="text-xs text-muted dark:text-muted-dark">
                        {task.date}
                      </div>
                    ) : null}
                    <div
                      className={
                        task.completed
                          ? "text-sm text-muted line-through dark:text-muted-dark"
                          : "text-sm text-text dark:text-text-dark"
                      }
                    >
                      {task.text}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

const PAGE_COMPONENTS = {
  "404": NotFoundPage,
  "500": ServerErrorPage,
  app: AppPage,
  index: IndexPage,
  login: LoginPage,
  password_reset: PasswordResetPage,
  sharecodes: SharecodesPage,
} as const;

const pageKey = document.body.dataset.page;
const Page =
  (pageKey && PAGE_COMPONENTS[pageKey as keyof typeof PAGE_COMPONENTS]) ||
  PAGE_COMPONENTS["404"];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <Page />
    </AppWrapper>
  </StrictMode>,
);
