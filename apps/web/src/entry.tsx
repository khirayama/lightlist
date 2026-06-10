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
  Context,
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
import type { Root } from "react-dom/client";
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
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
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
  getDocFromCache,
  getDocsFromCache,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  increment,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import type {
  DocumentData,
  Firestore,
  FirestoreError,
  QuerySnapshot,
} from "firebase/firestore";
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

type TaskListOrderEntry = {
  order: number;
};

type TaskListOrderStore = Record<string, TaskListOrderEntry | number> & {
  createdAt: number;
  updatedAt: number;
};

type TaskListStoreTask = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  order: number;
  pinned: boolean;
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
  createdAt: number | TimestampLike;
  updatedAt: number | TimestampLike;
};

type TimestampLike = {
  toMillis: () => number;
};

const hasToMillis = (value: unknown): value is TimestampLike =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { toMillis?: unknown }).toMillis === "function";

const toMillisValue = (value: number | TimestampLike): number =>
  typeof value === "number" ? value : value.toMillis();

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
  pinned: boolean;
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

const areTasksEqual = (left: Task[], right: Task[]) =>
  left.length === right.length &&
  left.every((task, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      task.id === other.id &&
      task.text === other.text &&
      task.completed === other.completed &&
      task.date === other.date &&
      task.pinned === other.pinned
    );
  });

const taskListMutationQueues = new Map<string, Promise<void>>();

async function enqueueTaskListMutation<T>(
  taskListId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = taskListMutationQueues.get(taskListId) ?? Promise.resolve();
  const run = previous.then(operation, operation);
  const queued = run.then(
    () => undefined,
    () => undefined,
  );
  taskListMutationQueues.set(taskListId, queued);
  try {
    return await run;
  } finally {
    if (taskListMutationQueues.get(taskListId) === queued) {
      taskListMutationQueues.delete(taskListId);
    }
  }
}

type AppState = {
  user: User | null;
  authStatus: AuthStatus;
  settings: Settings | null;
  settingsStatus: DataLoadStatus;
  taskLists: TaskList[];
  taskListOrderStatus: DataLoadStatus;
  taskListDocsStatus: DataLoadStatus;
  taskListOrderUpdatedAt: number | null;
  sharedTaskListsById: Record<string, TaskList>;
  startupError: string | null;
};

type WebBootstrapState = {
  auth?: Auth;
  db?: Firestore;
  analytics?: Analytics | null;
  root?: Root;
};

declare global {
  var __LIGHTLIST_WEB_BOOTSTRAP__: WebBootstrapState | undefined;
}

const webBootstrapState =
  globalThis.__LIGHTLIST_WEB_BOOTSTRAP__ ??
  (globalThis.__LIGHTLIST_WEB_BOOTSTRAP__ = {});

let cachedAuth: Auth | null = webBootstrapState.auth ?? null;
let cachedDb: Firestore | null = webBootstrapState.db ?? null;

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

const getAuthInstance = (): Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getApp();
  cachedAuth = getAuth(app);
  webBootstrapState.auth = cachedAuth;
  return cachedAuth;
};

const getDbInstance = (): Firestore => {
  if (cachedDb) {
    return cachedDb;
  }

  const app = getApp();
  try {
    cachedDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("initializeFirestore() has already been called")
    ) {
      cachedDb = getFirestore(app);
    } else {
      throw error;
    }
  }
  webBootstrapState.db = cachedDb;
  return cachedDb;
};

let cached: Analytics | null | undefined = webBootstrapState.analytics;

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (cached !== undefined) return cached;
  const supported = await isSupported();
  if (!supported) {
    cached = null;
    webBootstrapState.analytics = cached;
    return null;
  }
  const apps = getApps();
  if (apps.length === 0) {
    cached = null;
    webBootstrapState.analytics = cached;
    return null;
  }
  cached = getAnalytics(apps[0]);
  webBootstrapState.analytics = cached;
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
const logTaskListReorder = () => log("app_task_list_reorder");
const logTaskAdd = (params: { has_date: boolean }) =>
  log("app_task_add", params);
const logTaskUpdate = (params: { fields: string }) =>
  log("app_task_update", params);
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

const AUTH_SIGN_IN_TIMEOUT_MS = 10_000;

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

const AUTH_FREE_PAGES = new Set(["404", "500", "password_reset"]);

const isAuthFreePage = (): boolean =>
  AUTH_FREE_PAGES.has(document.body.dataset.page ?? "");

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
        <div className="ll-u-0059 ll-u-0086 ll-u-0111 ll-u-0152 ll-u-0156 ll-u-0159 ll-u-0223 ll-u-0233 ll-u-0317 ll-u-0473 ll-u-0505">
          <div className="ll-u-0111 ll-u-0123 ll-u-0169 ll-u-0265">
            <div className="ll-u-0041 ll-u-0059 ll-u-0075 ll-u-0102 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0222 ll-u-0482">
              <AppIcon
                name="alert-circle"
                className="ll-u-0070 ll-u-0097 ll-u-0313 ll-u-0503"
              />
            </div>
            <h2 className="ll-u-0536 ll-u-0273 ll-u-0287">
              {t("pages.error.title")}
            </h2>
            <p className="ll-u-0274 ll-u-0310 ll-u-0499">
              {t("pages.error.description")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0189 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0286 ll-u-0312 ll-u-0367 ll-u-0381 ll-u-0373 ll-u-0375 ll-u-0376 ll-u-0480 ll-u-0501 ll-u-0521"
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
      <div className="ll-u-0079 ll-u-0111 ll-u-0176 ll-u-0269">
        <div className="ll-u-0080 ll-u-0111 ll-u-0178">
          <a
            href={`#${MAIN_CONTENT_ID}`}
            className="ll-u-0002 ll-u-0006 ll-u-0017 ll-u-0038 ll-u-0137 ll-u-0189 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0312 ll-u-0322 ll-u-0329 ll-u-0337 ll-u-0368 ll-u-0369 ll-u-0372 ll-u-0377 ll-u-0378 ll-u-0379 ll-u-0380 ll-u-0480 ll-u-0501 ll-u-0525"
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
  taskListDocsStatus: AppState["taskListDocsStatus"];
  taskLists: TaskList[];
};
type TaskListsState = {
  taskListOrder: TaskListOrderStore | null;
  taskListOrderStatus: AppState["taskListOrderStatus"];
  taskListDocsStatus: AppState["taskListDocsStatus"];
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
  taskListDocsStatus: "idle",
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
    if (
      tasks[taskId].id !== taskId ||
      typeof tasks[taskId].pinned !== "boolean"
    ) {
      needsNormalization = true;
      break;
    }
  }
  if (!needsNormalization) return taskListData;

  const normalizedTasks: Record<string, TaskListStoreTask> = {};
  for (const taskId of Object.keys(tasks)) {
    const task = tasks[taskId];
    normalizedTasks[taskId] =
      task.id === taskId && typeof task.pinned === "boolean"
        ? task
        : { ...task, id: taskId, pinned: Boolean(task.pinned) };
  }
  return { ...taskListData, tasks: normalizedTasks };
}

const getTaskListOrderEntries = (
  taskListOrder: TaskListOrderStore | null,
): Array<[string, TaskListOrderEntry]> =>
  taskListOrder
    ? (Object.entries(taskListOrder).filter(
        ([key, value]) =>
          !TASK_LIST_ORDER_METADATA_KEYS.has(key) &&
          typeof value === "object" &&
          value !== null &&
          typeof (value as TaskListOrderEntry).order === "number",
      ) as Array<[string, TaskListOrderEntry]>)
    : [];

const getTaskListIdsFromOrder = (
  taskListOrder: TaskListOrderStore | null,
): string[] =>
  getTaskListOrderEntries(taskListOrder).map(([taskListId]) => taskListId);

const getTaskListIdsKey = (taskListIds: string[]): string =>
  taskListIds.length > 0 ? [...taskListIds].sort().join("|") : "";

const mapTaskListStoreToTaskList = (
  taskListId: string,
  taskListData: TaskListStore,
): TaskList => ({
  id: taskListId,
  name: taskListData.name,
  tasks: getDisplayOrderedTasks(taskListData),
  history: taskListData.history,
  shareCode: taskListData.shareCode,
  background: taskListData.background,
  memberCount:
    typeof taskListData.memberCount === "number" ? taskListData.memberCount : 1,
  createdAt: toMillisValue(taskListData.createdAt),
  updatedAt: toMillisValue(taskListData.updatedAt),
});

const getOrderedTaskListIds = (
  taskListOrder: TaskListOrderStore | null,
): string[] =>
  getTaskListOrderEntries(taskListOrder)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([taskListId]) => taskListId);

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
      type: "setTaskListChunk";
      taskListIds: string[];
      taskListsById: Record<string, TaskListStore>;
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
      type: "setTaskListDocsStatus";
      taskListDocsStatus: AppState["taskListDocsStatus"];
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
        taskListDocsStatus:
          getTaskListIdsFromOrder(action.taskListOrder).length > 0
            ? "loading"
            : "ready",
      };
    case "setTaskListChunk": {
      const nextTaskListsById = { ...state.taskListsById };
      let hasChanged = false;
      action.taskListIds.forEach((taskListId) => {
        const taskListData = action.taskListsById[taskListId] ?? null;
        if (!taskListData) {
          if (
            !Object.prototype.hasOwnProperty.call(nextTaskListsById, taskListId)
          ) {
            return;
          }
          delete nextTaskListsById[taskListId];
          hasChanged = true;
          return;
        }
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
    case "setTaskListDocsStatus":
      return {
        ...state,
        taskListDocsStatus: action.taskListDocsStatus,
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

type TaskListsContextValue = {
  taskListOrderStatus: AppState["taskListOrderStatus"];
  taskListDocsStatus: AppState["taskListDocsStatus"];
  taskLists: TaskList[];
  sharedTaskListsById: Record<string, TaskList>;
  hasStartupError: boolean;
  registerSharedTaskList: (taskListId: string) => () => void;
};

const SessionContext = createContext<SessionState | null>(null);
const SettingsContext = createContext<SettingsState | null>(null);
const TaskListsContext = createContext<TaskListsContextValue | null>(null);

function useRequiredContext<T>(context: Context<T | null>): T {
  const value = useContext(context);
  if (!value) {
    throw new Error("AppStateProvider is required");
  }
  return value;
}

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
    if (isAuthFreePage()) {
      setSession({ authStatus: "unauthenticated", user: null });
      return;
    }
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

    let hasLiveSnapshot = false;
    let isSubscribed = true;
    const settingsRef = doc(getDbInstance(), "settings", session.user.uid);

    setSettingsState((current) => ({
      settings: current.settings,
      settingsStatus: "loading",
    }));

    void getDocFromCache(settingsRef)
      .then((snapshot) => {
        if (!isSubscribed || hasLiveSnapshot) {
          return;
        }
        const settingsStore = snapshot.exists()
          ? (snapshot.data() as SettingsStore)
          : null;
        setSettingsState({
          settings: mapSettingsStore(settingsStore),
          settingsStatus: "ready",
        });
      })
      .catch(() => {});

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        hasLiveSnapshot = true;
        const settingsStore = snapshot.exists()
          ? (snapshot.data() as SettingsStore)
          : null;
        setSettingsState({
          settings: mapSettingsStore(settingsStore),
          settingsStatus: "ready",
        });
      },
      () => {
        hasLiveSnapshot = true;
        setSettingsState({
          settings: null,
          settingsStatus: "error",
        });
      },
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [session.authStatus, session.user]);

  useEffect(() => {
    if (session.authStatus !== "authenticated" || !session.user) {
      dispatchTaskLists({ type: "reset", taskListOrderStatus: "idle" });
      return;
    }

    let hasLiveSnapshot = false;
    let isSubscribed = true;
    const taskListOrderRef = doc(
      getDbInstance(),
      "taskListOrder",
      session.user.uid,
    );

    dispatchTaskLists({ type: "reset", taskListOrderStatus: "loading" });

    void getDocFromCache(taskListOrderRef)
      .then((snapshot) => {
        if (!isSubscribed || hasLiveSnapshot) {
          return;
        }
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder: snapshot.exists()
            ? (snapshot.data() as TaskListOrderStore)
            : null,
          taskListOrderStatus: "ready",
        });
      })
      .catch(() => {});

    const unsubscribe = onSnapshot(
      taskListOrderRef,
      (snapshot) => {
        hasLiveSnapshot = true;
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder: snapshot.exists()
            ? (snapshot.data() as TaskListOrderStore)
            : null,
          taskListOrderStatus: "ready",
        });
      },
      () => {
        hasLiveSnapshot = true;
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder: null,
          taskListOrderStatus: "error",
        });
      },
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [session.authStatus, session.user]);

  const orderedTaskListIds = useMemo(
    () => getOrderedTaskListIds(taskListsState.taskListOrder),
    [taskListsState.taskListOrder],
  );
  const orderedTaskListIdsKey = useMemo(
    () => getTaskListIdsKey(orderedTaskListIds),
    [orderedTaskListIds],
  );
  const orderedTaskListIdsRef = useRef(orderedTaskListIds);
  orderedTaskListIdsRef.current = orderedTaskListIds;

  useEffect(() => {
    const orderedTaskListIds = orderedTaskListIdsRef.current;
    dispatchTaskLists({
      type: "pruneTaskListsById",
      taskListIds: orderedTaskListIds,
    });

    if (session.authStatus !== "authenticated" || !session.user) {
      return;
    }

    if (orderedTaskListIds.length === 0) {
      dispatchTaskLists({
        type: "setTaskListDocsStatus",
        taskListDocsStatus: "ready",
      });
      return;
    }

    dispatchTaskLists({
      type: "setTaskListDocsStatus",
      taskListDocsStatus: "loading",
    });

    let isSubscribed = true;
    const liveSnapshotIndexes = new Set<number>();
    const taskListQueryChunks = getTaskListIdChunks(orderedTaskListIds).map(
      (chunk) => ({
        taskListIds: chunk,
        taskListQuery: query(
          collection(getDbInstance(), "taskLists"),
          where("__name__", "in", chunk),
        ),
      }),
    );
    const applyTaskListSnapshot = (
      taskListIds: string[],
      snapshot: QuerySnapshot<DocumentData>,
    ) => {
      const taskListsById: Record<string, TaskListStore> = {};
      snapshot.docs.forEach((documentSnapshot) => {
        taskListsById[documentSnapshot.id] = normalizeTaskListStore(
          documentSnapshot.data({
            serverTimestamps: "estimate",
          }) as TaskListStore,
        );
      });
      dispatchTaskLists({
        type: "setTaskListChunk",
        taskListIds,
        taskListsById,
      });
    };

    taskListQueryChunks.forEach(({ taskListIds, taskListQuery }, index) => {
      void getDocsFromCache(taskListQuery)
        .then((snapshot) => {
          if (!isSubscribed || liveSnapshotIndexes.has(index)) {
            return;
          }
          applyTaskListSnapshot(taskListIds, snapshot);
          if (snapshot.docs.length > 0) {
            dispatchTaskLists({
              type: "setTaskListDocsStatus",
              taskListDocsStatus: "ready",
            });
          }
        })
        .catch(() => {});
    });

    const unsubscribers = taskListQueryChunks.map(
      ({ taskListIds, taskListQuery }, index) =>
        onSnapshot(
          taskListQuery,
          (snapshot) => {
            liveSnapshotIndexes.add(index);
            applyTaskListSnapshot(taskListIds, snapshot);
            dispatchTaskLists({
              type: "setTaskListDocsStatus",
              taskListDocsStatus: "ready",
            });
          },
          (error: FirestoreError) => {
            liveSnapshotIndexes.add(index);
            console.error("taskList chunk listener error:", error);
            dispatchTaskLists({
              type: "setTaskListDocsStatus",
              taskListDocsStatus: "error",
            });
          },
        ),
    );

    return () => {
      isSubscribed = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [orderedTaskListIdsKey, session.authStatus, session.user]);

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
              ? normalizeTaskListStore(
                  snapshot.data({
                    serverTimestamps: "estimate",
                  }) as TaskListStore,
                )
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
      orderedTaskListIds.flatMap((taskListId) => {
        const taskListData = taskListsState.taskListsById[taskListId];
        return taskListData
          ? [mapTaskListStoreToTaskList(taskListId, taskListData)]
          : [];
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
    taskListsState.taskListOrderStatus === "error" ||
    (taskListsState.taskListDocsStatus === "error" &&
      Object.keys(taskListsState.taskListsById).length === 0);

  const taskListsContextValue = useMemo<TaskListsContextValue>(
    () => ({
      taskListOrderStatus: taskListsState.taskListOrderStatus,
      taskListDocsStatus: taskListsState.taskListDocsStatus,
      taskLists,
      sharedTaskListsById,
      hasStartupError,
      registerSharedTaskList,
    }),
    [
      hasStartupError,
      registerSharedTaskList,
      sharedTaskListsById,
      taskLists,
      taskListsState.taskListDocsStatus,
      taskListsState.taskListOrderStatus,
    ],
  );

  return (
    <SessionContext.Provider value={session}>
      <SettingsContext.Provider value={settingsState}>
        <TaskListsContext.Provider value={taskListsContextValue}>
          {children}
        </TaskListsContext.Provider>
      </SettingsContext.Provider>
    </SessionContext.Provider>
  );
}

function useSessionState(): SessionState {
  return useRequiredContext(SessionContext);
}

function useAuthStatus(): AppState["authStatus"] {
  return useSessionState().authStatus;
}

function useUser(): User | null {
  return useSessionState().user;
}

function useSettingsState(): SettingsState {
  return useRequiredContext(SettingsContext);
}

function useSettings(): AppState["settings"] {
  return useSettingsState().settings;
}

function useTaskListIndexState(): TaskListIndexState {
  const {
    hasStartupError,
    taskListOrderStatus,
    taskListDocsStatus,
    taskLists,
  } = useRequiredContext(TaskListsContext);
  return {
    hasStartupError,
    taskListOrderStatus,
    taskListDocsStatus,
    taskLists,
  };
}

function useTaskList(taskListId: string | null): TaskList | null {
  const { taskLists, sharedTaskListsById, registerSharedTaskList } =
    useRequiredContext(TaskListsContext);
  const taskList = taskListId
    ? (taskLists.find((item) => item.id === taskListId) ??
      sharedTaskListsById[taskListId] ??
      null)
    : null;
  const isOwnTaskList = taskListId
    ? taskLists.some((item) => item.id === taskListId)
    : false;

  useEffect(() => {
    if (!taskListId || isOwnTaskList) {
      return;
    }
    return registerSharedTaskList(taskListId);
  }, [isOwnTaskList, registerSharedTaskList, taskListId]);

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

// INITIAL_TASK_LIST_NAME_BY_LANGUAGE removed

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
): TaskListStore => {
  const bundle = i18next.getResourceBundle(language, "translation") as any;
  return {
    id: taskListId,
    name: bundle?.app?.initialTaskListName ?? "📒PERSONAL",
    tasks: {},
    history: [],
    shareCode: null,
    background: null,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };
};

const createInitialTaskListOrderStore = (
  taskListId: string,
  now: number,
): TaskListOrderStore => ({
  [taskListId]: { order: 1.0 },
  createdAt: now,
  updatedAt: now,
});

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

async function signUp(email: string, password: string, language: Language) {
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

async function signIn(email: string, password: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      logException("Web sign in timed out", false);
      reject(new Error("auth-timeout"));
    }, AUTH_SIGN_IN_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      signInWithEmailAndPassword(getAuthInstance(), email, password),
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function signOut() {
  await firebaseSignOut(getAuthInstance());
}

async function sendPasswordResetEmail(email: string, language?: Language) {
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

async function verifyPasswordResetCode(code: string) {
  return await firebaseVerifyPasswordResetCode(getAuthInstance(), code);
}

async function confirmPasswordReset(code: string, newPassword: string) {
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
    const results = await Promise.allSettled(
      taskListIds.map((taskListId) => deleteTaskList(taskListId)),
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected) {
      throw rejected.reason;
    }
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

type ParsedTaskInput = {
  text: string;
  date: string | null;
  pinnedFromInput: boolean;
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
        return new Date(currentYear + 1, m, d);
      }
      return date;
    },
  },
];

const getRelativePatterns = (language: Language): DatePattern[] => {
  const bundle = i18next.getResourceBundle(language, "translation") as any;
  const patterns = bundle?.datePatterns?.relative ?? [];
  const weekdays = bundle?.datePatterns?.weekdays ?? {};

  return patterns.map((p: any) => ({
    regex: new RegExp(p.pattern, p.options || ""),
    getOffset: (match: RegExpMatchArray) => {
      if (p.offset !== undefined) return p.offset;
      if (p.offsetGroup !== undefined)
        return Number.parseInt(match[p.offsetGroup], 10);
      if (p.weekdayGroup !== undefined) {
        const target = weekdays[match[p.weekdayGroup]];
        if (target === undefined) {
          const lowerTarget = match[p.weekdayGroup].toLowerCase();
          const lowerWeekdays = Object.fromEntries(
            Object.entries(weekdays).map(([k, v]) => [k.toLowerCase(), v]),
          );
          const finalTarget = lowerWeekdays[lowerTarget];
          if (finalTarget === undefined) return null;
          return getNextWeekdayOffset(
            finalTarget as number,
            new Date().getDay(),
          );
        }
        return getNextWeekdayOffset(target as number, new Date().getDay());
      }
      return null;
    },
  }));
};

const GLOBAL_PIN_PREFIXES = ["pin", "pinned"] as const;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const getPinPrefixRegex = (language: Language): RegExp => {
  const bundle = i18next.getResourceBundle(language, "translation") as any;
  const tokens = Array.from(
    new Set([...GLOBAL_PIN_PREFIXES, ...(bundle?.pinPrefixes ?? [])]),
  ).sort((left, right) => right.length - left.length);
  return new RegExp(
    String.raw`^(?:${tokens.map(escapeRegex).join("|")})(?=\s|$)`,
    "iu",
  );
};

const parsePinPrefix = (
  text: string,
  language: Language,
): { text: string; pinnedFromInput: boolean } => {
  const source = text.trimStart();
  if (!source) return { text: source, pinnedFromInput: false };
  const match = source.match(getPinPrefixRegex(language));
  if (!match) return { text: source, pinnedFromInput: false };
  return {
    text: source.substring(match[0].length).trimStart(),
    pinnedFromInput: true,
  };
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
  const relativePatternSets: DatePattern[][] = [
    getRelativePatterns(resolvedLanguage),
  ];
  if (resolvedLanguage !== "en") {
    relativePatternSets.push(getRelativePatterns("en"));
  }
  for (const patterns of relativePatternSets) {
    const languageParsed = resolveDateFromPattern(normalized, patterns);
    if (!languageParsed) {
      continue;
    }
    return {
      date: formatDate(languageParsed.targetDate),
      text: source.substring(languageParsed.matchedLength).trimStart(),
    };
  }
  return { date: null, text };
}

function resolveTaskInput(
  text: string,
  language: Language,
  currentTask?: Pick<Task, "text" | "date" | "pinned">,
): { text: string; date: string; pinned: boolean; pinnedChanged: boolean } {
  let remaining = text.trimStart();
  let date: string | null = null;
  let pinnedFromInput = false;
  let parsedPin = false;
  let parsedDate = false;

  for (let index = 0; index < 2; index += 1) {
    if (!parsedPin) {
      const pinParsed = parsePinPrefix(remaining, language);
      if (pinParsed.pinnedFromInput) {
        remaining = pinParsed.text;
        pinnedFromInput = true;
        parsedPin = true;
        continue;
      }
    }

    if (!parsedDate) {
      const dateParsed = parseDateFromText(remaining, language);
      if (dateParsed.date !== null) {
        remaining = dateParsed.text;
        date = dateParsed.date;
        parsedDate = true;
        continue;
      }
    }

    break;
  }

  const parsedText = remaining.trim();
  if (currentTask) {
    const pinned = pinnedFromInput ? true : currentTask.pinned;
    return {
      text: parsedText || currentTask.text,
      date: date ?? currentTask.date,
      pinned,
      pinnedChanged: pinned !== currentTask.pinned,
    };
  }
  return {
    text: parsedText,
    date: date ?? "",
    pinned: pinnedFromInput,
    pinnedChanged: pinnedFromInput,
  };
}

function assertTaskListStore(data: unknown, id: string): TaskListStore {
  if (data == null) throw new Error(`TaskList not found: ${id}`);
  const d = data as Record<string, unknown>;
  if (
    typeof d.name !== "string" ||
    typeof d.tasks !== "object" ||
    d.tasks === null ||
    typeof d.memberCount !== "number" ||
    (typeof d.createdAt !== "number" && !hasToMillis(d.createdAt)) ||
    (typeof d.updatedAt !== "number" && !hasToMillis(d.updatedAt))
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
      const aGroup = getTaskDisplayGroup(a);
      const bGroup = getTaskDisplayGroup(b);
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
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
  const taskListRef = doc(db, "taskLists", taskListId);
  const snapshot = await getDocFromCache(taskListRef).catch(() =>
    getDoc(taskListRef),
  );
  if (!snapshot.exists()) throw new Error("Task list not found");
  return normalizeTaskListStore(
    assertTaskListStore(
      snapshot.data({ serverTimestamps: "estimate" }),
      taskListId,
    ),
  );
}

function getOrderedTaskListOrders(taskListOrder: TaskListOrderStore): number[] {
  return getTaskListOrderEntries(taskListOrder).map(([, value]) => value.order);
}

async function getTaskListOrderData(uid: string): Promise<TaskListOrderStore> {
  const db = getDbInstance();
  const snapshot = await getDoc(doc(db, "taskListOrder", uid));
  return assertTaskListOrderStore(snapshot.data(), uid);
}

function renumberTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  return tasks.map((task, index) => ({ ...task, order: (index + 1) * 1.0 }));
}

function getTaskDisplayGroup(
  task: Pick<TaskListStoreTask, "completed" | "pinned">,
) {
  if (task.completed) return 2;
  return task.pinned ? 0 : 1;
}

function getOrderedTasks(
  taskList: Pick<TaskListStore, "tasks">,
): TaskListStoreTask[] {
  return Object.values(taskList.tasks).sort((a, b) => a.order - b.order);
}

function getDisplayOrderedTasks(
  taskList: Pick<TaskListStore, "tasks">,
): TaskListStoreTask[] {
  return getOrderedTasks(taskList).sort((a, b) => {
    const aGroup = getTaskDisplayGroup(a);
    const bGroup = getTaskDisplayGroup(b);
    if (aGroup !== bGroup) return aGroup - bGroup;
    return a.order - b.order;
  });
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

const MAX_TASK_HISTORY_ENTRIES = 300;

function buildHistory(
  taskList: TaskListStore,
  newText: string,
  oldText?: string,
): string[] {
  const candidate = newText.trim();
  if (!candidate) return taskList.history ?? [];
  const trimmedOldText = oldText?.trim();
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of [candidate, ...(taskList.history ?? [])]) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    if (trimmedOldText && trimmed === trimmedOldText) continue;
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(trimmed);
    if (result.length >= MAX_TASK_HISTORY_ENTRIES) break;
  }
  return result;
}

function buildTaskUpdateData(params: {
  previousTasks?: TaskListStoreTask[];
  tasks: TaskListStoreTask[];
  deletedTaskIds?: string[];
}): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const previousById = new Map(
    (params.previousTasks ?? []).map((task) => [task.id, task]),
  );
  params.deletedTaskIds?.forEach((taskId) => {
    updates[`tasks.${taskId}`] = deleteField();
  });
  params.tasks.forEach((task) => {
    const previous = previousById.get(task.id);
    if (!previous) {
      updates[`tasks.${task.id}`] = task;
      return;
    }
    if (previous.text !== task.text)
      updates[`tasks.${task.id}.text`] = task.text;
    if (previous.completed !== task.completed) {
      updates[`tasks.${task.id}.completed`] = task.completed;
    }
    if (previous.date !== task.date)
      updates[`tasks.${task.id}.date`] = task.date;
    if (previous.order !== task.order) {
      updates[`tasks.${task.id}.order`] = task.order;
    }
    if (previous.pinned !== task.pinned) {
      updates[`tasks.${task.id}.pinned`] = task.pinned;
    }
  });
  return updates;
}

async function createTaskList(name: string, background?: string | null) {
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

async function updateTaskList(
  taskListId: string,
  updates: { name?: string; background?: string | null },
) {
  await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

async function deleteTaskList(taskListId: string) {
  const uid = requireCurrentUserId();
  const db = getDbInstance();
  const taskListRef = doc(db, "taskLists", taskListId);
  const taskListOrderRef = doc(db, "taskListOrder", uid);
  const [taskListSnapshot, taskListOrderSnapshot] = await Promise.all([
    getDoc(taskListRef),
    getDoc(taskListOrderRef),
  ]);
  const taskList = assertTaskListStore(taskListSnapshot.data(), taskListId);
  if (!taskListOrderSnapshot.exists()) {
    return;
  }
  const taskListOrder = assertTaskListOrderStore(
    taskListOrderSnapshot.data(),
    uid,
  );
  if (
    !getTaskListOrderEntries(taskListOrder).some(([id]) => id === taskListId)
  ) {
    return;
  }
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(
    taskListOrderRef,
    {
      [taskListId]: deleteField(),
      updatedAt: now,
    },
    { merge: true },
  );
  if (getValidMemberCount(taskList) <= 1) {
    if (taskList.shareCode) {
      batch.delete(
        doc(db, "shareCodes", normalizeShareCode(taskList.shareCode)),
      );
    }
    batch.delete(taskListRef);
  } else {
    batch.update(taskListRef, {
      memberCount: increment(-1),
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function updateTaskListOrder(
  taskListOrders: Array<{ taskListId: string; order: number }>,
) {
  const uid = requireCurrentUserId();
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  taskListOrders.forEach(({ taskListId, order }) => {
    updates[`${taskListId}.order`] = order;
  });
  await updateDoc(doc(getDbInstance(), "taskListOrder", uid), updates);
}

async function addTask(
  taskListId: string,
  rawText: string,
  settings: ResolvedTaskSettings,
  options?: { taskId?: string },
) {
  await enqueueTaskListMutation(taskListId, async () => {
    const taskList = await getTaskListData(taskListId);
    const parsed = resolveTaskInput(rawText, settings.language);
    const now = Date.now();
    const tasks = getOrderedTasks(taskList);
    const nextOrder =
      settings.taskInsertPosition === "bottom"
        ? (tasks[tasks.length - 1]?.order ?? 0) + 1
        : (tasks[0]?.order ?? 1) - 1;
    const nextTask: TaskListStoreTask = {
      id: options?.taskId ?? doc(collection(getDbInstance(), "taskLists")).id,
      text: parsed.text,
      completed: false,
      date: parsed.date,
      order: nextOrder,
      pinned: parsed.pinned,
    };
    const nextTasks = getSortedTasks(
      settings.taskInsertPosition === "top"
        ? [nextTask, ...tasks]
        : [...tasks, nextTask],
      settings,
    );
    await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
      ...buildTaskUpdateData({ previousTasks: tasks, tasks: nextTasks }),
      history: buildHistory(taskList, parsed.text),
      updatedAt: now,
    });
  });
}

async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Pick<Task, "completed" | "date" | "pinned" | "text">>,
  settings: ResolvedTaskSettings,
) {
  await enqueueTaskListMutation(taskListId, async () => {
    const needsTaskListRead =
      settings.autoSort ||
      typeof updates.text === "string" ||
      typeof updates.pinned === "boolean";
    const taskList = needsTaskListRead
      ? await getTaskListData(taskListId)
      : null;
    const currentTask = taskList?.tasks[taskId];
    if (needsTaskListRead && !currentTask) {
      throw new Error("Task not found");
    }
    const resolvedTextAndDate =
      typeof updates.text === "string" && currentTask
        ? resolveTaskInput(updates.text, settings.language, currentTask)
        : null;
    const normalizedUpdates: Partial<
      Pick<Task, "completed" | "date" | "pinned" | "text">
    > = {
      ...updates,
    };
    if (resolvedTextAndDate) {
      normalizedUpdates.text = resolvedTextAndDate.text;
      if (!("date" in updates)) {
        normalizedUpdates.date = resolvedTextAndDate.date;
      }
      if (!("pinned" in updates) && resolvedTextAndDate.pinnedChanged) {
        normalizedUpdates.pinned = resolvedTextAndDate.pinned;
      }
    }
    if (normalizedUpdates.text !== undefined && normalizedUpdates.text === "") {
      throw new Error("Task text is empty");
    }
    const now = Date.now();
    const historyUpdate =
      taskList &&
      currentTask &&
      resolvedTextAndDate &&
      resolvedTextAndDate.text.trim() !== currentTask.text.trim()
        ? buildHistory(taskList, resolvedTextAndDate.text, currentTask.text)
        : null;

    if (!settings.autoSort && typeof normalizedUpdates.pinned !== "boolean") {
      const nextUpdates: Record<string, unknown> = {
        updatedAt: now,
      };
      Object.entries(normalizedUpdates).forEach(([key, value]) => {
        nextUpdates[`tasks.${taskId}.${key}`] = value;
      });
      if (historyUpdate) {
        nextUpdates.history = historyUpdate;
      }
      await updateDoc(
        doc(getDbInstance(), "taskLists", taskListId),
        nextUpdates,
      );
      return;
    }

    if (!taskList || !currentTask) {
      throw new Error("Task not found");
    }

    const tasks = getOrderedTasks(taskList);
    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) return task;
      const nextTask: TaskListStoreTask = {
        ...task,
        ...normalizedUpdates,
      };
      return nextTask;
    });
    const nextTasks =
      !settings.autoSort &&
      currentTask.pinned &&
      !currentTask.completed &&
      normalizedUpdates.pinned === false
        ? renumberTasks([
            ...updatedTasks.filter((task) => getTaskDisplayGroup(task) === 0),
            ...updatedTasks.filter((task) => task.id === taskId),
            ...updatedTasks.filter(
              (task) => getTaskDisplayGroup(task) === 1 && task.id !== taskId,
            ),
            ...updatedTasks.filter((task) => getTaskDisplayGroup(task) === 2),
          ])
        : getSortedTasks(updatedTasks, settings);
    const nextUpdates: Record<string, unknown> = {
      ...buildTaskUpdateData({ previousTasks: tasks, tasks: nextTasks }),
      updatedAt: now,
    };
    if (historyUpdate) {
      nextUpdates.history = historyUpdate;
    }
    await updateDoc(doc(getDbInstance(), "taskLists", taskListId), nextUpdates);
  });
}

async function deleteCompletedTasks(
  taskListId: string,
  settings: ResolvedTaskSettings,
) {
  await enqueueTaskListMutation(taskListId, async () => {
    const taskList = await getTaskListData(taskListId);
    const tasks = getOrderedTasks(taskList);
    const completedTasks = tasks.filter((task) => task.completed);
    const remainingTasks = getSortedTasks(
      tasks.filter((task) => !task.completed),
      settings,
    );
    const nextData: Record<string, unknown> = {
      ...buildTaskUpdateData({
        previousTasks: tasks,
        tasks: remainingTasks,
        deletedTaskIds: completedTasks.map((task) => task.id),
      }),
      updatedAt: Date.now(),
    };
    await updateDoc(doc(getDbInstance(), "taskLists", taskListId), nextData);
  });
}

async function sortTasks(taskListId: string) {
  await enqueueTaskListMutation(taskListId, async () => {
    const taskList = await getTaskListData(taskListId);
    const tasks = getDisplayOrderedTasks(taskList);
    const sortedTasks = getAutoSortedTasks(tasks);
    await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
      ...buildTaskUpdateData({ previousTasks: tasks, tasks: sortedTasks }),
      updatedAt: Date.now(),
    });
  });
}

async function updateTasksOrder(
  taskListId: string,
  draggedId: string,
  targetId: string,
) {
  await enqueueTaskListMutation(taskListId, async () => {
    const taskList = await getTaskListData(taskListId);
    const tasks = getDisplayOrderedTasks(taskList);
    const dragged = taskList.tasks[draggedId];
    const target = taskList.tasks[targetId];
    if (!dragged || !target) return;
    if (getTaskDisplayGroup(dragged) !== getTaskDisplayGroup(target)) return;
    const reorderedTasks = moveItemBeforeTarget(tasks, draggedId, targetId);
    if (!reorderedTasks) return;
    const nextTasks = renumberTasks(reorderedTasks);
    await updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
      ...buildTaskUpdateData({ previousTasks: tasks, tasks: nextTasks }),
      updatedAt: Date.now(),
    });
  });
}

const MAX_SHARE_CODE_ATTEMPTS = 10;

async function fetchTaskListByShareCode(shareCode: string) {
  const normalizedCode = normalizeShareCode(shareCode);
  const snapshots = await getDoc(
    doc(getDbInstance(), "shareCodes", normalizedCode),
  );
  return snapshots.exists()
    ? (snapshots.data() as { taskListId: string })
    : null;
}

async function fetchTaskListIdByShareCode(shareCode: string) {
  const shareCodeData = await fetchTaskListByShareCode(shareCode);
  return shareCodeData?.taskListId ?? null;
}

async function addSharedTaskListToOrder(taskListId: string) {
  const uid = requireCurrentUserId();
  const db = getDbInstance();
  const taskListRef = doc(db, "taskLists", taskListId);
  const taskListOrderRef = doc(db, "taskListOrder", uid);
  const [taskListSnapshot, taskListOrderSnapshot] = await Promise.all([
    getDoc(taskListRef),
    getDoc(taskListOrderRef),
  ]);
  assertTaskListStore(taskListSnapshot.data(), taskListId);
  const taskListOrder = taskListOrderSnapshot.exists()
    ? assertTaskListOrderStore(taskListOrderSnapshot.data(), uid)
    : null;
  if (
    taskListOrder &&
    getTaskListOrderEntries(taskListOrder).some(([id]) => id === taskListId)
  ) {
    return;
  }
  const nextOrder =
    Math.max(
      0,
      ...(taskListOrder ? getOrderedTaskListOrders(taskListOrder) : []),
    ) + 1;
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(
    taskListOrderRef,
    {
      [taskListId]: { order: nextOrder },
      updatedAt: now,
    },
    { merge: true },
  );
  batch.update(taskListRef, {
    memberCount: increment(1),
    updatedAt: now,
  });
  await batch.commit();
}

async function removeShareCode(taskListId: string) {
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
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    crypto.getRandomValues(new Uint32Array(8)),
    (value) => chars[value % chars.length],
  ).join("");
}

async function generateShareCode(taskListId: string): Promise<string> {
  const db = getDbInstance();
  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
    try {
      const shareCode = generateRandomShareCode();
      const shareCodeRef = doc(db, "shareCodes", shareCode);
      const shareCodeSnapshot = await getDoc(shareCodeRef);
      if (shareCodeSnapshot.exists()) continue;
      const taskList = await getTaskListData(taskListId);
      const batch = writeBatch(db);
      if (taskList.shareCode) {
        batch.delete(
          doc(db, "shareCodes", normalizeShareCode(taskList.shareCode)),
        );
      }
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
  | "push-pin"
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
  "push-pin": "M16 9V4l1-1V2H7v1l1 1v5l-2 2v2h5.2v7h1.6v-7H18v-2l-2-2z",
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
  info: "ll-u-0200 ll-u-0210 ll-u-0317 ll-u-0460 ll-u-0485 ll-u-0505",
  success: "ll-u-0202 ll-u-0215 ll-u-0307 ll-u-0462 ll-u-0476 ll-u-0496",
  warning: "ll-u-0198 ll-u-0209 ll-u-0306 ll-u-0459 ll-u-0472 ll-u-0495",
  error: "ll-u-0204 ll-u-0221 ll-u-0315 ll-u-0465 ll-u-0482 ll-u-0502",
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
        "ll-u-0191 ll-u-0193 ll-u-0239 ll-u-0244 ll-u-0274",
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
      className={clsx("ll-u-0059 ll-u-0156 ll-u-0159", className)}
    >
      <div className="ll-u-0141">
        <img
          src="/brand/logo.svg"
          alt=""
          aria-hidden="true"
          className="ll-u-0057 ll-u-0076 ll-u-0109"
        />
      </div>
      <span className="ll-u-0005">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="ll-u-0059 ll-u-0079 ll-u-0111 ll-u-0156 ll-u-0159 ll-u-0210 ll-u-0473">
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
    <div className="ll-u-0059 ll-u-0155 ll-u-0165">
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
              "ll-u-0059 ll-u-0072 ll-u-0099 ll-u-0156 ll-u-0159 ll-u-0183 ll-u-0193 ll-u-0200 ll-u-0279 ll-u-0287 ll-u-0310 ll-u-0460 ll-u-0499",
              isSelected
                ? "ll-u-0331 ll-u-0332 ll-u-0333 ll-u-0334 ll-u-0508 ll-u-0509"
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
        "ll-u-0007 ll-u-0011 ll-u-0036 ll-u-0211 ll-u-0336",
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
  const fallbackTitleId = useId();
  const fallbackDescriptionId = useId();
  const generatedTitleId = titleId ?? fallbackTitleId;
  const generatedDescriptionId =
    description !== undefined
      ? (descriptionId ?? fallbackDescriptionId)
      : undefined;

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
          "ll-u-0007 ll-u-0026 ll-u-0016 ll-u-0037 ll-u-0127 ll-u-0122 ll-u-0132 ll-u-0136 ll-u-0191 ll-u-0208 ll-u-0234 ll-u-0304 ll-u-0326",
          className,
        )}
      >
        <div className="ll-u-0059 ll-u-0152 ll-u-0165">
          <DialogPrimitive.Title
            id={generatedTitleId}
            className="ll-u-0040 ll-u-0273 ll-u-0287"
          >
            {title}
          </DialogPrimitive.Title>
          {description !== undefined ? (
            <DialogPrimitive.Description
              id={generatedDescriptionId}
              className="ll-u-0040 ll-u-0274 ll-u-0305"
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

const ActionSheetContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>["children"];
    description?: ComponentPropsWithoutRef<
      typeof DialogPrimitive.Description
    >["children"];
    titleId?: string;
    descriptionId?: string;
  }
>(function ActionSheetContent(
  { children, title, description, titleId, descriptionId, className, ...props },
  ref: ForwardedRef<ElementRef<typeof DialogPrimitive.Content>>,
) {
  const fallbackTitleId = useId();
  const fallbackDescriptionId = useId();
  const generatedTitleId = titleId ?? fallbackTitleId;
  const generatedDescriptionId =
    description !== undefined
      ? (descriptionId ?? fallbackDescriptionId)
      : undefined;

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
          "ll-u-0007 ll-u-0012 ll-u-0022 ll-u-0037 ll-u-0059 ll-u-0081 ll-u-0111 ll-u-0133 ll-u-0138 ll-u-0152 ll-u-0176 ll-u-0192 ll-u-0223 ll-u-0240 ll-u-0261 ll-u-0253 ll-u-0317 ll-u-0326 ll-u-0407 ll-u-0404 ll-u-0410 ll-u-0413 ll-u-0414 ll-u-0416 ll-u-0417 ll-u-0425 ll-u-0426 ll-u-0427 ll-u-0485 ll-u-0505 ll-u-0535",
          className,
        )}
      >
        <DialogPrimitive.Title id={generatedTitleId} className="ll-u-0005">
          {title}
        </DialogPrimitive.Title>
        {description !== undefined ? (
          <DialogPrimitive.Description
            id={generatedDescriptionId}
            className="ll-u-0005"
          >
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="ll-u-0046 ll-u-0059 ll-u-0155 ll-u-0156 ll-u-0160 ll-u-0165">
      {children}
    </div>
  );
}

type SettingsViewProps = {
  onBack?: () => void;
  showBackButton?: boolean;
  onOpenLicenses?: () => void;
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

type LicenseEntry = {
  id?: string;
  license: string;
  licenseText?: string;
  name: string;
  repository?: string;
  source?: string;
  text?: string;
  version?: string;
};

type LicensePayload = {
  bundledLicenses: LicenseEntry[];
  openSourceLicenses: LicenseEntry[];
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
  const primaryButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0312 ll-u-0367 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0392 ll-u-0480 ll-u-0501 ll-u-0529";
  const destructiveButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0216 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0318 ll-u-0367 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0387 ll-u-0391 ll-u-0392 ll-u-0477 ll-u-0528";
  const secondaryButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0359 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0485 ll-u-0505 ll-u-0514 ll-u-0529";

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
          <p className="ll-u-0044 ll-u-0274 ll-u-0310 ll-u-0499">
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
      <section className="ll-u-0191 ll-u-0193 ll-u-0204 ll-u-0223 ll-u-0233 ll-u-0465 ll-u-0485 ll-u-0430">
        {children}
      </section>
    );
  }

  return (
    <section className="ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0233 ll-u-0460 ll-u-0485 ll-u-0430">
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
      className={`ll-u-0060 ll-u-0165 ll-u-0246 ll-u-0418 ll-u-0420 ll-u-0337 ll-u-0353 ll-u-0354 ll-u-0355 ll-u-0356 ll-u-0511 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505 ll-u-0440">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="ll-u-0111 ll-u-0190 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0317 ll-u-0345 ll-u-0337 ll-u-0371 ll-u-0460 ll-u-0473 ll-u-0505 ll-u-0522"
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

function SettingsView({
  onBack,
  showBackButton = false,
  onOpenLicenses,
}: SettingsViewProps) {
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
    <div className="ll-u-0073 ll-u-0111 ll-u-0141 ll-u-0190 ll-u-0214 ll-u-0475" />
  );

  return (
    <div className="ll-u-0087 ll-u-0111 ll-u-0210 ll-u-0317 ll-u-0473 ll-u-0505">
      <div className="ll-u-0041 ll-u-0059 ll-u-0111 ll-u-0113 ll-u-0152 ll-u-0168 ll-u-0240 ll-u-0262 ll-u-0254 ll-u-0434 ll-u-0456">
        <header className="ll-u-0059 ll-u-0156 ll-u-0167 ll-u-0237">
          {showBackButton ? (
            <button
              type="button"
              onClick={onBack}
              title={t("common.back")}
              aria-label={t("common.back")}
              className="ll-u-0063 ll-u-0074 ll-u-0101 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0310 ll-u-0337 ll-u-0361 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0386 ll-u-0499 ll-u-0518 ll-u-0527"
            >
              <AppIcon
                name="arrow-back"
                className="ll-u-0069 ll-u-0096"
                aria-hidden="true"
                focusable="false"
              />
            </button>
          ) : null}
          <h1 className="ll-u-0536 ll-u-0125 ll-u-0129 ll-u-0270 ll-u-0287 ll-u-0291">
            {t("settings.title")}
          </h1>
        </header>

        {error && <Alert variant="error">{error}</Alert>}

        {settingsStatus === "error" ? (
          <Alert variant="error">{t("auth.error.general")}</Alert>
        ) : (
          <>
            <SettingsSection>
              <fieldset className="ll-u-0059 ll-u-0152 ll-u-0161">
                <legend className="ll-u-0274 ll-u-0287 ll-u-0292 ll-u-0310 ll-u-0499">
                  {t("settings.preferences.title")}
                </legend>
                <div className="ll-u-0044 ll-u-0171 ll-u-0172 ll-u-0458">
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
                      <div className="ll-u-0060 ll-u-0165 ll-u-0246 ll-u-0418 ll-u-0420">
                        <span className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
                          {t("settings.language.title")}
                        </span>
                        {skeletonSelect}
                      </div>
                      <div className="ll-u-0060 ll-u-0165 ll-u-0246 ll-u-0418 ll-u-0420">
                        <span className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
                          {t("settings.theme.title")}
                        </span>
                        {skeletonSelect}
                      </div>
                      <div className="ll-u-0060 ll-u-0165 ll-u-0246 ll-u-0418 ll-u-0420">
                        <span className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
                          {t("settings.taskInsertPosition.title")}
                        </span>
                        {skeletonSelect}
                      </div>
                    </>
                  )}
                </div>
                <label
                  className={`ll-u-0043 ll-u-0059 ll-u-0143 ll-u-0156 ll-u-0158 ll-u-0168 ll-u-0194 ll-u-0200 ll-u-0246 ll-u-0337 ll-u-0353 ll-u-0354 ll-u-0355 ll-u-0356 ll-u-0460 ll-u-0511 ${
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
                    className="ll-u-0347 ll-u-0005"
                  />
                  <span className="ll-u-0059 ll-u-0152 ll-u-0162">
                    <span className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
                      {t("settings.autoSort.title")}
                    </span>
                    <span className="ll-u-0276 ll-u-0310 ll-u-0499">
                      {t("settings.autoSort.enable")}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ll-u-0008 ll-u-0063 ll-u-0071 ll-u-0102 ll-u-0156 ll-u-0188 ll-u-0193 ll-u-0337 ${
                      settings?.autoSort
                        ? "border-primary ll-u-0219 ll-u-0463 dark:bg-primary-dark"
                        : "border-border ll-u-0214 ll-u-0460 dark:bg-surface-dark"
                    }`}
                  >
                    <span
                      className={`ll-u-0062 ll-u-0069 ll-u-0096 ll-u-0188 ll-u-0223 ll-u-0330 ll-u-0337 ll-u-0473 ${
                        settings?.autoSort ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </span>
                </label>
              </fieldset>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-u-0059 ll-u-0152 ll-u-0167">
                <h2 className="ll-u-0274 ll-u-0287 ll-u-0292 ll-u-0317 ll-u-0505">
                  {t("settings.legal.title")}
                </h2>
                <button
                  type="button"
                  onClick={onOpenLicenses}
                  disabled={!onOpenLicenses}
                  className="ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0167 ll-u-0189 ll-u-0237 ll-u-0244 ll-u-0266 ll-u-0337 ll-u-0359 ll-u-0390 ll-u-0395 ll-u-0514"
                >
                  <span className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
                    {t("settings.licenses.openSource")}
                  </span>
                  <span className="ll-u-0274 ll-u-0310 ll-u-0499">&gt;</span>
                </button>
              </div>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-u-0059 ll-u-0152 ll-u-0167">
                <h2 className="ll-u-0274 ll-u-0287 ll-u-0292 ll-u-0317 ll-u-0505">
                  {t("settings.actions.title")}
                </h2>
                <div className="ll-u-0196 ll-u-0200 ll-u-0260 ll-u-0460">
                  <p className="ll-u-0276 ll-u-0286 ll-u-0292 ll-u-0310 ll-u-0499">
                    {t("settings.userInfo.title")}
                  </p>
                  <div className="ll-u-0043 ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0165">
                    {user ? (
                      <p className="ll-u-0294 ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
                        {user.email}
                      </p>
                    ) : (
                      <div className="ll-u-0069 ll-u-0105 ll-u-0141 ll-u-0181 ll-u-0214 ll-u-0475" />
                    )}
                    {!showEmailChangeForm && (
                      <button
                        type="button"
                        onClick={() => setShowEmailChangeForm(true)}
                        disabled={actionsDisabled}
                        className="ll-u-0131 ll-u-0276 ll-u-0310 ll-u-0320 ll-u-0365 ll-u-0391 ll-u-0393 ll-u-0499 ll-u-0520"
                      >
                        {t("settings.emailChange.changeButton")}
                      </button>
                    )}
                  </div>
                  {showEmailChangeForm && (
                    <div className="ll-u-0045 ll-u-0059 ll-u-0152 ll-u-0167">
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
                              className="ll-u-0052 ll-u-0057 ll-u-0276 ll-u-0286 ll-u-0310 ll-u-0499"
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
                              className="ll-u-0111 ll-u-0190 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0317 ll-u-0345 ll-u-0337 ll-u-0371 ll-u-0393 ll-u-0460 ll-u-0473 ll-u-0505 ll-u-0522"
                            />
                          </div>
                          <div className="ll-u-0059 ll-u-0165">
                            <button
                              type="button"
                              onClick={handleEmailChangeClose}
                              disabled={isChangingEmail}
                              className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0182 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0337 ll-u-0357 ll-u-0359 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0473 ll-u-0505 ll-u-0512 ll-u-0518"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleEmailChangeSubmit()}
                              disabled={isChangingEmail || !newEmail.trim()}
                              className="ll-u-0063 ll-u-0129 ll-u-0156 ll-u-0159 ll-u-0182 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0312 ll-u-0337 ll-u-0367 ll-u-0391 ll-u-0392 ll-u-0480 ll-u-0501"
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
                          className="ll-u-0276 ll-u-0310 ll-u-0320 ll-u-0365 ll-u-0499 ll-u-0520"
                        >
                          {t("common.close")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="ll-u-0060 ll-u-0166">
                  <button
                    type="button"
                    onClick={() => setShowSignOutConfirm(true)}
                    disabled={actionsDisabled}
                    className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0182 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0240 ll-u-0246 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0330 ll-u-0337 ll-u-0357 ll-u-0359 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0386 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0473 ll-u-0505 ll-u-0512 ll-u-0518 ll-u-0527"
                  >
                    {signOutLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={actionsDisabled}
                    className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0182 ll-u-0193 ll-u-0204 ll-u-0221 ll-u-0240 ll-u-0246 ll-u-0274 ll-u-0287 ll-u-0314 ll-u-0330 ll-u-0337 ll-u-0363 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0389 ll-u-0391 ll-u-0393 ll-u-0464 ll-u-0483 ll-u-0502 ll-u-0517 ll-u-0530"
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

type LicensesViewProps = {
  onBack?: () => void;
  showBackButton?: boolean;
};

function LicenseCard({ entry }: { entry: LicenseEntry }) {
  const sourceUrl = entry.repository ?? entry.source;

  return (
    <details className="ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0240 ll-u-0246 ll-u-0460 ll-u-0485">
      <summary className="ll-u-0143 ll-u-0150">
        <div className="ll-u-0059 ll-u-0157 ll-u-0158 ll-u-0167">
          <div className="ll-u-0125">
            <p className="ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0505">
              {entry.name}
            </p>
            <p className="ll-u-0043 ll-u-0276 ll-u-0310 ll-u-0499">
              {[entry.version, entry.license].filter(Boolean).join(" / ")}
            </p>
          </div>
          <span className="ll-u-0042 ll-u-0274 ll-u-0310 ll-u-0499">&gt;</span>
        </div>
      </summary>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ll-u-0045 ll-u-0063 ll-u-0276 ll-u-0310 ll-u-0320 ll-u-0365 ll-u-0499 ll-u-0520"
        >
          {sourceUrl}
        </a>
      ) : null}
      <pre className="ll-u-0045 ll-u-0177 ll-u-0296 ll-u-0293 ll-u-0189 ll-u-0210 ll-u-0232 ll-u-0276 ll-u-0280 ll-u-0317 ll-u-0473 ll-u-0505">
        {entry.licenseText ?? entry.text ?? ""}
      </pre>
    </details>
  );
}

function LicensesView({ onBack, showBackButton = false }: LicensesViewProps) {
  const { t } = useTranslation();
  const [payload, setPayload] = useState<LicensePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}licenses/licenses.json`,
        );
        if (!response.ok) {
          throw new Error("Failed to load licenses");
        }
        const nextPayload = (await response.json()) as LicensePayload;
        if (!cancelled) {
          setPayload(nextPayload);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("settings.licenses.loadError"));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="ll-u-0087 ll-u-0111 ll-u-0210 ll-u-0317 ll-u-0473 ll-u-0505">
      <div className="ll-u-0041 ll-u-0059 ll-u-0111 ll-u-0114 ll-u-0152 ll-u-0168 ll-u-0240 ll-u-0262 ll-u-0254 ll-u-0434 ll-u-0456">
        <header className="ll-u-0059 ll-u-0156 ll-u-0167 ll-u-0237">
          {showBackButton ? (
            <button
              type="button"
              onClick={onBack}
              title={t("common.back")}
              aria-label={t("common.back")}
              className="ll-u-0063 ll-u-0074 ll-u-0101 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0310 ll-u-0337 ll-u-0361 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0386 ll-u-0499 ll-u-0518 ll-u-0527"
            >
              <AppIcon
                name="arrow-back"
                className="ll-u-0069 ll-u-0096"
                aria-hidden="true"
                focusable="false"
              />
            </button>
          ) : null}
          <h1 className="ll-u-0536 ll-u-0125 ll-u-0129 ll-u-0270 ll-u-0287 ll-u-0291">
            {t("settings.licenses.title")}
          </h1>
        </header>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {!payload && !error ? <Spinner /> : null}

        {payload ? (
          <>
            <SettingsSection>
              <div className="ll-u-0059 ll-u-0152 ll-u-0167">
                <h2 className="ll-u-0274 ll-u-0287 ll-u-0292 ll-u-0317 ll-u-0505">
                  {t("settings.licenses.openSource")}
                </h2>
                <div className="ll-u-0059 ll-u-0152 ll-u-0167">
                  {payload.openSourceLicenses.map((entry) => (
                    <LicenseCard
                      key={`${entry.name}-${entry.version ?? ""}`}
                      entry={entry}
                    />
                  ))}
                </div>
              </div>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-u-0059 ll-u-0152 ll-u-0167">
                <h2 className="ll-u-0274 ll-u-0287 ll-u-0292 ll-u-0317 ll-u-0505">
                  {t("settings.licenses.bundledAssets")}
                </h2>
                <div className="ll-u-0059 ll-u-0152 ll-u-0167">
                  {payload.bundledLicenses.map((entry) => (
                    <LicenseCard key={entry.id ?? entry.name} entry={entry} />
                  ))}
                </div>
              </div>
            </SettingsSection>
          </>
        ) : null}
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
    <div className="ll-u-0059 ll-u-0086 ll-u-0111 ll-u-0152 ll-u-0156 ll-u-0159 ll-u-0223 ll-u-0233 ll-u-0317 ll-u-0473 ll-u-0505">
      <div className="ll-u-0111 ll-u-0123 ll-u-0169 ll-u-0265">
        <div className="ll-u-0041 ll-u-0059 ll-u-0075 ll-u-0102 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0217 ll-u-0478">
          <AppIcon
            name="alert-circle"
            className="ll-u-0070 ll-u-0097 ll-u-0309 ll-u-0498"
          />
        </div>
        <h1 className="ll-u-0536 ll-u-0273 ll-u-0287">
          {t("pages.notFound.title")}
        </h1>
        <p className="ll-u-0274 ll-u-0310 ll-u-0499">
          {t("pages.notFound.description")}
        </p>
        <a
          href="/"
          className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0189 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0286 ll-u-0312 ll-u-0367 ll-u-0381 ll-u-0373 ll-u-0375 ll-u-0376 ll-u-0480 ll-u-0501 ll-u-0521"
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
    <div className="ll-u-0059 ll-u-0086 ll-u-0111 ll-u-0152 ll-u-0156 ll-u-0159 ll-u-0223 ll-u-0233 ll-u-0317 ll-u-0473 ll-u-0505">
      <div className="ll-u-0111 ll-u-0123 ll-u-0169 ll-u-0265">
        <div className="ll-u-0041 ll-u-0059 ll-u-0075 ll-u-0102 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0222 ll-u-0482">
          <AppIcon
            name="alert-circle"
            className="ll-u-0070 ll-u-0097 ll-u-0313 ll-u-0503"
          />
        </div>
        <h1 className="ll-u-0536 ll-u-0273 ll-u-0287">
          {t("pages.serverError.title")}
        </h1>
        <p className="ll-u-0274 ll-u-0310 ll-u-0499">
          {t("pages.serverError.description")}
        </p>
        <a
          href="/"
          className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0189 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0286 ll-u-0312 ll-u-0367 ll-u-0381 ll-u-0373 ll-u-0375 ll-u-0376 ll-u-0480 ll-u-0501 ll-u-0521"
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

const parseTaskDate = (dateStr: string | null | undefined): Date | null =>
  parseTaskDateValue(dateStr ?? undefined) ?? null;

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

type AppView = "taskLists" | "detail" | "settings" | "licenses" | "calendar";

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
const SETTINGS_LICENSES_ROUTE = "/settings/licenses";
const CALENDAR_ROUTE = "/calendar";

type KnownAppHashRoute =
  | { view: "taskLists" | "settings" | "licenses" | "calendar" }
  | { view: "detail"; taskListId: string };
type AppHashRoute = KnownAppHashRoute | { view: "unknown" };

const parseAppHashRoute = (hash: string): AppHashRoute => {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash) return { view: "unknown" };
  if (normalizedHash === TASK_LISTS_ROUTE) return { view: "taskLists" };
  if (normalizedHash === SETTINGS_LICENSES_ROUTE) return { view: "licenses" };
  if (normalizedHash === SETTINGS_ROUTE) return { view: "settings" };
  if (normalizedHash === CALENDAR_ROUTE) return { view: "calendar" };

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
    <header className="ll-u-0059 ll-u-0156 ll-u-0237 ll-u-0243">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        title={backLabel}
        className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0181 ll-u-0232 ll-u-0317 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0460 ll-u-0505 ll-u-0529"
      >
        <AppIcon
          className="ll-u-0070 ll-u-0097"
          name="arrow-back"
          aria-hidden="true"
          focusable="false"
        />
        <span className="ll-u-0005">{backLabel}</span>
      </button>
    </header>
  );
}

const Drawer = DrawerPrimitive.Root;
const DrawerPortal = DrawerPrimitive.Portal;

const DrawerOverlay = forwardRef<
  ElementRef<typeof DrawerPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(function DrawerOverlay({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={clsx(
        "ll-u-0007 ll-u-0011 ll-u-0034 ll-u-0212 ll-u-0336",
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
          "ll-u-0007 ll-u-0013 ll-u-0035 ll-u-0111 ll-u-0119 ll-u-0345",
          className,
        )}
        style={{ insetInlineStart: 0, ...style }}
        {...props}
      >
        <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0168 ll-u-0178 ll-u-0223 ll-u-0233 ll-u-0317 ll-u-0326 ll-u-0485 ll-u-0505">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("ll-u-0059 ll-u-0152 ll-u-0167 ll-u-0267", className)}
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
    <div className={clsx("ll-u-0008 ll-u-0111 ll-u-0176", className)}>
      {showIndicators && count > 0 ? (
        <nav
          aria-label={ariaLabel}
          className={clsx(
            indicatorInFlow
              ? "ll-u-0059 ll-u-0159 ll-u-0162"
              : "ll-u-0002 ll-u-0006 ll-u-0025 ll-u-0020 ll-u-0031 ll-u-0059 ll-u-0159 ll-u-0162",
            indicatorInFlow
              ? indicatorPosition === "top"
                ? "ll-u-0053"
                : "ll-u-0044"
              : indicatorPosition === "top"
                ? "ll-u-0018"
                : "ll-u-0024",
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
                "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0230 ll-u-0338",
                !indicatorInFlow && "ll-u-0001",
                "ll-u-0362 ll-u-0516",
              )}
              aria-label={
                getIndicatorLabel?.(idx, count) ?? `Go to slide ${idx + 1}`
              }
              aria-current={idx === currentIndex ? "true" : undefined}
            >
              <span
                className={clsx(
                  "ll-u-0065 ll-u-0091 ll-u-0188 ll-u-0338",
                  idx === currentIndex
                    ? "ll-u-0139 ll-u-0219 ll-u-0480"
                    : "ll-u-0220 ll-u-0481",
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
          "ll-u-0059 ll-u-0080 ll-u-0111 ll-u-0146 ll-u-0147 no-scrollbar ll-u-0180",
          scrollEnabled ? "ll-u-0177 ll-u-0179" : "ll-u-0176",
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
            className="ll-u-0080 ll-u-0111 ll-u-0130 ll-u-0148 ll-u-0149"
            aria-hidden={idx !== currentIndex}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

const moveItemBeforeTarget = <T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
): T[] | null => {
  const oldIndex = items.findIndex((item) => item.id === draggedId);
  const newIndex = items.findIndex((item) => item.id === targetId);
  if (oldIndex === -1 || newIndex === -1) return null;
  const result = items.slice();
  const [removed] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, removed);
  return result;
};

const reconcileOptimisticItems = <T extends { id: string }>(
  optimisticItems: T[],
  latestItems: T[],
): T[] | null => {
  if (optimisticItems.length !== latestItems.length) return null;

  const latestItemsById = new Map(
    latestItems.map((item) => [item.id, item] as const),
  );
  const mergedItems = optimisticItems.map((item) =>
    latestItemsById.get(item.id),
  );
  if (mergedItems.some((item) => item === undefined)) return null;

  const nextItems = mergedItems as T[];
  return nextItems.every((item, index) => item.id === latestItems[index]?.id)
    ? null
    : nextItems;
};
const useOptimisticReorder = <T extends { id: string }>(
  initialItems: T[],
  onReorder: (draggedId: string, targetId: string) => Promise<void>,
  { suspendExternalSync = false }: { suspendExternalSync?: boolean } = {},
) => {
  const [optimisticItems, setOptimisticItems] = useState<T[] | null>(null);
  const items = optimisticItems ?? initialItems;

  useEffect(() => {
    if (suspendExternalSync || !optimisticItems) return;

    const nextOptimisticItems = reconcileOptimisticItems(
      optimisticItems,
      initialItems,
    );
    if (nextOptimisticItems === null) {
      setOptimisticItems(null);
      return;
    }
    if (
      nextOptimisticItems.some((item, index) => item !== optimisticItems[index])
    ) {
      setOptimisticItems(nextOptimisticItems);
    }
  }, [initialItems, optimisticItems, suspendExternalSync]);

  const reorder = useCallback(
    async (draggedId: string, targetId: string) => {
      if (!draggedId || !targetId || draggedId === targetId) return;
      setOptimisticItems((currentItems) => {
        const sourceItems = currentItems ?? initialItems;
        return (
          moveItemBeforeTarget(sourceItems, draggedId, targetId) ?? sourceItems
        );
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
      className={clsx("ll-u-0230", className)}
      locale={resolvedLocale}
      classNames={{
        months: "ll-u-0059 ll-u-0152",
        month: "ll-u-0169",
        month_caption: "ll-u-0008 ll-u-0059 ll-u-0156 ll-u-0159 ll-u-0251",
        caption_label: "ll-u-0274 ll-u-0287",
        nav: "ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0170",
        button_previous:
          "ll-u-0072 ll-u-0099 ll-u-0189 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0228 ll-u-0310 ll-u-0359 ll-u-0365 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0392 ll-u-0460 ll-u-0485 ll-u-0499 ll-u-0514 ll-u-0520 ll-u-0529",
        button_next:
          "ll-u-0072 ll-u-0099 ll-u-0189 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0228 ll-u-0310 ll-u-0359 ll-u-0365 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0392 ll-u-0460 ll-u-0485 ll-u-0499 ll-u-0514 ll-u-0520 ll-u-0529",
        month_grid: "ll-u-0111",
        weekdays: "ll-u-0059",
        weekday: "ll-u-0100 ll-u-0277 ll-u-0286 ll-u-0311 ll-u-0500",
        week: "ll-u-0044 ll-u-0059 ll-u-0111",
        day: "ll-u-0008 ll-u-0073 ll-u-0100 ll-u-0228 ll-u-0265 ll-u-0274",
        day_button:
          "ll-u-0073 ll-u-0100 ll-u-0189 ll-u-0228 ll-u-0286 ll-u-0317 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0396 ll-u-0397 ll-u-0505 ll-u-0529 ll-u-0532 ll-u-0533",
        selected: "ll-u-0189 ll-u-0214 ll-u-0484",
        today: "ll-u-0193 ll-u-0200 ll-u-0460",
        outside: "ll-u-0311 ll-u-0323 ll-u-0500",
        disabled: "ll-u-0311 ll-u-0323 ll-u-0500",
        hidden: "ll-u-0003",
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

function TaskItemComponent({
  task,
  isEditing,
  editingText,
  onEditingTextChange,
  onEditStart,
  onEditEnd,
  onToggle,
  onOpenTaskActions,
  onDragInteractionChange,
}: {
  task: Task;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task, text?: string) => void;
  onToggle: (task: Task) => void;
  onOpenTaskActions?: (task: Task, trigger: HTMLButtonElement | null) => void;
  onDragInteractionChange?: (active: boolean) => void;
}) {
  const completedTaskOpacity = 0.5;
  const { t, i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const rowOpacity =
    (isDragging ? 0.5 : 1) * (task.completed ? completedTaskOpacity : 1);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: rowOpacity,
  };
  const [isHandlePointerDown, setIsHandlePointerDown] = useState(false);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const pinLabel = task.pinned
    ? t("pages.tasklist.unpinTask")
    : t("pages.tasklist.pinTask");

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
    <div
      ref={setNodeRef}
      style={style}
      className="ll-u-0059 ll-u-0165 ll-u-0244"
    >
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
        className="ll-u-0059 ll-u-0144 ll-u-0156 ll-u-0311 ll-u-0382 ll-u-0383 ll-u-0384"
      >
        <span className="ll-u-0008 ll-u-0021">
          <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
        </span>
      </button>
      <div className="ll-u-0008 ll-u-0059 ll-u-0156 ll-u-0159">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          aria-labelledby={taskTextId}
          className="ll-u-0347 ll-u-0006 ll-u-0011 ll-u-0029 ll-u-0080 ll-u-0111 ll-u-0143 ll-u-0322"
        />
        <div className="ll-u-0059 ll-u-0069 ll-u-0096 ll-u-0156 ll-u-0159 ll-u-0188 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0339 ll-u-0346 ll-u-0348 ll-u-0350 ll-u-0351 ll-u-0460 ll-u-0485 ll-u-0510">
          <svg
            className="ll-u-0067 ll-u-0093 ll-u-0316 ll-u-0322 ll-u-0340 ll-u-0349 ll-u-0504"
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
      <div className="ll-u-0008 ll-u-0059 ll-u-0125 ll-u-0129 ll-u-0152">
        {dateDisplayValue ? (
          <span
            className="ll-u-0006 ll-u-0014 ll-u-0276 ll-u-0284 ll-u-0310 ll-u-0499"
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
              "ll-u-0125 ll-u-0111 ll-u-0225 ll-u-0228 ll-u-0286 ll-u-0282 ll-u-0381",
              task.completed
                ? "ll-u-0310 ll-u-0319 ll-u-0499"
                : "ll-u-0317 ll-u-0505",
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
                ? "ll-u-0057 ll-u-0083 ll-u-0125 ll-u-0143 ll-u-0267 ll-u-0286 ll-u-0282 ll-u-0310 ll-u-0319 ll-u-0321 ll-u-0366 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0499 ll-u-0529"
                : clsx(
                    "ll-u-0057 ll-u-0083 ll-u-0125 ll-u-0143 ll-u-0267 ll-u-0282 ll-u-0317 ll-u-0321 ll-u-0366 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0505 ll-u-0529",
                    task.pinned ? "ll-u-0287" : "ll-u-0286",
                  )
            }
          >
            {task.text}
          </span>
        )}
      </div>
      <button
        ref={actionButtonRef}
        type="button"
        aria-label={dateTitle}
        title={dateTitle}
        onClick={() => onOpenTaskActions?.(task, actionButtonRef.current)}
        className="ll-u-0059 ll-u-0156 ll-u-0189 ll-u-0229 ll-u-0311 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0529"
      >
        <span className="ll-u-0008 ll-u-0063">
          <AppIcon
            name={task.pinned ? "push-pin" : "calendar-today"}
            aria-hidden="true"
            focusable="false"
          />
        </span>
        <span className="ll-u-0005">{pinLabel}</span>
      </button>
    </div>
  );
}

const TaskItem = memo(TaskItemComponent);

function TaskListCard({
  taskList,
  autoSort,
  taskInsertPosition,
  isActive,
  onActivate,
  sensorsList,
  onSortingChange,
  onDragInteractionChange,
  onDeleted,
  activeTaskActionTaskId,
  onOpenTaskAction,
  onCloseTaskAction,
}: {
  taskList: TaskList;
  autoSort: boolean;
  taskInsertPosition: TaskInsertPosition;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  sensorsList: SensorDescriptor<SensorOptions>[];
  onSortingChange?: (sorting: boolean) => void;
  onDragInteractionChange?: (active: boolean) => void;
  onDeleted?: () => void;
  activeTaskActionTaskId?: string | null;
  onOpenTaskAction?: (taskListId: string, taskId: string) => void;
  onCloseTaskAction?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const reactId = useId();
  const resolvedTaskSettings = useMemo<ResolvedTaskSettings>(
    () => ({
      autoSort,
      language: normalizeLanguage(i18n.language),
      taskInsertPosition,
    }),
    [autoSort, i18n.language, taskInsertPosition],
  );
  const [taskError, setTaskError] = useState<string | null>(null);
  const [pendingTasks, setPendingTasks] = useState<Task[] | null>(null);
  const baseTasks = pendingTasks ?? taskList.tasks;
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    baseTasks,
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
  const taskActionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousTaskActionTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showShareDialog) return;
    setShareCode(taskList.shareCode ?? null);
  }, [taskList.shareCode, showShareDialog]);

  const normalizePendingTasks = useCallback(
    (nextTasks: Task[]): Task[] => {
      const normalizedTasks = nextTasks.map((task, index) => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        date: task.date,
        order: index + 1,
        pinned: task.pinned,
      }));
      const sortedTasks = autoSort
        ? getAutoSortedTasks(normalizedTasks)
        : getDisplayOrderedTasks({
            tasks: Object.fromEntries(
              normalizedTasks.map(
                (task) => [task.id, task] satisfies [string, TaskListStoreTask],
              ),
            ),
          });
      return sortedTasks.map((task) => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        date: task.date,
        pinned: task.pinned,
      }));
    },
    [autoSort],
  );

  useEffect(() => {
    if (!pendingTasks) return;
    if (areTasksEqual(pendingTasks, normalizePendingTasks(taskList.tasks))) {
      setPendingTasks(null);
    }
  }, [normalizePendingTasks, pendingTasks, taskList.tasks]);

  useEffect(() => {
    if (isActive) return;
    onDragInteractionChange?.(false);
  }, [isActive, onDragInteractionChange]);

  const applyPendingTasks = useCallback(
    (buildNextTasks: (currentTasks: Task[]) => Task[]) => {
      setPendingTasks(normalizePendingTasks(buildNextTasks(tasks)));
    },
    [normalizePendingTasks, tasks],
  );

  const runTaskMutation = useCallback(
    async ({
      buildNextTasks,
      commit,
      onSuccess,
      onError,
    }: {
      buildNextTasks: (currentTasks: Task[]) => Task[];
      commit: () => Promise<void>;
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    }) => {
      setTaskError(null);
      applyPendingTasks(buildNextTasks);
      try {
        await commit();
        onSuccess?.();
      } catch (error) {
        setPendingTasks(null);
        onError?.(error);
      }
    },
    [applyPendingTasks],
  );

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
    "ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0218 ll-u-0239 ll-u-0244 ll-u-0317 ll-u-0371 ll-u-0381 ll-u-0373 ll-u-0374 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0479 ll-u-0505 ll-u-0522 ll-u-0524";
  const primaryButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0287 ll-u-0312 ll-u-0367 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0392 ll-u-0480 ll-u-0501 ll-u-0529";
  const secondaryButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0075 ll-u-0102 ll-u-0191 ll-u-0200 ll-u-0287 ll-u-0317 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0505 ll-u-0529";
  const destructiveButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0216 ll-u-0240 ll-u-0244 ll-u-0287 ll-u-0318 ll-u-0367 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0387 ll-u-0391 ll-u-0392 ll-u-0477 ll-u-0528";
  const iconButtonClass = clsx(secondaryButtonClass, "ll-u-0238");
  const activeTaskActionTask =
    activeTaskActionTaskId === null || activeTaskActionTaskId === undefined
      ? null
      : (tasks.find((task) => task.id === activeTaskActionTaskId) ?? null);
  useEffect(() => {
    const previousTaskActionTaskId = previousTaskActionTaskIdRef.current;
    previousTaskActionTaskIdRef.current = activeTaskActionTaskId ?? null;
    if (
      previousTaskActionTaskId !== null &&
      (activeTaskActionTaskId === null || activeTaskActionTaskId === undefined)
    ) {
      if (typeof window === "undefined") {
        taskActionTriggerRef.current = null;
        return;
      }
      window.requestAnimationFrame(() => {
        taskActionTriggerRef.current?.focus();
        taskActionTriggerRef.current = null;
      });
    }
  }, [activeTaskActionTaskId]);

  return (
    <section
      className={clsx(
        "ll-u-0080 ll-u-0178",
        isActive ? "ll-u-0001" : "ll-u-0002",
      )}
      style={{ backgroundColor: taskList.background ?? undefined }}
    >
      <div className="ll-u-0087 ll-u-0240">
        <div className="ll-u-0059 ll-u-0152 ll-u-0168">
          <div className="ll-u-0059 ll-u-0152 ll-u-0168">
            <div className="ll-u-0059 ll-u-0152 ll-u-0168">
              <div className="ll-u-0059 ll-u-0155 ll-u-0156 ll-u-0158 ll-u-0167">
                <div className="ll-u-0059 ll-u-0152 ll-u-0164">
                  <h2 className="ll-u-0536 ll-u-0040 ll-u-0275 ll-u-0287">
                    {taskList.name}
                  </h2>
                </div>
                <div className="ll-u-0008 ll-u-0027 ll-u-0059 ll-u-0155 ll-u-0160">
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
                        <span className="ll-u-0005">
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
                        <div className="ll-u-0046 ll-u-0059 ll-u-0152 ll-u-0167">
                          {editError ? (
                            <Alert variant="error">{editError}</Alert>
                          ) : null}
                          <label className="ll-u-0059 ll-u-0152 ll-u-0163">
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
                          <div className="ll-u-0059 ll-u-0152 ll-u-0165">
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
                              "ll-u-0048 ll-u-0111",
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
                        <span className="ll-u-0005">{t("taskList.share")}</span>
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
                        <div className="ll-u-0046 ll-u-0059 ll-u-0152 ll-u-0167">
                          <label className="ll-u-0059 ll-u-0152 ll-u-0164">
                            <span>{t("taskList.shareCode")}</span>
                            <div className="ll-u-0059 ll-u-0155 ll-u-0165">
                              <input
                                type="text"
                                value={shareCode}
                                readOnly
                                className={clsx(inputClass, "ll-u-0268")}
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
                        <div className="ll-u-0046 ll-u-0059 ll-u-0152 ll-u-0167">
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
              className="ll-u-0059 ll-u-0156"
              onSubmit={(event) => {
                event.preventDefault();
                if (newTaskText.trim() === "") return;
                const parsed = resolveTaskInput(
                  newTaskText.trim(),
                  normalizeLanguage(i18n.language),
                );
                setHistoryOpen(false);
                newTaskInputRef.current?.focus();
                const nextTaskId = crypto.randomUUID();
                const optimisticTask = {
                  id: nextTaskId,
                  text: parsed.text,
                  completed: false,
                  date: parsed.date,
                  pinned: parsed.pinned,
                } satisfies Task;
                void runTaskMutation({
                  buildNextTasks: (currentTasks) =>
                    taskInsertPosition === "top"
                      ? [optimisticTask, ...currentTasks]
                      : [...currentTasks, optimisticTask],
                  commit: () =>
                    addTask(
                      taskList.id,
                      newTaskText.trim(),
                      resolvedTaskSettings,
                      {
                        taskId: nextTaskId,
                      },
                    ),
                  onSuccess: () => {
                    setNewTaskText("");
                    setAddTaskError(null);
                    logTaskAdd({ has_date: Boolean(parsed.date) });
                  },
                  onError: (error) => {
                    setAddTaskError(
                      resolveErrorMessage(error, t, "common.error"),
                    );
                  },
                });
              }}
            >
              <div className="ll-u-0008 ll-u-0125 ll-u-0129">
                <CommandPrimitive shouldFilter={false} className="ll-u-0225">
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
                    className="ll-u-0111 ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0218 ll-u-0239 ll-u-0244 ll-u-0317 ll-u-0330 ll-u-0371 ll-u-0381 ll-u-0373 ll-u-0374 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0479 ll-u-0505 ll-u-0522 ll-u-0524"
                  />
                  {historyOpen && historyOptions.length > 0 ? (
                    <CommandPrimitive.List
                      id={historyListId}
                      className="ll-u-0006 ll-u-0025 ll-u-0020 ll-u-0019 ll-u-0033 ll-u-0043 ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0229 ll-u-0329 ll-u-0460 ll-u-0485"
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
                            const parsed = resolveTaskInput(
                              text,
                              normalizeLanguage(i18n.language),
                            );
                            const optimisticTask = {
                              id: crypto.randomUUID(),
                              text: parsed.text,
                              completed: false,
                              date: parsed.date,
                              pinned: parsed.pinned,
                            } satisfies Task;
                            void runTaskMutation({
                              buildNextTasks: (currentTasks) =>
                                taskInsertPosition === "top"
                                  ? [optimisticTask, ...currentTasks]
                                  : [...currentTasks, optimisticTask],
                              commit: () =>
                                addTask(
                                  taskList.id,
                                  text,
                                  resolvedTaskSettings,
                                  {
                                    taskId: optimisticTask.id,
                                  },
                                ),
                              onSuccess: () => {
                                setNewTaskText("");
                                logTaskAdd({ has_date: Boolean(parsed.date) });
                              },
                              onError: (error) => {
                                setAddTaskError(
                                  resolveErrorMessage(error, t, "common.error"),
                                );
                              },
                            });
                          }}
                          className="ll-u-0143 ll-u-0189 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0345 ll-u-0398 ll-u-0534"
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
                  "ll-u-0063 ll-u-0074 ll-u-0131 ll-u-0156 ll-u-0159 ll-u-0176 ll-u-0191 ll-u-0311 ll-u-0338 ll-u-0342 ll-u-0343 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0505 ll-u-0529 ll-u-0531",
                  isInputFocused
                    ? "ll-u-0056 ll-u-0099 ll-u-0001 ll-u-0325"
                    : "ll-u-0055 ll-u-0089 ll-u-0002 ll-u-0322",
                )}
              >
                <span className="ll-u-0005">{t("common.add")}</span>
                <span className="ll-u-0008 ll-u-0028">
                  <AppIcon name="send" aria-hidden="true" focusable="false" />
                </span>
              </button>
            </form>
            {addTaskError ? (
              <Alert variant="error">{addTaskError}</Alert>
            ) : null}
            <div className="ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0165 ll-u-0261">
              <button
                type="button"
                disabled={tasks.length < 2}
                onClick={() => {
                  void runTaskMutation({
                    buildNextTasks: (currentTasks) => currentTasks,
                    commit: () => sortTasks(taskList.id),
                    onSuccess: () => logTaskSort(),
                    onError: (error) => {
                      setTaskError(
                        resolveErrorMessage(error, t, "common.error"),
                      );
                    },
                  });
                }}
                className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0286 ll-u-0310 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0505 ll-u-0529"
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
                  await runTaskMutation({
                    buildNextTasks: (currentTasks) =>
                      currentTasks.filter((task) => !task.completed),
                    commit: () =>
                      deleteCompletedTasks(taskList.id, resolvedTaskSettings),
                    onSuccess: () =>
                      logTaskDeleteCompleted({ count: completedTaskCount }),
                    onError: (error) => {
                      setTaskError(
                        resolveErrorMessage(error, t, "common.error"),
                      );
                    },
                  }).finally(() => setDeleteCompletedPending(false));
                }}
                className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0286 ll-u-0310 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0387 ll-u-0391 ll-u-0393 ll-u-0505 ll-u-0528"
              >
                {deleteCompletedPending
                  ? t("common.deleting")
                  : t("pages.tasklist.deleteCompleted")}
                <span className="ll-u-0257">
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
              const draggedTask = tasks.find(
                (task) => task.id === draggedTaskId,
              );
              const targetTask = tasks.find((task) => task.id === targetTaskId);
              if (
                !draggedTask ||
                !targetTask ||
                getTaskDisplayGroup(draggedTask) !==
                  getTaskDisplayGroup(targetTask)
              ) {
                return;
              }
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
                <p className="ll-u-0310 ll-u-0499">
                  {t("pages.tasklist.noTasks")}
                </p>
              ) : (
                <div className="ll-u-0059 ll-u-0152 ll-u-0163">
                  {tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isEditing={editingTaskId === task.id}
                      editingText={
                        editingTaskId === task.id ? editingTaskText : ""
                      }
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
                        const resolved = resolveTaskInput(
                          currentText,
                          normalizeLanguage(i18n.language),
                          task,
                        );
                        void runTaskMutation({
                          buildNextTasks: (currentTasks) =>
                            currentTasks.map((currentTask) =>
                              currentTask.id === task.id
                                ? {
                                    ...currentTask,
                                    text: resolved.text,
                                    date: resolved.date,
                                    pinned: resolved.pinnedChanged
                                      ? resolved.pinned
                                      : currentTask.pinned,
                                  }
                                : currentTask,
                            ),
                          commit: () =>
                            updateTask(
                              taskList.id,
                              task.id,
                              { text: currentText },
                              resolvedTaskSettings,
                            ),
                          onSuccess: () => {
                            setEditingTaskId(null);
                            const fields = ["text", "date"];
                            if (resolved.pinnedChanged) fields.push("pinned");
                            logTaskUpdate({ fields: fields.join(",") });
                          },
                          onError: (error) => {
                            setTaskError(
                              resolveErrorMessage(error, t, "common.error"),
                            );
                          },
                        });
                      }}
                      onDragInteractionChange={(active) => {
                        if (!isActive) {
                          onDragInteractionChange?.(false);
                          return;
                        }
                        onDragInteractionChange?.(active);
                      }}
                      onToggle={(task) => {
                        void runTaskMutation({
                          buildNextTasks: (currentTasks) =>
                            currentTasks.map((currentTask) =>
                              currentTask.id === task.id
                                ? {
                                    ...currentTask,
                                    completed: !task.completed,
                                  }
                                : currentTask,
                            ),
                          commit: () =>
                            updateTask(
                              taskList.id,
                              task.id,
                              { completed: !task.completed },
                              resolvedTaskSettings,
                            ),
                          onSuccess: () =>
                            logTaskUpdate({ fields: "completed" }),
                          onError: (error) => {
                            setTaskError(
                              resolveErrorMessage(error, t, "common.error"),
                            );
                          },
                        });
                      }}
                      onOpenTaskActions={(task, trigger) => {
                        onActivate?.(taskList.id);
                        taskActionTriggerRef.current = trigger;
                        onOpenTaskAction?.(taskList.id, task.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>
      <Dialog
        open={isActive && activeTaskActionTask !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            onCloseTaskAction?.();
          }
        }}
      >
        {activeTaskActionTask ? (
          <ActionSheetContent
            title={t("pages.tasklist.setDate")}
            description={[
              activeTaskActionTask.pinned
                ? t("pages.tasklist.unpinTask")
                : t("pages.tasklist.pinTask"),
              activeTaskActionTask.date
                ? `${t("pages.tasklist.setDate")}: ${new Intl.DateTimeFormat(
                    i18n.language,
                    {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                    },
                  ).format(
                    parseTaskDateValue(activeTaskActionTask.date) ?? new Date(),
                  )}`
                : t("pages.tasklist.clearDate"),
            ].join(" / ")}
          >
            <div className="ll-u-0059 ll-u-0082 ll-u-0129 ll-u-0152 ll-u-0168 ll-u-0252">
              <button
                type="button"
                aria-pressed={activeTaskActionTask.pinned}
                aria-label={
                  activeTaskActionTask.pinned
                    ? t("pages.tasklist.unpinTask")
                    : t("pages.tasklist.pinTask")
                }
                onClick={() => {
                  void runTaskMutation({
                    buildNextTasks: (currentTasks) =>
                      currentTasks.map((task) =>
                        task.id === activeTaskActionTask.id
                          ? {
                              ...task,
                              pinned: !activeTaskActionTask.pinned,
                            }
                          : task,
                      ),
                    commit: () =>
                      updateTask(
                        taskList.id,
                        activeTaskActionTask.id,
                        { pinned: !activeTaskActionTask.pinned },
                        resolvedTaskSettings,
                      ),
                    onSuccess: () => {
                      logTaskUpdate({ fields: "pinned" });
                      onCloseTaskAction?.();
                    },
                    onError: (error) => {
                      setTaskError(
                        resolveErrorMessage(error, t, "common.error"),
                      );
                    },
                  });
                }}
                className="ll-u-0059 ll-u-0085 ll-u-0111 ll-u-0156 ll-u-0158 ll-u-0182 ll-u-0193 ll-u-0200 ll-u-0210 ll-u-0240 ll-u-0246 ll-u-0267 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0460 ll-u-0473 ll-u-0505 ll-u-0529"
              >
                <span className="ll-u-0059 ll-u-0156 ll-u-0167">
                  <AppIcon
                    name="push-pin"
                    size={18}
                    aria-hidden="true"
                    focusable="false"
                  />
                  {activeTaskActionTask.pinned
                    ? t("pages.tasklist.unpinTask")
                    : t("pages.tasklist.pinTask")}
                </span>
                <span className="ll-u-0276 ll-u-0310 ll-u-0499">
                  {activeTaskActionTask.pinned ? t("common.done") : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void runTaskMutation({
                    buildNextTasks: (currentTasks) =>
                      currentTasks.map((task) =>
                        task.id === activeTaskActionTask.id
                          ? { ...task, date: "" }
                          : task,
                      ),
                    commit: () =>
                      updateTask(
                        taskList.id,
                        activeTaskActionTask.id,
                        { date: "" },
                        resolvedTaskSettings,
                      ),
                    onSuccess: () => {
                      logTaskUpdate({ fields: "date" });
                      onCloseTaskAction?.();
                    },
                    onError: (error) => {
                      setTaskError(
                        resolveErrorMessage(error, t, "common.error"),
                      );
                    },
                  });
                }}
                className="ll-u-0063 ll-u-0084 ll-u-0110 ll-u-0156 ll-u-0173 ll-u-0191 ll-u-0274 ll-u-0287 ll-u-0310 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0387 ll-u-0499"
              >
                {t("pages.tasklist.clearDate")}
              </button>
              <div className="ll-u-0082 ll-u-0129 ll-u-0178 ll-u-0185 ll-u-0193 ll-u-0200 ll-u-0210 ll-u-0232 ll-u-0460 ll-u-0473">
                <Calendar
                  mode="single"
                  selected={parseTaskDateValue(activeTaskActionTask.date)}
                  onSelect={(next) => {
                    const nextDate = next ? formatTaskDateValue(next) : "";
                    void runTaskMutation({
                      buildNextTasks: (currentTasks) =>
                        currentTasks.map((task) =>
                          task.id === activeTaskActionTask.id
                            ? {
                                ...task,
                                date: nextDate,
                              }
                            : task,
                        ),
                      commit: () =>
                        updateTask(
                          taskList.id,
                          activeTaskActionTask.id,
                          { date: nextDate },
                          resolvedTaskSettings,
                        ),
                      onSuccess: () => {
                        logTaskUpdate({ fields: "date" });
                        onCloseTaskAction?.();
                      },
                      onError: (error) => {
                        setTaskError(
                          resolveErrorMessage(error, t, "common.error"),
                        );
                      },
                    });
                  }}
                />
              </div>
            </div>
          </ActionSheetContent>
        ) : null}
      </Dialog>
    </section>
  );
}

const toAppUrl = (route: KnownAppHashRoute): string => {
  if (typeof window === "undefined") return "/app/";
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  if (route.view === "detail") {
    return `${baseUrl}#${TASK_LISTS_ROUTE}/${encodeURIComponent(route.taskListId)}`;
  }
  if (route.view === "licenses") {
    return `${baseUrl}#${SETTINGS_LICENSES_ROUTE}`;
  }
  if (route.view === "settings") {
    return `${baseUrl}#${SETTINGS_ROUTE}`;
  }
  if (route.view === "calendar") {
    return `${baseUrl}#${CALENDAR_ROUTE}`;
  }
  return `${baseUrl}#${TASK_LISTS_ROUTE}`;
};

const buildAppHistoryState = (
  route: KnownAppHashRoute,
  currentState: unknown,
  taskAction: {
    taskListId: string;
    taskId: string;
  } | null = null,
): Record<string, unknown> => ({
  ...(currentState && typeof currentState === "object"
    ? (currentState as Record<string, unknown>)
    : {}),
  lightlistMobileStackInitialized: true,
  lightlistAppView: route.view,
  lightlistTaskListId: route.view === "detail" ? route.taskListId : null,
  lightlistTaskActionTaskListId: taskAction?.taskListId ?? null,
  lightlistTaskActionTaskId: taskAction?.taskId ?? null,
});

const readTaskActionHistoryState = (
  state: unknown,
): {
  taskListId: string;
  taskId: string;
} | null => {
  if (!state || typeof state !== "object") {
    return null;
  }
  const record = state as Record<string, unknown>;
  const taskListId = record.lightlistTaskActionTaskListId;
  const taskId = record.lightlistTaskActionTaskId;
  if (typeof taskListId !== "string" || typeof taskId !== "string") {
    return null;
  }
  if (taskListId.length === 0 || taskId.length === 0) {
    return null;
  }
  return { taskListId, taskId };
};

const isInitializedAppHistoryState = (state: unknown): boolean =>
  Boolean(
    state &&
    typeof state === "object" &&
    (state as Record<string, unknown>).lightlistMobileStackInitialized === true,
  );

const getCurrentHistoryState = (): Record<string, unknown> | null =>
  window.history.state && typeof window.history.state === "object"
    ? (window.history.state as Record<string, unknown>)
    : null;

const replaceHistoryForRoute = (route: KnownAppHashRoute): void => {
  window.history.replaceState(
    buildAppHistoryState(route, getCurrentHistoryState(), null),
    "",
    toAppUrl(route),
  );
};

const pushHistoryForRoute = (route: KnownAppHashRoute): void => {
  window.history.pushState(
    buildAppHistoryState(route, getCurrentHistoryState(), null),
    "",
    toAppUrl(route),
  );
};

const getHistoryStackForRoute = (route: AppHashRoute): KnownAppHashRoute[] => {
  switch (route.view) {
    case "settings":
      return [{ view: "taskLists" }, { view: "settings" }];
    case "licenses":
      return [
        { view: "taskLists" },
        { view: "settings" },
        { view: "licenses" },
      ];
    case "calendar":
      return [{ view: "taskLists" }, { view: "calendar" }];
    case "detail":
      return [{ view: "taskLists" }, route];
    case "taskLists":
    case "unknown":
    default:
      return [{ view: "taskLists" }];
  }
};

const applyHistoryStack = (stack: readonly KnownAppHashRoute[]): void => {
  const [firstRoute, ...restRoutes] = stack;
  replaceHistoryForRoute(firstRoute);
  restRoutes.forEach((route) => {
    pushHistoryForRoute(route);
  });
};

const initializeAppHistory = (
  route: AppHashRoute,
): {
  currentView: AppView;
  selectedTaskListId: string | null;
  activeTaskAction: { taskListId: string; taskId: string } | null;
  pendingInitialTaskListRoute: boolean;
} => {
  const stack = getHistoryStackForRoute(route);
  applyHistoryStack(stack);
  const currentRoute = stack[stack.length - 1];
  return {
    currentView: currentRoute.view,
    selectedTaskListId:
      currentRoute.view === "detail" ? currentRoute.taskListId : null,
    activeTaskAction:
      currentRoute.view === "detail"
        ? readTaskActionHistoryState(window.history.state)
        : null,
    pendingInitialTaskListRoute: route.view === "unknown",
  };
};

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
        "ll-u-0059 ll-u-0156 ll-u-0165 ll-u-0183 ll-u-0230",
        isActive ? "ll-u-0210 ll-u-0485" : "ll-u-0225",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="ll-u-0059 ll-u-0144 ll-u-0156 ll-u-0189 ll-u-0229 ll-u-0310 ll-u-0365 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0499 ll-u-0520 ll-u-0529"
      >
        <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
      </button>

      <span
        aria-hidden="true"
        className="ll-u-0066 ll-u-0092 ll-u-0188 ll-u-0193 ll-u-0200 ll-u-0460"
        style={{
          backgroundColor: resolveTaskListBackground(taskList.background),
        }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="ll-u-0059 ll-u-0129 ll-u-0152 ll-u-0157 ll-u-0162 ll-u-0267"
      >
        <span className={clsx(isActive ? "ll-u-0285" : "ll-u-0286")}>
          {taskList.name}
        </span>
        <span className="ll-u-0276 ll-u-0310 ll-u-0499">{taskCountLabel}</span>
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
        "ll-u-0059 ll-u-0157 ll-u-0165 ll-u-0196 ll-u-0200 ll-u-0239 ll-u-0244 ll-u-0352 ll-u-0460",
        isHighlighted && "ll-u-0210 ll-u-0485",
      )}
    >
      <div className="ll-u-0059 ll-u-0125 ll-u-0129 ll-u-0152 ll-u-0163">
        <div className="ll-u-0059 ll-u-0125 ll-u-0156 ll-u-0158 ll-u-0165">
          <button
            type="button"
            onClick={() => onSelectDate(task.dateValue)}
            className="ll-u-0131 ll-u-0190 ll-u-0276 ll-u-0310 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0499 ll-u-0529"
          >
            {dateDisplayValue}
          </button>
          <button
            type="button"
            onClick={() => onOpenTaskList(task.taskListId)}
            className="ll-u-0063 ll-u-0125 ll-u-0156 ll-u-0160 ll-u-0165 ll-u-0190 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0529"
          >
            <span
              aria-hidden="true"
              className="ll-u-0068 ll-u-0095 ll-u-0131 ll-u-0188 ll-u-0193 ll-u-0200 ll-u-0460"
              style={{ backgroundColor: task.taskListBackground }}
            />
            <span className="ll-u-0175 ll-u-0276 ll-u-0286 ll-u-0317 ll-u-0505">
              {task.taskListName}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelectDate(task.dateValue)}
          className="ll-u-0175 ll-u-0190 ll-u-0267 ll-u-0286 ll-u-0281 ll-u-0317 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0505 ll-u-0529"
        >
          {task.task.text}
        </button>
      </div>
    </div>
  );
}

type CalendarScreenProps = {
  showCompactHeaderOffset?: boolean;
  taskLists: TaskList[];
  onSelectTaskList: (taskListId: string) => void;
};

function CalendarScreen({
  showCompactHeaderOffset = false,
  taskLists,
  onSelectTaskList,
}: CalendarScreenProps) {
  const { t, i18n } = useTranslation();
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

  const handleOpenTaskListFromCalendar = (taskListId: string) => {
    onSelectTaskList(taskListId);
  };

  const displayedMonthKey = formatMonthKey(displayedMonth);
  const visibleDatedTasks = datedTasksByMonth[displayedMonthKey] ?? [];
  const calendarTaskDates = monthTaskDates[displayedMonthKey] ?? [];
  const dateDotColors = monthDateDotColors[displayedMonthKey] ?? {};

  return (
    <section className="ll-u-0059 ll-u-0080 ll-u-0082 ll-u-0152 ll-u-0210 ll-u-0473">
      <div className="ll-u-0059 ll-u-0080 ll-u-0082 ll-u-0152 ll-u-0233">
        {showCompactHeaderOffset ? <div className="ll-u-0078" /> : null}
        {calendarError ? <Alert variant="error">{calendarError}</Alert> : null}
        {datedTasks.length > 0 ? (
          <div
            className={clsx(
              "ll-u-0082 ll-u-0129 ll-u-0178 ll-u-0263",
              "ll-u-0451 ll-u-0454",
              "ll-u-0059 ll-u-0152 ll-u-0167",
            )}
          >
            <div className="ll-u-0111 ll-u-0449 ll-u-0450 ll-u-0455">
              <Calendar
                className="ll-u-0111"
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
                        <span className="ll-u-0008 ll-u-0059 ll-u-0080 ll-u-0111 ll-u-0156 ll-u-0159">
                          <span
                            className={clsx(colors.length > 0 && "ll-u-0259")}
                          >
                            {props.day.date.getDate()}
                          </span>
                          {colors.length > 0 ? (
                            <span className="ll-u-0002 ll-u-0006 ll-u-0023 ll-u-0026 ll-u-0059 ll-u-0132 ll-u-0162">
                              {colors.map((color, index) => (
                                <span
                                  key={`${dateKey}-${color}-${index}`}
                                  className="ll-u-0064 ll-u-0090 ll-u-0188 ll-u-0193 ll-u-0203 ll-u-0463"
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
            <div className="ll-u-0082 ll-u-0178 ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0460 ll-u-0452">
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
                <p className="ll-u-0233 ll-u-0274 ll-u-0310 ll-u-0499">
                  {t("app.calendarNoDatedTasks")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="ll-u-0274 ll-u-0310 ll-u-0499">
            {t("app.calendarNoDatedTasks")}
          </p>
        )}
      </div>
    </section>
  );
}

type CalendarEntryButtonProps = {
  onOpen: () => void;
};

function CalendarEntryButton({ onOpen }: CalendarEntryButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0165 ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0330 ll-u-0359 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0460 ll-u-0485 ll-u-0505 ll-u-0514 ll-u-0529"
    >
      <AppIcon
        name="calendar-today"
        aria-hidden="true"
        focusable="false"
        className="ll-u-0069 ll-u-0096"
      />
      <span>{t("app.calendarCheckButton")}</span>
    </button>
  );
}

type SidebarProps = {
  isWideLayout: boolean;
  userEmail: string;
  hasTaskLists: boolean;
  taskLists: TaskList[];
  sensorsList: SensorDescriptor<SensorOptions>[];
  onOpenCalendar: () => void;
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

function TaskListSidebarPanel({
  isWideLayout,
  userEmail,
  hasTaskLists,
  taskLists,
  sensorsList,
  onOpenCalendar,
  onReorderTaskList,
  selectedTaskListId,
  onSelectTaskList,
  onCloseDrawer,
  onOpenSettings,
  onCreateList,
  onJoinList,
}: SidebarProps) {
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
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0219 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0312 ll-u-0330 ll-u-0367 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0392 ll-u-0480 ll-u-0501 ll-u-0529";
  const dialogSecondaryButtonClass =
    "ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0330 ll-u-0359 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0460 ll-u-0485 ll-u-0505 ll-u-0514 ll-u-0529";

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
    <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0168">
      <DrawerHeader>
        <h2 id="drawer-task-lists-title" className="ll-u-0005">
          {t("app.drawerTitle")}
        </h2>
        <div className="ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0165">
          <div className="ll-u-0059 ll-u-0125 ll-u-0129 ll-u-0156 ll-u-0165">
            <p
              id="drawer-task-lists-description"
              className="ll-u-0040 ll-u-0125 ll-u-0129 ll-u-0175 ll-u-0274 ll-u-0310 ll-u-0499"
            >
              {userEmail}
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              title={t("settings.title")}
              aria-label={t("settings.title")}
              data-vaul-no-drag
              className="ll-u-0063 ll-u-0156 ll-u-0159 ll-u-0191 ll-u-0230 ll-u-0310 ll-u-0359 ll-u-0365 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0499 ll-u-0518 ll-u-0520 ll-u-0529"
            >
              <AppIcon name="settings" aria-hidden="true" focusable="false" />
            </button>
          </div>
        </div>
      </DrawerHeader>

      <CalendarEntryButton onOpen={onOpenCalendar} />

      <div className="ll-u-0059 ll-u-0129 ll-u-0152 ll-u-0167 ll-u-0178">
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
          <p className="ll-u-0274 ll-u-0310 ll-u-0499">{t("app.emptyState")}</p>
        )}

        <div className="ll-u-0060 ll-u-0151 ll-u-0165">
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
                <div className="ll-u-0046 ll-u-0059 ll-u-0152 ll-u-0167">
                  <label className="ll-u-0059 ll-u-0152 ll-u-0163">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => setCreateListInput(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0218 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0317 ll-u-0330 ll-u-0371 ll-u-0381 ll-u-0373 ll-u-0374 ll-u-0460 ll-u-0479 ll-u-0505 ll-u-0522 ll-u-0524"
                    />
                  </label>
                  <div className="ll-u-0059 ll-u-0152 ll-u-0165">
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
                <div className="ll-u-0046 ll-u-0059 ll-u-0152 ll-u-0167">
                  {joinListError ? (
                    <Alert variant="error">{joinListError}</Alert>
                  ) : null}
                  <label className="ll-u-0059 ll-u-0152 ll-u-0163">
                    <span>{t("taskList.shareCode")}</span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => {
                        setJoinListInput(e.target.value);
                        setJoinListError(null);
                      }}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0218 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0317 ll-u-0330 ll-u-0371 ll-u-0381 ll-u-0373 ll-u-0374 ll-u-0460 ll-u-0479 ll-u-0505 ll-u-0522 ll-u-0524"
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

function AppShellPage() {
  const { t, i18n } = useTranslation();
  const { authStatus } = useSessionState();
  const user = useUser();
  const settings = useSettings();
  const {
    hasStartupError,
    taskListDocsStatus,
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
  const [activeTaskAction, setActiveTaskAction] = useState<{
    taskListId: string;
    taskId: string;
  } | null>(null);

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
      const nextTaskAction = readTaskActionHistoryState(window.history.state);

      setCurrentView(route.view);
      if (route.view === "detail") {
        setSelectedTaskListId(route.taskListId);
        setActiveTaskAction(nextTaskAction);
        return;
      }
      setActiveTaskAction(null);
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

    if (isInitializedAppHistoryState(window.history.state)) {
      return;
    }

    const initializedState = initializeAppHistory(
      parseAppHashRoute(window.location.hash),
    );
    setCurrentView(initializedState.currentView);
    setSelectedTaskListId(initializedState.selectedTaskListId);
    setActiveTaskAction(initializedState.activeTaskAction);
    setPendingInitialTaskListRoute(
      initializedState.pendingInitialTaskListRoute,
    );
  }, [authStatus]);

  const isAuthLoading = authStatus === "loading";
  const isTaskListsHydrating =
    taskListOrderStatus !== "ready" ||
    (stateTaskLists.length === 0 && taskListDocsStatus === "loading");
  const hasResolvedTaskLists = !isTaskListsHydrating;
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
    <div className="ll-u-0059 ll-u-0152 ll-u-0167 ll-u-0230">
      <div className="ll-u-0072 ll-u-0103 ll-u-0141 ll-u-0189 ll-u-0214 ll-u-0475" />
      <div className="ll-u-0074 ll-u-0111 ll-u-0141 ll-u-0191 ll-u-0214 ll-u-0475" />
      <div className="ll-u-0074 ll-u-0111 ll-u-0141 ll-u-0191 ll-u-0214 ll-u-0475" />
      <div className="ll-u-0074 ll-u-0111 ll-u-0141 ll-u-0191 ll-u-0214 ll-u-0475" />
    </div>
  );

  const setViewState = (route: KnownAppHashRoute, mode: "push" | "replace") => {
    setCurrentView(route.view);
    setActiveTaskAction(null);
    if (route.view === "detail") {
      setSelectedTaskListId(route.taskListId);
    }
    setPendingInitialTaskListRoute(false);

    if (typeof window === "undefined") {
      return;
    }

    const nextState = buildAppHistoryState(route, window.history.state, null);
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
  const openLicenses = (mode: "push" | "replace" = "replace") =>
    setViewState({ view: "licenses" }, isWideLayout ? "replace" : mode);
  const openCalendar = (mode: "push" | "replace" = "replace") =>
    setViewState({ view: "calendar" }, isWideLayout ? "replace" : mode);
  const getCurrentDetailRoute = (): KnownAppHashRoute | null => {
    if (currentView !== "detail" || selectedTaskListId === null) {
      return null;
    }
    return { view: "detail", taskListId: selectedTaskListId };
  };
  const openTaskAction = (taskListId: string, taskId: string) => {
    setActiveTaskAction({ taskListId, taskId });
    if (typeof window === "undefined") {
      return;
    }
    const route = getCurrentDetailRoute();
    if (route === null) {
      return;
    }
    window.history.pushState(
      buildAppHistoryState(route, window.history.state, { taskListId, taskId }),
      "",
      toAppUrl(route),
    );
  };
  const closeTaskAction = () => {
    setActiveTaskAction(null);
    if (typeof window === "undefined") {
      return;
    }
    if (readTaskActionHistoryState(window.history.state) !== null) {
      window.history.back();
      return;
    }
    const route = getCurrentDetailRoute();
    if (route === null) {
      return;
    }
    window.history.replaceState(
      buildAppHistoryState(route, window.history.state, null),
      "",
      toAppUrl(route),
    );
  };

  const handleBackToTaskLists = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      (currentView === "detail" ||
        currentView === "settings" ||
        currentView === "licenses" ||
        currentView === "calendar")
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
    if (activeTaskAction === null) {
      return;
    }
    const taskList = taskLists.find(
      (candidate) => candidate.id === activeTaskAction.taskListId,
    );
    if (!taskList) {
      setActiveTaskAction(null);
      return;
    }
    if (!taskList.tasks.some((task) => task.id === activeTaskAction.taskId)) {
      setActiveTaskAction(null);
      return;
    }
    if (currentView !== "detail" || selectedTaskListId !== taskList.id) {
      setActiveTaskAction(null);
    }
  }, [activeTaskAction, currentView, selectedTaskListId, taskLists]);

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
    <TaskListSidebarPanel
      isWideLayout={isWideLayout}
      userEmail={userEmail}
      hasTaskLists={!isTaskListsHydrating && hasTaskLists}
      taskLists={taskLists}
      sensorsList={sensorsList}
      onOpenCalendar={() => openCalendar("push")}
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
    ? "ll-u-0399 ll-u-0400 ll-u-0401 ll-u-0402 ll-u-0403"
    : "ll-u-0341";
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
    <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0168 ll-u-0233 ll-u-0256">
      <div className="ll-u-0070 ll-u-0104 ll-u-0141 ll-u-0181 ll-u-0214 ll-u-0475" />
      <div className="ll-u-0059 ll-u-0152 ll-u-0165">
        {Array.from({ length: taskRowCount }, (_, index) => (
          <div
            key={index}
            className={clsx(
              "ll-u-0074 ll-u-0141 ll-u-0189 ll-u-0214 ll-u-0475",
              index === taskRowCount - 1 && taskRowCount > 3
                ? "ll-u-0094"
                : "ll-u-0111",
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
        "ll-u-0006 ll-u-0011 ll-u-0080 ll-u-0176 ll-u-0344",
        mobileSlideTransitionClass,
        currentView === view ? "ll-u-0030" : "ll-u-0002 ll-u-0029",
        className,
      )}
      style={{ transform: getCompactPanelTransform(view) }}
    >
      {content}
    </div>
  );

  const detailContent = (
    <div className="ll-u-0080 ll-u-0176">
      {isAuthLoading ? (
        renderDetailSkeleton(4)
      ) : hasStartupError ? (
        <div className="ll-u-0059 ll-u-0080 ll-u-0156 ll-u-0159 ll-u-0233">
          <Alert variant="error">{t("app.error")}</Alert>
        </div>
      ) : isTaskListsHydrating ? (
        renderDetailSkeleton(3)
      ) : hasTaskLists ? (
        <Carousel
          className="ll-u-0080"
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
              className="ll-u-0059 ll-u-0080 ll-u-0111 ll-u-0152"
              style={{
                backgroundColor: resolveTaskListBackground(taskList.background),
              }}
            >
              <div className="ll-u-0078" />
              <div
                className={clsx(
                  "ll-u-0080 ll-u-0178",
                  isWideLayout && "ll-u-0041 ll-u-0113 ll-u-0128",
                )}
              >
                <TaskListCard
                  taskList={taskList}
                  autoSort={settings?.autoSort ?? false}
                  taskInsertPosition={settings?.taskInsertPosition ?? "top"}
                  isActive={selectedTaskListId === taskList.id}
                  onActivate={openTaskList}
                  sensorsList={sensorsList}
                  onSortingChange={setIsTaskSorting}
                  onDragInteractionChange={setIsTaskDragInteracting}
                  activeTaskActionTaskId={
                    activeTaskAction?.taskListId === taskList.id
                      ? activeTaskAction.taskId
                      : null
                  }
                  onOpenTaskAction={openTaskAction}
                  onCloseTaskAction={closeTaskAction}
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
        <div className="ll-u-0059 ll-u-0080 ll-u-0156 ll-u-0159 ll-u-0233">
          <p className="ll-u-0310 ll-u-0499">{t("app.emptyState")}</p>
        </div>
      )}
    </div>
  );

  const calendarContent = (
    <CalendarScreen
      showCompactHeaderOffset={!isWideLayout}
      taskLists={taskLists}
      onSelectTaskList={(taskListId) =>
        openTaskList(taskListId, isWideLayout ? "replace" : "push")
      }
    />
  );

  const taskListsRootContent = (
    <div className="ll-u-0080 ll-u-0178 ll-u-0223 ll-u-0233 ll-u-0485">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {isAuthLoading ? taskListsPanelSkeleton : drawerPanel}
    </div>
  );

  if (authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  return (
    <div className="ll-u-0080 ll-u-0087 ll-u-0111 ll-u-0176 ll-u-0317 ll-u-0505">
      <div
        className={clsx(
          "ll-u-0059 ll-u-0080",
          isWideLayout
            ? isRtl
              ? "ll-u-0154 ll-u-0157"
              : "ll-u-0153 ll-u-0157"
            : "ll-u-0152",
        )}
      >
        {isWideLayout ? (
          <aside
            className={clsx(
              "ll-u-0010 ll-u-0015 ll-u-0108 ll-u-0118 ll-u-0131 ll-u-0174 ll-u-0200",
              isRtl ? "ll-u-0197" : "ll-u-0195",
            )}
          >
            <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0178 ll-u-0223 ll-u-0233 ll-u-0460 ll-u-0485">
              {isAuthLoading ? taskListsPanelSkeleton : drawerPanel}
            </div>
          </aside>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="ll-u-0059 ll-u-0080 ll-u-0082 ll-u-0111 ll-u-0125 ll-u-0129 ll-u-0152"
        >
          {isWideLayout ? (
            <div className="ll-u-0080 ll-u-0176">
              {currentView === "settings" ? (
                <div className="ll-u-0080 ll-u-0178">
                  <SettingsView
                    showBackButton={false}
                    onOpenLicenses={() => openLicenses("replace")}
                  />
                </div>
              ) : currentView === "licenses" ? (
                <div className="ll-u-0080 ll-u-0178">
                  <LicensesView
                    onBack={() => openSettings("replace")}
                    showBackButton={true}
                  />
                </div>
              ) : currentView === "calendar" ? (
                calendarContent
              ) : (
                detailContent
              )}
            </div>
          ) : (
            <div className="ll-u-0008 ll-u-0080 ll-u-0176">
              {renderCompactPanel("taskLists", taskListsRootContent)}
              {renderCompactPanel(
                "detail",
                <>
                  <div className="ll-u-0006 ll-u-0030 ll-u-0111">
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
                <div className="ll-u-0080 ll-u-0178">
                  <SettingsView
                    onBack={handleBackToTaskLists}
                    showBackButton={true}
                    onOpenLicenses={() => openLicenses("push")}
                  />
                </div>,
                "ll-u-0210 ll-u-0473",
              )}
              {renderCompactPanel(
                "licenses",
                <div className="ll-u-0080 ll-u-0178">
                  <LicensesView
                    onBack={handleBackToTaskLists}
                    showBackButton={true}
                  />
                </div>,
                "ll-u-0210 ll-u-0473",
              )}
              {renderCompactPanel(
                "calendar",
                <>
                  <div className="ll-u-0006 ll-u-0030 ll-u-0111">
                    <AppHeader
                      backLabel={t("common.back")}
                      onBack={handleBackToTaskLists}
                    />
                  </div>
                  {calendarContent}
                </>,
                "ll-u-0210 ll-u-0473",
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// pages/login.tsx
type AuthTab = "signin" | "signup" | "reset";

const AUTH_PRIMARY_BUTTON_CLASS =
  "ll-u-0063 ll-u-0111 ll-u-0156 ll-u-0159 ll-u-0189 ll-u-0219 ll-u-0240 ll-u-0245 ll-u-0274 ll-u-0287 ll-u-0312 ll-u-0330 ll-u-0339 ll-u-0367 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0394 ll-u-0480 ll-u-0501 ll-u-0529";

const AUTH_SECONDARY_BUTTON_CLASS =
  "ll-u-0063 ll-u-0111 ll-u-0156 ll-u-0159 ll-u-0189 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0240 ll-u-0245 ll-u-0274 ll-u-0287 ll-u-0317 ll-u-0330 ll-u-0339 ll-u-0359 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0391 ll-u-0394 ll-u-0460 ll-u-0485 ll-u-0505 ll-u-0514 ll-u-0529";

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
    <div className="ll-u-0059 ll-u-0152 ll-u-0163">
      <label htmlFor={id} className="ll-u-0274 ll-u-0286 ll-u-0317 ll-u-0505">
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
        className="ll-u-0191 ll-u-0193 ll-u-0200 ll-u-0218 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0317 ll-u-0330 ll-u-0371 ll-u-0381 ll-u-0373 ll-u-0374 ll-u-0391 ll-u-0393 ll-u-0460 ll-u-0479 ll-u-0505 ll-u-0522 ll-u-0524"
      />
      {error ? (
        <p id={`${id}-error`} className="ll-u-0276 ll-u-0308 ll-u-0497">
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
      "ll-u-0063 ll-u-0111 ll-u-0156 ll-u-0159 ll-u-0189 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0287 ll-u-0339 ll-u-0382 ll-u-0383 ll-u-0384 ll-u-0388 ll-u-0529",
      isActive
        ? "ll-u-0223 ll-u-0317 ll-u-0330 ll-u-0485 ll-u-0505"
        : "ll-u-0310 ll-u-0364 ll-u-0499 ll-u-0519",
    ].join(" ");

  const primaryButtonClass = AUTH_PRIMARY_BUTTON_CLASS;
  const secondaryButtonClass = AUTH_SECONDARY_BUTTON_CLASS;
  const selectedLanguage = normalizeLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );

  return (
    <div className="ll-u-0088 ll-u-0111 ll-u-0210 ll-u-0317 ll-u-0473 ll-u-0505">
      <main
        id="main-content"
        tabIndex={-1}
        className="ll-u-0041 ll-u-0059 ll-u-0088 ll-u-0111 ll-u-0124 ll-u-0152 ll-u-0159 ll-u-0240 ll-u-0249 ll-u-0434"
      >
        <div className="ll-u-0111 ll-u-0182 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0235 ll-u-0330 ll-u-0460 ll-u-0485 ll-u-0431">
          <div className="ll-u-0054 ll-u-0265">
            <h1 className="ll-u-0536 ll-u-0270 ll-u-0287 ll-u-0291 ll-u-0442">
              {t("title")}
            </h1>
          </div>
          <div className="ll-u-0054 ll-u-0059 ll-u-0160">
            <select
              value={selectedLanguage}
              onChange={(event) =>
                void i18n.changeLanguage(normalizeLanguage(event.target.value))
              }
              className="ll-u-0190 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0239 ll-u-0244 ll-u-0274 ll-u-0317 ll-u-0345 ll-u-0337 ll-u-0371 ll-u-0460 ll-u-0473 ll-u-0505 ll-u-0522"
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
            className="ll-u-0054 ll-u-0060 ll-u-0151 ll-u-0165 ll-u-0191 ll-u-0210 ll-u-0229 ll-u-0485"
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
              className="ll-u-0169"
            >
              <form onSubmit={handleSignIn} className="ll-u-0169">
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
              className="ll-u-0169"
            >
              <form onSubmit={handleSignUp} className="ll-u-0169">
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
            <section className="ll-u-0169">
              <form onSubmit={handlePasswordReset} className="ll-u-0169">
                {resetSent ? (
                  <Alert variant="success">
                    {t("auth.passwordReset.success")}
                  </Alert>
                ) : (
                  <>
                    <p className="ll-u-0274 ll-u-0310 ll-u-0499">
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

        <p className="ll-u-0048 ll-u-0265 ll-u-0276 ll-u-0310 ll-u-0499">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}

// pages/password_reset.tsx
function PasswordResetPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const primaryButtonClass = AUTH_PRIMARY_BUTTON_CLASS;
  const secondaryButtonClass = AUTH_SECONDARY_BUTTON_CLASS;

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
        <div className="ll-u-0169">
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
        <div className="ll-u-0169">
          <Alert variant="success">
            {t("auth.passwordReset.resetSuccess")}
          </Alert>
          <div className="ll-u-0059 ll-u-0159">
            <Spinner />
          </div>
        </div>
      );
    }

    return (
      <div className="ll-u-0169">
        {errors.general && <Alert variant="error">{errors.general}</Alert>}

        <form onSubmit={handleSubmit} className="ll-u-0169">
          <FormInput
            id="password"
            label={t("auth.passwordReset.newPassword")}
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={loading}
            placeholder={t("auth.placeholder.password")}
          />

          <FormInput
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
    <div className="ll-u-0088 ll-u-0111 ll-u-0210 ll-u-0317 ll-u-0473 ll-u-0505">
      <main
        id="main-content"
        tabIndex={-1}
        className="ll-u-0041 ll-u-0059 ll-u-0088 ll-u-0111 ll-u-0124 ll-u-0152 ll-u-0159 ll-u-0240 ll-u-0249 ll-u-0434"
      >
        <div className="ll-u-0111 ll-u-0182 ll-u-0193 ll-u-0200 ll-u-0223 ll-u-0235 ll-u-0330 ll-u-0460 ll-u-0485 ll-u-0431">
          <div className="ll-u-0054 ll-u-0265">
            <h1 className="ll-u-0536 ll-u-0270 ll-u-0287 ll-u-0291 ll-u-0442">
              {t("auth.passwordReset.title")}
            </h1>
          </div>
          {content}
        </div>
        <p className="ll-u-0048 ll-u-0265 ll-u-0276 ll-u-0310 ll-u-0499">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}

// pages/sharecodes.tsx
function ShareCodePreviewPage() {
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
      <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0210 ll-u-0473">
        <div className="ll-u-0223 ll-u-0233 ll-u-0330 ll-u-0485">
          <button
            onClick={() => window.history.back()}
            className="ll-u-0188 ll-u-0230 ll-u-0310 ll-u-0359 ll-u-0499 ll-u-0518"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="ll-u-0070 ll-u-0097" />
          </button>
        </div>
        <div className="ll-u-0233">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  if (!loading && sharedTaskListId && !taskList) return <Spinner fullPage />;

  if (!taskList) {
    return (
      <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0210 ll-u-0473">
        <div className="ll-u-0223 ll-u-0233 ll-u-0330 ll-u-0485">
          <button
            onClick={() => window.history.back()}
            className="ll-u-0188 ll-u-0230 ll-u-0310 ll-u-0359 ll-u-0499 ll-u-0518"
            aria-label={t("common.back")}
          >
            <AppIcon name="arrow-back" className="ll-u-0070 ll-u-0097" />
          </button>
        </div>
        <div className="ll-u-0233">
          <p className="ll-u-0265 ll-u-0310 ll-u-0499">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ll-u-0059 ll-u-0080 ll-u-0152 ll-u-0210 ll-u-0473">
      <header className="ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0196 ll-u-0200 ll-u-0223 ll-u-0240 ll-u-0246 ll-u-0460 ll-u-0485">
        <button
          onClick={() => window.history.back()}
          className="ll-u-0188 ll-u-0230 ll-u-0310 ll-u-0359 ll-u-0499 ll-u-0518"
          aria-label={t("common.back")}
        >
          <AppIcon name="arrow-back" className="ll-u-0070 ll-u-0097" />
        </button>
        {user && (
          <button
            onClick={handleAddToOrder}
            disabled={addToOrderLoading}
            className="ll-u-0189 ll-u-0213 ll-u-0240 ll-u-0244 ll-u-0274 ll-u-0286 ll-u-0318 ll-u-0339 ll-u-0360 ll-u-0392 ll-u-0474 ll-u-0515"
          >
            {addToOrderLoading
              ? t("common.loading")
              : t("pages.sharecode.addToOrder")}
          </button>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="ll-u-0129 ll-u-0178">
        {addToOrderError && (
          <div className="ll-u-0233 ll-u-0258">
            <Alert variant="error">{addToOrderError}</Alert>
          </div>
        )}

        <div className="ll-u-0041 ll-u-0059 ll-u-0111 ll-u-0113 ll-u-0152 ll-u-0168 ll-u-0240 ll-u-0248">
          <section
            className="ll-u-0182 ll-u-0193 ll-u-0200 ll-u-0233 ll-u-0460"
            style={{ backgroundColor: taskList.background ?? undefined }}
          >
            <header className="ll-u-0059 ll-u-0156 ll-u-0158 ll-u-0167">
              <h1 className="ll-u-0536 ll-u-0275 ll-u-0287 ll-u-0317 ll-u-0505">
                {taskList.name}
              </h1>
            </header>
            <ul className="ll-u-0046 ll-u-0059 ll-u-0152 ll-u-0165">
              {taskList.tasks.length === 0 ? (
                <li className="ll-u-0274 ll-u-0310 ll-u-0499">
                  {t("pages.tasklist.noTasks")}
                </li>
              ) : (
                taskList.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="ll-u-0191 ll-u-0193 ll-u-0201 ll-u-0224 ll-u-0239 ll-u-0244 ll-u-0461 ll-u-0486"
                    style={{ opacity: task.completed ? 0.5 : 1 }}
                  >
                    {task.date ? (
                      <div className="ll-u-0276 ll-u-0310 ll-u-0499">
                        {task.date}
                      </div>
                    ) : null}
                    <div
                      className={
                        task.completed
                          ? "ll-u-0274 ll-u-0310 ll-u-0319 ll-u-0499"
                          : "ll-u-0274 ll-u-0317 ll-u-0505"
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
  app: AppShellPage,
  login: LoginPage,
  password_reset: PasswordResetPage,
  sharecodes: ShareCodePreviewPage,
} as const;

const pageKey = document.body.dataset.page;
const Page =
  (pageKey && PAGE_COMPONENTS[pageKey as keyof typeof PAGE_COMPONENTS]) ||
  PAGE_COMPONENTS["404"];

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

const root = webBootstrapState.root ?? createRoot(rootElement);
webBootstrapState.root = root;

root.render(
  <StrictMode>
    <AppWrapper>
      <Page />
    </AppWrapper>
  </StrictMode>,
);
