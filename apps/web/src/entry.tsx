import {
  StrictMode,
  Component,
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useReducer,
  useState,
  useMemo,
  useDeferredValue,
  Children,
  memo,
  useLayoutEffect,
} from "react";
import type {
  HTMLInputTypeAttribute,
  Context,
  ErrorInfo,
  ReactNode,
  SVGProps,
  ComponentProps,
  HTMLAttributes,
  MouseEvent,
  PointerEvent,
  SubmitEvent,
} from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import "@/styles/globals.css";
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
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import type { AppCheck } from "firebase/app-check";
import type { Analytics } from "firebase/analytics";
import {
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
import type {
  ActionCodeSettings,
  Auth,
  User as FirebaseAuthUser,
} from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
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
import { Command as CommandPrimitive } from "cmdk";
import type { Locale } from "date-fns";
import {
  Announcements,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  ScreenReaderInstructions,
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

function buildDndAccessibility(
  t: TFunction,
  getName: (id: UniqueIdentifier) => string,
  getIds: () => string[],
): {
  announcements: Announcements;
  screenReaderInstructions: ScreenReaderInstructions;
} {
  const positionOf = (id: UniqueIdentifier): number | null => {
    const index = getIds().indexOf(String(id));
    return index >= 0 ? index + 1 : null;
  };
  return {
    screenReaderInstructions: { draggable: t("a11y.dragInstructions") },
    announcements: {
      onDragStart: ({ active }) =>
        t("a11y.dragStart", { item: getName(active.id) }),
      onDragOver: ({ active, over }) => {
        if (!over) return undefined;
        const position = positionOf(over.id);
        if (position === null) return undefined;
        return t("a11y.dragOver", { item: getName(active.id), position });
      },
      onDragEnd: ({ active, over }) => {
        if (!over) return undefined;
        const position = positionOf(over.id);
        if (position === null) return undefined;
        return t("a11y.dragEnd", { item: getName(active.id), position });
      },
      onDragCancel: ({ active }) =>
        t("a11y.dragCancel", { item: getName(active.id) }),
    },
  };
}

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
type StartupView = "taskList" | "calendar" | "taskLists";
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
  startupView?: StartupView;
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
  startupView: StartupView;
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
  appCheck?: AppCheck;
  root?: Root;
};

declare global {
  var __LIGHTLIST_WEB_BOOTSTRAP__: WebBootstrapState | undefined;
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

const webBootstrapState =
  globalThis.__LIGHTLIST_WEB_BOOTSTRAP__ ??
  (globalThis.__LIGHTLIST_WEB_BOOTSTRAP__ = {});

let cachedAuth: Auth | null = webBootstrapState.auth ?? null;
let cachedDb: Firestore | null = webBootstrapState.db ?? null;

let cachedAppCheck: AppCheck | null = webBootstrapState.appCheck ?? null;

const setupAppCheck = (app: FirebaseApp): void => {
  if (cachedAppCheck) {
    return;
  }
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    return;
  }
  const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  cachedAppCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  webBootstrapState.appCheck = cachedAppCheck;
};

const getApp = (): FirebaseApp => {
  const app =
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
  setupAppCheck(app);
  return app;
};

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
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
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
type FirebaseAnalyticsModule = typeof import("firebase/analytics");
let analyticsModulePromise: Promise<FirebaseAnalyticsModule> | null = null;

const getAnalyticsModule = () => {
  analyticsModulePromise ??= import("firebase/analytics");
  return analyticsModulePromise;
};

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (cached !== undefined) return cached;
  const { getAnalytics, isSupported } = await getAnalyticsModule();
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
  const { logEvent } = await getAnalyticsModule();
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
const logSettingsStartupViewChange = (params: { view: StartupView }) =>
  log("app_settings_startup_view_change", params);
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

const MAIN_CONTENT_ID = "main-content";

const AUTH_FREE_PAGES = new Set(["404", "500", "password_reset"]);

const isAuthFreePage = (): boolean =>
  AUTH_FREE_PAGES.has(document.body.dataset.page ?? "");

const LAST_UID_STORAGE_KEY = "lightlist.lastUid";

const readLastUid = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(LAST_UID_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeLastUid = (uid: string | null): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (uid) {
      window.localStorage.setItem(LAST_UID_STORAGE_KEY, uid);
    } else {
      window.localStorage.removeItem(LAST_UID_STORAGE_KEY);
    }
  } catch {
    return;
  }
};

const TASK_LIST_ORDER_IDS_STORAGE_KEY_PREFIX = "lightlist.taskListOrder.";

const readCachedTaskListOrderIds = (uid: string): string[] => {
  try {
    const raw = window.localStorage.getItem(
      `${TASK_LIST_ORDER_IDS_STORAGE_KEY_PREFIX}${uid}`,
    );
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
};

const writeCachedTaskListOrderIds = (
  uid: string,
  taskListOrder: TaskListOrderStore | null,
): void => {
  try {
    window.localStorage.setItem(
      `${TASK_LIST_ORDER_IDS_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(getOrderedTaskListIds(taskListOrder)),
    );
  } catch {
    return;
  }
};

const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  try {
    localStorage.setItem("lightlist.theme", theme);
  } catch {}
};

interface ErrorBoundaryProps extends WithTranslation {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const ERROR_PAGE_ACTION_CLASS =
  "ll-inline-flex ll-items-center ll-justify-center ll-rounded-lg ll-bg-gray-900 ll-px-4 ll-py-2 ll-text-sm ll-font-medium ll-text-gray-50 ll-hover-opacity-90 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-900 ll-focus-ring-offset-2 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-hover-opacity-90";

function ErrorPageContent({
  title,
  description,
  actionLabel,
  href,
  onAction,
  destructive = false,
  headingLevel = "h1",
}: {
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  onAction?: () => void;
  destructive?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <div className="ll-flex ll-min-h-dvh ll-w-full ll-flex-col ll-items-center ll-justify-center ll-bg-white-b ll-p-4 ll-text-gray-900 ll-dark-bg-gray-950 ll-dark-text-gray-50">
      <div className="ll-w-full ll-max-w-md ll-space-y-4 ll-text-center">
        <div
          className={clsx(
            "ll-mx-auto ll-flex ll-h-12 ll-w-12 ll-items-center ll-justify-center ll-rounded-full",
            destructive
              ? "ll-bg-red-100 ll-dark-bg-red-900-20"
              : "ll-bg-gray-100 ll-dark-bg-gray-800",
          )}
        >
          <AppIcon
            name="alert-circle"
            className={clsx(
              "ll-h-6 ll-w-6",
              destructive
                ? "ll-text-red-600v ll-dark-text-red-400v"
                : "ll-text-gray-600v ll-dark-text-gray-400",
            )}
          />
        </div>
        <Heading className="ll-font-display ll-text-lg ll-font-semibold">
          {title}
        </Heading>
        <p className="ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
          {description}
        </p>
        {href ? (
          <a href={href} className={ERROR_PAGE_ACTION_CLASS}>
            {actionLabel}
          </a>
        ) : (
          <button onClick={onAction} className={ERROR_PAGE_ACTION_CLASS}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
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
        <ErrorPageContent
          title={t("pages.error.title")}
          description={t("pages.error.description")}
          destructive
          headingLevel="h2"
          actionLabel={t("pages.error.reload")}
          onAction={() => window.location.reload()}
        />
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
      <div className="ll-h-dvh ll-w-full ll-overflow-hidden ll-font-sans">
        <div className="ll-h-full ll-w-full ll-overflow-y-auto">
          <a
            href={`#${MAIN_CONTENT_ID}`}
            className="ll-pointer-events-none ll-absolute ll-top-2 ll-z-2000 ll-translate-y-neg-16 ll-rounded-lg ll-bg-gray-900 ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-50 ll-opacity-0 ll-shadow-lg ll-transition ll-focus-pointer-events-auto ll-focus-translate-y-0 ll-focus-opacity-100 ll-focus-outline-1 ll-focus-outline-2 ll-focus-outline-offset-2 ll-focus-outline-gray-600 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-focus-outline-gray-300"
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
type SessionContextValue = SessionState & { activeUid: string | null };
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
        startupView: normalizeStartupView(settingsStore.startupView),
      }
    : null;

const normalizeStartupView = (value: unknown): StartupView =>
  value === "calendar" || value === "taskLists" ? value : "taskList";

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
    .sort((a, b) => a[1].order - b[1].order || compareStringIds(a[0], b[0]))
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

const SessionContext = createContext<SessionContextValue | null>(null);
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
  const [storedLastUid] = useState(readLastUid);

  useEffect(() => {
    if (isAuthFreePage()) {
      setSession({ authStatus: "unauthenticated", user: null });
      return;
    }
    const unsubscribe = onAuthStateChanged(getAuthInstance(), (user) => {
      writeLastUid(user?.uid ?? null);
      setSession({
        authStatus: user ? "authenticated" : "unauthenticated",
        user: toUser(user),
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const activeUid =
    session.user?.uid ??
    (session.authStatus === "loading" ? storedLastUid : null);

  useEffect(() => {
    if (!activeUid) {
      setSettingsState(serverSettingsState);
      return;
    }

    let hasLiveSnapshot = false;
    let isSubscribed = true;
    const settingsRef = doc(getDbInstance(), "settings", activeUid);

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
  }, [activeUid]);

  useEffect(() => {
    if (!activeUid) {
      dispatchTaskLists({ type: "reset", taskListOrderStatus: "idle" });
      return;
    }

    let hasLiveSnapshot = false;
    let isSubscribed = true;
    const taskListOrderRef = doc(getDbInstance(), "taskListOrder", activeUid);

    dispatchTaskLists({ type: "reset", taskListOrderStatus: "loading" });

    void getDocFromCache(taskListOrderRef)
      .then((snapshot) => {
        if (!isSubscribed || hasLiveSnapshot) {
          return;
        }
        const taskListOrder = snapshot.exists()
          ? (snapshot.data() as TaskListOrderStore)
          : null;
        writeCachedTaskListOrderIds(activeUid, taskListOrder);
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder,
          taskListOrderStatus: "ready",
        });
      })
      .catch(() => {});

    const unsubscribe = onSnapshot(
      taskListOrderRef,
      (snapshot) => {
        hasLiveSnapshot = true;
        const taskListOrder = snapshot.exists()
          ? (snapshot.data() as TaskListOrderStore)
          : null;
        writeCachedTaskListOrderIds(activeUid, taskListOrder);
        dispatchTaskLists({
          type: "setTaskListOrder",
          taskListOrder,
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
  }, [activeUid]);

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

    if (!activeUid) {
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
            logException(`taskList chunk listener error: ${error.code}`, false);
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
  }, [orderedTaskListIdsKey, activeUid]);

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
          logException(`shared taskList listener error: ${error.code}`, false);
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

  const sessionContextValue = useMemo<SessionContextValue>(
    () => ({ ...session, activeUid }),
    [session, activeUid],
  );

  return (
    <SessionContext.Provider value={sessionContextValue}>
      <SettingsContext.Provider value={settingsState}>
        <TaskListsContext.Provider value={taskListsContextValue}>
          {children}
        </TaskListsContext.Provider>
      </SettingsContext.Provider>
    </SessionContext.Provider>
  );
}

function useSessionState(): SessionContextValue {
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

type RelativeDatePatternConfig = {
  pattern: string;
  options?: string;
  offset?: number;
  offsetGroup?: number;
  weekdayGroup?: number;
};

type TranslationBundle = {
  app: { initialTaskListName: string };
  datePatterns?: {
    relative?: RelativeDatePatternConfig[];
    weekdays?: Record<string, number | undefined>;
  };
  pinPrefixes?: string[];
};

const getTranslationBundle = (language: Language): TranslationBundle =>
  i18next.getResourceBundle(language, "translation") as TranslationBundle;

const getInitialTaskListName = (language: Language): string =>
  getTranslationBundle(language).app.initialTaskListName;

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
  startupView: "taskList",
  createdAt: now,
  updatedAt: now,
});

const createInitialTaskListStore = (
  taskListId: string,
  language: Language,
  now: number,
): TaskListStore => {
  return {
    id: taskListId,
    name: getInitialTaskListName(language),
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
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected.length > 0) {
      throw rejected.length === 1
        ? rejected[0].reason
        : new AggregateError(rejected.map((r) => r.reason));
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

const relativePatternsCache = new Map<Language, DatePattern[]>();
const getRelativePatterns = (language: Language): DatePattern[] => {
  const cached = relativePatternsCache.get(language);
  if (cached) return cached;
  const bundle = getTranslationBundle(language);
  const patterns = bundle.datePatterns?.relative ?? [];
  const weekdays = bundle.datePatterns?.weekdays ?? {};

  const result = patterns.map((p) => ({
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
            Object.entries(weekdays).map(
              ([k, v]): [string, number | undefined] => [k.toLowerCase(), v],
            ),
          );
          const finalTarget = lowerWeekdays[lowerTarget];
          if (finalTarget === undefined) return null;
          return getNextWeekdayOffset(finalTarget, new Date().getDay());
        }
        return getNextWeekdayOffset(target, new Date().getDay());
      }
      return null;
    },
  }));
  relativePatternsCache.set(language, result);
  return result;
};

const GLOBAL_PIN_PREFIXES = ["pin", "pinned"] as const;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const pinPrefixRegexCache = new Map<Language, RegExp>();
const getPinPrefixRegex = (language: Language): RegExp => {
  const cached = pinPrefixRegexCache.get(language);
  if (cached) return cached;
  const bundle = getTranslationBundle(language);
  const tokens = Array.from(
    new Set([...GLOBAL_PIN_PREFIXES, ...(bundle.pinPrefixes ?? [])]),
  ).sort((left, right) => right.length - left.length);
  const result = new RegExp(
    String.raw`^(?:${tokens.map(escapeRegex).join("|")})(?=\s|$)`,
    "iu",
  );
  pinPrefixRegexCache.set(language, result);
  return result;
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

const shareCodePattern = /^[A-Z0-9]{8}$/;

const normalizeShareCode = (shareCode: string): string | null => {
  const normalized = shareCode.trim().toUpperCase();
  return shareCodePattern.test(normalized) ? normalized : null;
};

function compareStringIds(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function getAutoSortedTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  const getDateKey = (task: TaskListStoreTask): string =>
    task.date || "9999-12-31";

  return renumberTasks(
    [...tasks].sort((a, b) => {
      const aGroup = getTaskDisplayGroup(a);
      const bGroup = getTaskDisplayGroup(b);
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }
      const aDate = getDateKey(a);
      const bDate = getDateKey(b);
      if (aDate !== bDate) {
        return aDate < bDate ? -1 : 1;
      }
      return a.order - b.order || compareStringIds(a.id, b.id);
    }),
  );
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
  return tasks.map((task, index) => ({ ...task, order: index + 1 }));
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
  return Object.values(taskList.tasks).sort(
    (a, b) => a.order - b.order || compareStringIds(a.id, b.id),
  );
}

function getDisplayOrderedTasks(
  taskList: Pick<TaskListStore, "tasks">,
): TaskListStoreTask[] {
  return Object.values(taskList.tasks).sort((a, b) => {
    const groupDifference = getTaskDisplayGroup(a) - getTaskDisplayGroup(b);
    return groupDifference || a.order - b.order || compareStringIds(a.id, b.id);
  });
}

function getSortedTasks(
  tasks: TaskListStoreTask[],
  settings: ResolvedTaskSettings,
): TaskListStoreTask[] {
  return settings.autoSort ? getAutoSortedTasks(tasks) : renumberTasks(tasks);
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
  batch.update(taskListOrderRef, {
    [taskListId]: deleteField(),
    updatedAt: now,
  });
  if (getValidMemberCount(taskList) <= 1) {
    if (taskList.shareCode) {
      const shareCode = normalizeShareCode(taskList.shareCode);
      if (shareCode) {
        batch.delete(doc(db, "shareCodes", shareCode));
      }
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
  await enqueueTaskListMutation(`taskListOrder:${uid}`, async () => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    taskListOrders.forEach(({ taskListId, order }) => {
      updates[`${taskListId}.order`] = order;
    });
    await updateDoc(doc(getDbInstance(), "taskListOrder", uid), updates);
  });
}

async function addTask(
  taskListId: string,
  rawText: string,
  settings: ResolvedTaskSettings,
  options?: { taskId?: string; date?: string },
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
      date: options?.date ?? parsed.date,
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
  if (!normalizedCode) return null;
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
  if (normalizedCode) {
    batch.delete(doc(db, "shareCodes", normalizedCode));
  }
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
        const previousShareCode = normalizeShareCode(taskList.shareCode);
        if (previousShareCode) {
          batch.delete(doc(db, "shareCodes", previousShareCode));
        }
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
  info: "ll-border-gray-300 ll-bg-gray-50 ll-text-gray-900 ll-dark-border-gray-700 ll-dark-bg-gray-900b ll-dark-text-gray-50",
  success:
    "ll-border-emerald-200 ll-bg-emerald-50 ll-text-emerald-900 ll-dark-border-emerald-900-40 ll-dark-bg-emerald-900-20 ll-dark-text-emerald-100",
  warning:
    "ll-border-amber-200 ll-bg-amber-50 ll-text-amber-900 ll-dark-border-amber-900-40 ll-dark-bg-amber-900-20 ll-dark-text-amber-100",
  error:
    "ll-border-red-200 ll-bg-red-50 ll-text-red-900 ll-dark-border-red-900-40 ll-dark-bg-red-900-20 ll-dark-text-red-100",
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
        "ll-rounded-xl ll-border ll-px-3 ll-py-2 ll-text-sm",
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
      className={clsx("ll-flex ll-items-center ll-justify-center", className)}
    >
      <div className="ll-animate-pulse">
        <img
          src="/brand/logo.svg"
          alt=""
          aria-hidden="true"
          className="ll-block ll-h-14 ll-w-auto"
        />
      </div>
      <span className="ll-sr-only">読み込み中</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="ll-flex ll-h-dvh ll-w-full ll-items-center ll-justify-center ll-bg-gray-50 ll-dark-bg-gray-950">
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
    <div className="ll-flex ll-flex-wrap ll-gap-2">
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
              "ll-flex ll-h-11 ll-w-11 ll-items-center ll-justify-center ll-rounded-10px ll-border ll-border-gray-300 ll-text-10px ll-font-semibold ll-text-gray-600 ll-dark-border-gray-700 ll-dark-text-gray-300",
              isSelected
                ? "ll-ring-2 ll-ring-gray-900 ll-ring-offset-2 ll-ring-offset-white ll-dark-ring-gray-50 ll-dark-ring-offset-gray-900"
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

function DialogOverlay({
  className,
  ref,
  ...rest
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      {...rest}
      ref={ref}
      className={clsx(
        "ll-anim-overlay ll-fixed ll-inset-0 ll-z-1200 ll-bg-black-40 ll-backdrop-blur-sm",
        className,
      )}
    />
  );
}

function DialogContent({
  children,
  title,
  description,
  titleId,
  descriptionId,
  className,
  ref,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: ComponentProps<typeof DialogPrimitive.Title>["children"];
  description?: ComponentProps<typeof DialogPrimitive.Description>["children"];
  titleId?: string;
  descriptionId?: string;
}) {
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
          "ll-anim-dialog ll-fixed ll-left-half ll-top-half ll-z-1300 ll-min-w-320px ll-max-w-dialog ll-translate-x-neg-half ll-translate-y-neg-half ll-rounded-xl ll-bg-dialog ll-p-5 ll-text-dialog-fg ll-shadow-2xl",
          className,
        )}
      >
        <div className="ll-flex ll-flex-col ll-gap-2">
          <DialogPrimitive.Title
            id={generatedTitleId}
            className="ll-m-0 ll-text-lg ll-font-semibold"
          >
            {title}
          </DialogPrimitive.Title>
          {description !== undefined ? (
            <DialogPrimitive.Description
              id={generatedDescriptionId}
              className="ll-m-0 ll-text-sm ll-text-dialog-muted"
            >
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function ActionSheetContent({
  children,
  title,
  description,
  titleId,
  descriptionId,
  className,
  ref,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: ComponentProps<typeof DialogPrimitive.Title>["children"];
  description?: ComponentProps<typeof DialogPrimitive.Description>["children"];
  titleId?: string;
  descriptionId?: string;
}) {
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
          "ll-anim-sheet ll-fixed ll-inset-x-0 ll-bottom-0 ll-z-1300 ll-flex ll-max-h-sheet ll-w-full ll-translate-x-0 ll-translate-y-0 ll-flex-col ll-overflow-hidden ll-rounded-t-28px ll-bg-white-b ll-px-4 ll-pb-6 ll-pt-4 ll-text-gray-900 ll-shadow-2xl ll-sm-left-half ll-sm-top-half ll-sm-h-sheet ll-sm-w-dialog ll-sm-max-w-dialog ll-sm-translate-x-neg-half ll-sm-translate-y-neg-half ll-sm-rounded-28px ll-sm-border ll-sm-border-gray-300 ll-dark-bg-gray-900b ll-dark-text-gray-50 ll-sm-dark-border-gray-700",
          className,
        )}
      >
        <DialogPrimitive.Title id={generatedTitleId} className="ll-sr-only">
          {title}
        </DialogPrimitive.Title>
        {description !== undefined ? (
          <DialogPrimitive.Description
            id={generatedDescriptionId}
            className="ll-sr-only"
          >
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="ll-mt-4 ll-flex ll-flex-wrap ll-items-center ll-justify-end ll-gap-2">
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
};

function BackButton({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onBack}
      title={t("common.back")}
      aria-label={t("common.back")}
      className="ll-inline-flex ll-h-10 ll-w-10 ll-items-center ll-justify-center ll-rounded-full ll-text-gray-600 ll-transition ll-hover-bg-gray-300 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-300 ll-dark-text-gray-300 ll-dark-hover-bg-gray-900 ll-dark-focus-visible-outline-gray-700"
    >
      <AppIcon
        name="arrow-back"
        className="ll-h-5 ll-w-5"
        aria-hidden="true"
        focusable="false"
      />
    </button>
  );
}

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
    "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-bg-gray-900 ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-50 ll-hover-opacity-90 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-50 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-focus-visible-outline-gray-300";
  const destructiveButtonClass =
    "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-bg-red-600 ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-white ll-hover-opacity-90 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-red-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-50 ll-dark-bg-red-400 ll-dark-focus-visible-outline-red-400";
  const secondaryButtonClass =
    "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white-b ll-px-3 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-900 ll-hover-bg-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-900b ll-dark-text-gray-50 ll-dark-hover-bg-gray-950 ll-dark-focus-visible-outline-gray-300";

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
          <p className="ll-mt-2 ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
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

function SettingsSection({ children }: SettingsSectionProps) {
  return (
    <section className="ll-rounded-xl ll-bg-white-b ll-p-4 ll-dark-bg-gray-900b">
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
      className={`ll-grid ll-gap-2 ll-py-3 ll-sm-grid-cols-sidebar ll-sm-items-center ll-transition ll-focus-within-outline-1 ll-focus-within-outline-2 ll-focus-within-outline-offset-2 ll-focus-within-outline-gray-300 ll-dark-focus-within-outline-gray-700 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="ll-text-sm ll-font-medium ll-text-gray-900 ll-dark-text-gray-50 ll-sm-pr-3">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="ll-w-full ll-rounded-md ll-border ll-border-gray-300 ll-bg-white-b ll-px-3 ll-py-2 ll-text-sm ll-text-gray-900 ll-outline-none ll-transition ll-focus-border-gray-600 ll-dark-border-gray-700 ll-dark-bg-gray-950 ll-dark-text-gray-50 ll-dark-focus-border-gray-300"
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
    startupView?: StartupView;
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

  const handleStartupViewChange = async (startupView: StartupView) => {
    await updateSetting({ startupView });
    logSettingsStartupViewChange({ view: startupView });
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
      : t("settings.danger.deleteAccount");
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
  const startupViewOptions = [
    { value: "taskList", label: t("settings.startupView.taskList") },
    { value: "calendar", label: t("settings.startupView.calendar") },
    { value: "taskLists", label: t("settings.startupView.taskLists") },
  ] as const;

  const skeletonSelect = (
    <div className="ll-h-9 ll-w-full ll-animate-pulse ll-rounded-md ll-bg-gray-300 ll-dark-bg-gray-700" />
  );

  return (
    <div className="ll-min-h-full ll-w-full ll-bg-gray-50 ll-text-gray-900 ll-dark-bg-gray-950 ll-dark-text-gray-50">
      <div className="ll-mx-auto ll-flex ll-w-full ll-max-w-3xl ll-flex-col ll-gap-4 ll-px-4 ll-pb-10 ll-pt-6 ll-sm-px-6 ll-lg-pt-8">
        <header className="ll-flex ll-items-center ll-gap-3 ll-px-1">
          {showBackButton ? <BackButton onBack={onBack} /> : null}
          <h1 className="ll-font-display ll-min-w-0 ll-flex-1 ll-text-2xl ll-font-semibold ll-tracking-tight">
            {t("settings.title")}
          </h1>
        </header>

        {error && <Alert variant="error">{error}</Alert>}

        {settingsStatus === "error" ? (
          <Alert variant="error">{t("auth.error.general")}</Alert>
        ) : (
          <>
            <SettingsSection>
              <div className="ll-flex ll-flex-col ll-gap-2">
                <h2 className="ll-text-sm ll-font-semibold ll-tracking-wide ll-text-gray-600 ll-dark-text-gray-300">
                  {t("settings.userInfo.title")}
                </h2>
                <div className="ll-mt-1 ll-flex ll-flex-col">
                  <div className="ll-flex ll-min-h-11 ll-items-center">
                    {user ? (
                      <p className="ll-break-all ll-text-sm ll-font-medium ll-text-gray-900 ll-dark-text-gray-50">
                        {user.email}
                      </p>
                    ) : (
                      <div className="ll-h-5 ll-w-48 ll-animate-pulse ll-rounded ll-bg-gray-300 ll-dark-bg-gray-700" />
                    )}
                  </div>
                  <div className="ll-border-t ll-border-gray-300 ll-dark-border-gray-700" />
                  {!showEmailChangeForm && (
                    <button
                      type="button"
                      onClick={() => setShowEmailChangeForm(true)}
                      disabled={actionsDisabled}
                      className="ll-flex ll-min-h-11 ll-items-center ll-justify-between ll-text-left ll-text-sm ll-font-medium ll-text-gray-900 ll-transition ll-hover-bg-gray-50 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-text-gray-50 ll-dark-hover-bg-gray-950"
                    >
                      {t("settings.emailChange.title")}
                    </button>
                  )}
                  {showEmailChangeForm && (
                    <div className="ll-mt-3 ll-flex ll-flex-col ll-gap-3">
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
                              className="ll-mb-1 ll-block ll-text-xs ll-font-medium ll-text-gray-600 ll-dark-text-gray-300"
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
                              className="ll-w-full ll-rounded-md ll-border ll-border-gray-300 ll-bg-white-b ll-px-3 ll-py-2 ll-text-sm ll-text-gray-900 ll-outline-none ll-transition ll-focus-border-gray-600 ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-950 ll-dark-text-gray-50 ll-dark-focus-border-gray-300"
                            />
                          </div>
                          <div className="ll-flex ll-gap-2">
                            <button
                              type="button"
                              onClick={handleEmailChangeClose}
                              disabled={isChangingEmail}
                              className="ll-inline-flex ll-items-center ll-justify-center ll-rounded-2xl ll-border ll-border-gray-300 ll-bg-white-b ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-900 ll-transition ll-hover-border-gray-600 ll-hover-bg-gray-50 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-950 ll-dark-text-gray-50 ll-dark-hover-border-gray-300 ll-dark-hover-bg-gray-900"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleEmailChangeSubmit()}
                              disabled={isChangingEmail || !newEmail.trim()}
                              className="ll-inline-flex ll-flex-1 ll-items-center ll-justify-center ll-rounded-2xl ll-bg-gray-900 ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-50 ll-transition ll-hover-opacity-90 ll-disabled-cursor-not-allowed ll-disabled-opacity-50 ll-dark-bg-gray-50 ll-dark-text-gray-900"
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
                          className="ll-text-xs ll-text-gray-600 ll-underline ll-hover-text-gray-900 ll-dark-text-gray-300 ll-dark-hover-text-gray-50"
                        >
                          {t("common.close")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SettingsSection>

            <SettingsSection>
              <fieldset className="ll-flex ll-flex-col ll-gap-0">
                <legend className="ll-text-sm ll-font-semibold ll-tracking-wide ll-text-gray-600 ll-dark-text-gray-300">
                  {t("settings.preferences.title")}
                </legend>
                <div className="ll-mt-2 ll-divide-y ll-divide-gray-300 ll-dark-divide-gray-700">
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
                        id="settings-startup-view"
                        label={t("settings.startupView.title")}
                        value={settings.startupView}
                        disabled={settingsDisabled}
                        options={[...startupViewOptions]}
                        onChange={(next) =>
                          void handleStartupViewChange(next as StartupView)
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
                    [
                      ["language", t("settings.language.title")],
                      ["theme", t("settings.theme.title")],
                      ["startupView", t("settings.startupView.title")],
                      [
                        "taskInsertPosition",
                        t("settings.taskInsertPosition.title"),
                      ],
                    ].map(([key, label]) => (
                      <div
                        key={key}
                        className="ll-grid ll-gap-2 ll-py-3 ll-sm-grid-cols-sidebar ll-sm-items-center"
                      >
                        <span className="ll-text-sm ll-font-medium ll-text-gray-900 ll-dark-text-gray-50">
                          {label}
                        </span>
                        {skeletonSelect}
                      </div>
                    ))
                  )}
                </div>
                <label
                  className={`ll-mt-1 ll-flex ll-cursor-pointer ll-items-center ll-justify-between ll-gap-4 ll-border-t ll-border-gray-300 ll-py-3 ll-transition ll-focus-within-outline-1 ll-focus-within-outline-2 ll-focus-within-outline-offset-2 ll-focus-within-outline-gray-300 ll-dark-border-gray-700 ll-dark-focus-within-outline-gray-700 ${
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
                    className="ll-peer ll-sr-only"
                  />
                  <span className="ll-flex ll-flex-col ll-gap-0x5">
                    <span className="ll-text-sm ll-font-medium ll-text-gray-900 ll-dark-text-gray-50">
                      {t("settings.autoSort.title")}
                    </span>
                    <span className="ll-text-xs ll-text-gray-600 ll-dark-text-gray-300">
                      {t("settings.autoSort.enable")}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ll-relative ll-inline-flex ll-h-7 ll-w-12 ll-items-center ll-rounded-full ll-border ll-transition ${
                      settings?.autoSort
                        ? "border-primary ll-bg-gray-900 ll-dark-border-gray-50 dark:bg-primary-dark"
                        : "border-border ll-bg-gray-300 ll-dark-border-gray-700 dark:bg-surface-dark"
                    }`}
                  >
                    <span
                      className={`ll-inline-block ll-h-5 ll-w-5 ll-rounded-full ll-bg-white-b ll-shadow-sm ll-transition ll-dark-bg-gray-950 ${
                        settings?.autoSort ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </span>
                </label>
              </fieldset>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-flex ll-flex-col ll-gap-2">
                <h2 className="ll-text-sm ll-font-semibold ll-tracking-wide ll-text-gray-600 ll-dark-text-gray-300">
                  {t("settings.legal.title")}
                </h2>
                {(["openSource", "bundledAssets"] as const).map(
                  (key, index) => (
                    <Fragment key={key}>
                      {index > 0 ? (
                        <div className="ll-border-t ll-border-gray-300 ll-dark-border-gray-700" />
                      ) : null}
                      <button
                        type="button"
                        onClick={onOpenLicenses}
                        disabled={!onOpenLicenses}
                        className="ll-flex ll-items-center ll-justify-between ll-gap-3 ll-rounded-lg ll-px-1 ll-py-2 ll-text-left ll-transition ll-hover-bg-gray-50 ll-disabled-cursor-default ll-disabled-hover-bg-transparent ll-dark-hover-bg-gray-950"
                      >
                        <span className="ll-text-sm ll-font-medium ll-text-gray-900 ll-dark-text-gray-50">
                          {t(`settings.licenses.${key}`)}
                        </span>
                        <span className="ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
                          &gt;
                        </span>
                      </button>
                    </Fragment>
                  ),
                )}
              </div>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-flex ll-flex-col ll-gap-2">
                <h2 className="ll-text-sm ll-font-semibold ll-tracking-wide ll-text-gray-600 ll-dark-text-gray-300">
                  {t("settings.actions.title")}
                </h2>
                <div className="ll-flex ll-flex-col">
                  <button
                    type="button"
                    onClick={() => setShowSignOutConfirm(true)}
                    disabled={actionsDisabled}
                    className="ll-flex ll-w-full ll-items-center ll-rounded-lg ll-px-1 ll-py-3 ll-text-left ll-text-sm ll-font-medium ll-text-gray-900 ll-transition ll-hover-bg-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-300 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-text-gray-50 ll-dark-hover-bg-gray-950 ll-dark-focus-visible-outline-gray-700"
                  >
                    {signOutLabel}
                  </button>
                  <div className="ll-border-t ll-border-gray-300 ll-dark-border-gray-700" />
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={actionsDisabled}
                    className="ll-flex ll-w-full ll-items-center ll-rounded-lg ll-px-1 ll-py-3 ll-text-left ll-text-sm ll-font-medium ll-text-red-600 ll-transition ll-hover-bg-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-red-300 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-text-red-400 ll-dark-hover-bg-gray-950 ll-dark-focus-visible-outline-red-500"
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
    <details className="ll-rounded-xl ll-bg-white-b ll-px-4 ll-py-3 ll-dark-bg-gray-900b">
      <summary className="ll-cursor-pointer ll-list-none">
        <div className="ll-flex ll-items-start ll-justify-between ll-gap-3">
          <div className="ll-min-w-0">
            <p className="ll-text-sm ll-font-semibold ll-text-gray-900 ll-dark-text-gray-50">
              {entry.name}
            </p>
            <p className="ll-mt-1 ll-text-xs ll-text-gray-600 ll-dark-text-gray-300">
              {[entry.version, entry.license].filter(Boolean).join(" / ")}
            </p>
          </div>
          <span className="ll-mt-0x5 ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
            &gt;
          </span>
        </div>
      </summary>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ll-mt-3 ll-inline-flex ll-text-xs ll-text-gray-600 ll-underline ll-hover-text-gray-900 ll-dark-text-gray-300 ll-dark-hover-text-gray-50"
        >
          {sourceUrl}
        </a>
      ) : null}
      <pre className="ll-mt-3 ll-overflow-x-auto ll-whitespace-pre-wrap ll-break-words ll-rounded-lg ll-bg-gray-50 ll-p-3 ll-text-xs ll-leading-5 ll-text-gray-900 ll-dark-bg-gray-950 ll-dark-text-gray-50">
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
    <div className="ll-min-h-full ll-w-full ll-bg-gray-50 ll-text-gray-900 ll-dark-bg-gray-950 ll-dark-text-gray-50">
      <div className="ll-mx-auto ll-flex ll-w-full ll-max-w-4xl ll-flex-col ll-gap-4 ll-px-4 ll-pb-10 ll-pt-6 ll-sm-px-6 ll-lg-pt-8">
        <header className="ll-flex ll-items-center ll-gap-3 ll-px-1">
          {showBackButton ? <BackButton onBack={onBack} /> : null}
          <h1 className="ll-font-display ll-min-w-0 ll-flex-1 ll-text-2xl ll-font-semibold ll-tracking-tight">
            {t("settings.licenses.title")}
          </h1>
        </header>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {!payload && !error ? <Spinner /> : null}

        {payload ? (
          <>
            <SettingsSection>
              <div className="ll-flex ll-flex-col ll-gap-3">
                <h2 className="ll-text-sm ll-font-semibold ll-tracking-wide ll-text-gray-900 ll-dark-text-gray-50">
                  {t("settings.licenses.openSource")}
                </h2>
                <div className="ll-flex ll-flex-col ll-gap-3">
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
              <div className="ll-flex ll-flex-col ll-gap-3">
                <h2 className="ll-text-sm ll-font-semibold ll-tracking-wide ll-text-gray-900 ll-dark-text-gray-50">
                  {t("settings.licenses.bundledAssets")}
                </h2>
                <div className="ll-flex ll-flex-col ll-gap-3">
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
    <ErrorPageContent
      title={t("pages.notFound.title")}
      description={t("pages.notFound.description")}
      actionLabel={t("pages.notFound.backHome")}
      href="/"
    />
  );
}

// pages/500.tsx
function ServerErrorPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("pages.serverError.title");
  }, [t]);

  return (
    <ErrorPageContent
      title={t("pages.serverError.title")}
      description={t("pages.serverError.description")}
      destructive
      actionLabel={t("pages.serverError.backHome")}
      href="/"
    />
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

const LAST_TASK_LIST_STORAGE_KEY = "lightlist.lastTaskList";

type LastTaskListSnapshot = {
  id: string;
  background: string;
};

const readLastTaskListSnapshot = (): LastTaskListSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LAST_TASK_LIST_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<LastTaskListSnapshot>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.background !== "string"
    ) {
      return null;
    }
    return { id: parsed.id, background: parsed.background };
  } catch {
    return null;
  }
};

const writeLastTaskListSnapshot = (snapshot: LastTaskListSnapshot): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      LAST_TASK_LIST_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    return;
  }
};

const parseTaskDate = (dateStr: string | null | undefined): Date | null =>
  parseTaskDateValue(dateStr ?? undefined) ?? null;

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
  taskListIndex: number;
  taskIndex: number;
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
    <header className="ll-flex ll-items-center ll-px-1 ll-py-1x5">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        title={backLabel}
        className="ll-pressable ll-inline-flex ll-items-center ll-justify-center ll-rounded ll-p-3 ll-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-border-gray-700 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300"
      >
        <AppIcon
          className="ll-h-6 ll-w-6"
          name="arrow-back"
          aria-hidden="true"
          focusable="false"
        />
        <span className="ll-sr-only">{backLabel}</span>
      </button>
    </header>
  );
}

function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("ll-flex ll-flex-col ll-gap-3 ll-text-start", className)}
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
  onScrollStart,
  onScrollEnd,
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
  onScrollStart?: () => void;
  onScrollEnd?: (index: number) => void;
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
    if (!isScrollingRef.current) {
      onScrollStart?.();
    }
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
      onScrollEnd?.(clampedIndex);
      if (clampedIndex !== currentIndexRef.current) {
        skipSmoothSyncRef.current = true;
        onIndexChange(clampedIndex);
      }
    }, 150);
  }, [count, direction, onIndexChange, onScrollEnd, onScrollStart]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={clsx("ll-relative ll-w-full ll-overflow-hidden", className)}
    >
      {showIndicators && count > 0 ? (
        <nav
          aria-label={ariaLabel}
          className={clsx(
            indicatorInFlow
              ? "ll-flex ll-justify-center ll-gap-0x5"
              : "ll-pointer-events-none ll-absolute ll-left-0 ll-right-0 ll-z-30 ll-flex ll-justify-center ll-gap-0x5",
            indicatorInFlow
              ? indicatorPosition === "top"
                ? "ll-mb-2"
                : "ll-mt-2"
              : indicatorPosition === "top"
                ? "ll-top-14"
                : "ll-bottom-4",
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
                "ll-inline-flex ll-items-center ll-justify-center ll-rounded-full ll-p-2 ll-transition-all",
                !indicatorInFlow && "ll-pointer-events-auto",
                "ll-hover-bg-gray-900-10 ll-dark-hover-bg-gray-50-10",
              )}
              aria-label={getIndicatorLabel?.(idx, count) ?? `${idx + 1}`}
              aria-current={idx === currentIndex ? "true" : undefined}
            >
              <span
                className={clsx(
                  "ll-h-2 ll-w-2 ll-rounded-full ll-transition-all",
                  idx === currentIndex
                    ? "ll-scale-110 ll-bg-gray-900 ll-dark-bg-gray-50"
                    : "ll-bg-gray-900-40 ll-dark-bg-gray-50-40",
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
          "ll-flex ll-h-full ll-w-full ll-snap-x ll-snap-mandatory no-scrollbar ll-scroll-smooth",
          scrollEnabled
            ? "ll-overflow-x-auto ll-overflow-y-hidden"
            : "ll-overflow-hidden",
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
            role="group"
            aria-roledescription="slide"
            aria-label={getIndicatorLabel?.(idx, count) ?? `${idx + 1}`}
            className="ll-h-full ll-w-full ll-shrink-0 ll-snap-start ll-snap-always"
            aria-hidden={idx !== currentIndex}
            inert={idx !== currentIndex}
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
  onReorder: (
    draggedId: string,
    targetId: string,
    nextItems: T[],
  ) => Promise<void>,
  { suspendExternalSync = false }: { suspendExternalSync?: boolean } = {},
) => {
  const [optimisticItems, setOptimisticItems] = useState<T[] | null>(null);
  const items = optimisticItems ?? initialItems;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const revisionRef = useRef(0);

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
      const sourceItems = itemsRef.current;
      const nextItems =
        moveItemBeforeTarget(sourceItems, draggedId, targetId) ?? sourceItems;
      const revision = revisionRef.current + 1;
      revisionRef.current = revision;
      itemsRef.current = nextItems;
      setOptimisticItems(nextItems);
      try {
        await onReorder(draggedId, targetId, nextItems);
        if (revisionRef.current === revision) {
          setTimeout(() => {
            if (revisionRef.current === revision) {
              setOptimisticItems(null);
            }
          }, 0);
        }
      } catch (error) {
        if (revisionRef.current === revision) {
          setOptimisticItems(null);
        }
        throw error;
      }
    },
    [onReorder],
  );

  return { items, reorder };
};

type DateFnsLocaleLoader = () => Promise<Locale>;
const DATE_FNS_LOCALE_LOADERS: Record<Language, DateFnsLocaleLoader> = {
  ja: () => import("date-fns/locale/ja").then((module) => module.ja),
  en: () => import("date-fns/locale/en-US").then((module) => module.enUS),
  es: () => import("date-fns/locale/es").then((module) => module.es),
  de: () => import("date-fns/locale/de").then((module) => module.de),
  fr: () => import("date-fns/locale/fr").then((module) => module.fr),
  ko: () => import("date-fns/locale/ko").then((module) => module.ko),
  "zh-CN": () => import("date-fns/locale/zh-CN").then((module) => module.zhCN),
  hi: () => import("date-fns/locale/hi").then((module) => module.hi),
  ar: () => import("date-fns/locale/ar").then((module) => module.ar),
  "pt-BR": () => import("date-fns/locale/pt-BR").then((module) => module.ptBR),
  id: () => import("date-fns/locale/id").then((module) => module.id),
};
const dateFnsLocaleCache = new Map<Language, Locale>();

function useDateFnsLocale(language: Language): Locale | undefined {
  const [locale, setLocale] = useState<Locale | undefined>(() =>
    dateFnsLocaleCache.get(language),
  );

  useEffect(() => {
    let cancelled = false;
    const cachedLocale = dateFnsLocaleCache.get(language);
    if (cachedLocale) {
      setLocale(cachedLocale);
      return;
    }

    setLocale(undefined);
    DATE_FNS_LOCALE_LOADERS[language]()
      .then((loadedLocale) => {
        dateFnsLocaleCache.set(language, loadedLocale);
        if (!cancelled) {
          setLocale(loadedLocale);
        }
      })
      .catch((error) => {
        logException(`date-fns locale load failed: ${String(error)}`, false);
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return locale;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const loadedLocale = useDateFnsLocale(language);
  const resolvedLocale = locale ?? loadedLocale;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={clsx("ll-p-2", className)}
      locale={resolvedLocale}
      classNames={{
        months: "ll-flex ll-w-full ll-flex-col",
        month: "ll-w-full ll-space-y-4",
        month_caption:
          "ll-relative ll-flex ll-items-center ll-justify-center ll-pt-1",
        caption_label: "ll-text-sm ll-font-semibold",
        nav: "ll-flex ll-items-center ll-justify-between ll-space-x-1",
        button_previous:
          "ll-pressable ll-h-8 ll-w-8 ll-rounded-full ll-p-0 ll-text-gray-600 ll-hover-bg-gray-300 ll-hover-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-opacity-50 ll-dark-text-gray-300 ll-dark-hover-bg-gray-900 ll-dark-hover-text-gray-50 ll-dark-focus-visible-outline-gray-300",
        button_next:
          "ll-pressable ll-h-8 ll-w-8 ll-rounded-full ll-p-0 ll-text-gray-600 ll-hover-bg-gray-300 ll-hover-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-opacity-50 ll-dark-text-gray-300 ll-dark-hover-bg-gray-900 ll-dark-hover-text-gray-50 ll-dark-focus-visible-outline-gray-300",
        month_grid: "ll-w-full",
        weekdays: "ll-flex",
        weekday:
          "ll-flex-1 ll-text-0x8rem ll-font-medium ll-text-gray-600 ll-dark-text-gray-300",
        week: "ll-mt-2 ll-flex ll-w-full",
        day: "ll-relative ll-flex ll-h-9 ll-flex-1 ll-justify-center ll-p-0 ll-text-center ll-text-sm",
        day_button:
          "ll-calendar-day ll-h-9 ll-w-9 ll-rounded-full ll-p-0 ll-font-medium ll-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-aria-selected-bg-gray-900 ll-aria-selected-text-gray-50 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300 ll-dark-aria-selected-bg-gray-50 ll-dark-aria-selected-text-gray-900",
        selected: "ll-rounded-full ll-bg-gray-300 ll-dark-bg-white",
        today: "ll-border ll-border-gray-300 ll-dark-border-gray-700",
        outside: "ll-text-gray-400 ll-opacity-50 ll-dark-text-gray-500",
        disabled: "ll-text-gray-400 ll-opacity-50 ll-dark-text-gray-500",
        hidden: "ll-invisible",
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
  return undefined;
};

const taskDateFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getTaskDateFormatter = (language: string): Intl.DateTimeFormat => {
  const cachedFormatter = taskDateFormatterCache.get(language);
  if (cachedFormatter) return cachedFormatter;
  const formatter = new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  taskDateFormatterCache.set(language, formatter);
  return formatter;
};

function TaskItemComponent({
  task,
  isEditing,
  editingText,
  animateEnter,
  isExiting,
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
  animateEnter: boolean;
  isExiting: boolean;
  onEditingTextChange: (text: string) => void;
  onEditStart: (task: Task) => void;
  onEditEnd: (task: Task, text?: string) => void;
  onToggle: (task: Task) => void;
  onOpenTaskActions?: (task: Task, trigger: HTMLButtonElement | null) => void;
  onDragInteractionChange?: (active: boolean) => void;
}) {
  const completedTaskOpacity = 0.55;
  const { t, i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  });
  const rowOpacity =
    (isDragging ? 0.8 : 1) * (task.completed ? completedTaskOpacity : 1);
  const rowTransform = transform
    ? {
        ...transform,
        scaleX: isDragging ? 1.03 : transform.scaleX,
        scaleY: isDragging ? 1.03 : transform.scaleY,
      }
    : isDragging
      ? { x: 0, y: 0, scaleX: 1.03, scaleY: 1.03 }
      : null;
  const style = {
    transform: CSS.Transform.toString(rowTransform),
    transition: transition
      ? `${transition}, opacity 180ms ease`
      : "opacity 180ms ease",
    opacity: rowOpacity,
  };
  const [isHandlePointerDown, setIsHandlePointerDown] = useState(false);
  const animateEnterRef = useRef(animateEnter);
  const rowElementRef = useRef<HTMLDivElement | null>(null);
  const previousRowLayoutTopRef = useRef<number | null>(null);
  const previousRowViewportTopRef = useRef<number | null>(null);
  const layoutAnimationRef = useRef<Animation | null>(null);
  const setTaskRowRef = useCallback(
    (element: HTMLDivElement | null) => {
      setNodeRef(element);
      rowElementRef.current = element;
    },
    [setNodeRef],
  );
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const taskTextId = `task-item-text-${task.id}`;
  const selectedDate = parseTaskDateValue(task.date);
  const setDateLabel = t("pages.tasklist.setDate");
  const dateDisplayValue = selectedDate
    ? getTaskDateFormatter(i18n.language).format(selectedDate)
    : null;
  const dateTitle = dateDisplayValue
    ? `${setDateLabel}: ${dateDisplayValue}`
    : setDateLabel;
  const taskActionLabel = task.pinned
    ? t("pages.tasklist.unpinTask")
    : dateTitle;

  useIsomorphicLayoutEffect(() => {
    const element = rowElementRef.current;
    if (!element) return;
    if (transform !== null || isDragging) {
      layoutAnimationRef.current?.cancel();
      layoutAnimationRef.current = null;
      previousRowLayoutTopRef.current = null;
      previousRowViewportTopRef.current = null;
      return;
    }

    const nextLayoutTop = element.offsetTop;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (isExiting || prefersReducedMotion) {
      layoutAnimationRef.current?.cancel();
      layoutAnimationRef.current = null;
      previousRowLayoutTopRef.current = nextLayoutTop;
      previousRowViewportTopRef.current = element.getBoundingClientRect().top;
      return;
    }

    const previousLayoutTop = previousRowLayoutTopRef.current;
    if (previousLayoutTop === nextLayoutTop) return;

    const previousViewportTop = layoutAnimationRef.current
      ? element.getBoundingClientRect().top
      : previousRowViewportTopRef.current;
    layoutAnimationRef.current?.cancel();
    layoutAnimationRef.current = null;
    const nextViewportTop = element.getBoundingClientRect().top;
    previousRowLayoutTopRef.current = nextLayoutTop;
    previousRowViewportTopRef.current = nextViewportTop;
    if (previousViewportTop === null) return;

    const offset = previousViewportTop - nextViewportTop;
    if (Math.abs(offset) < 1) return;
    const animation = element.animate(
      [
        { transform: `translateY(${offset}px)` },
        { transform: "translateY(0)" },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
    layoutAnimationRef.current = animation;
    const clearAnimation = () => {
      if (layoutAnimationRef.current === animation) {
        layoutAnimationRef.current = null;
      }
    };
    animation.addEventListener("finish", clearAnimation, { once: true });
    animation.addEventListener("cancel", clearAnimation, { once: true });
  });

  useEffect(
    () => () => {
      layoutAnimationRef.current?.cancel();
    },
    [],
  );

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

  useEffect(() => {
    if (!isEditing) return;
    const input = editInputRef.current;
    if (!input) return;
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [isEditing]);

  return (
    <div
      ref={setTaskRowRef}
      style={style}
      className={clsx(
        "ll-task-row ll-flex ll-gap-2 ll-py-1x5",
        animateEnterRef.current && "ll-anim-task-enter",
        isExiting && "ll-anim-task-exit",
      )}
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
        className="ll-flex ll-touch-none ll-items-center ll-text-gray-400 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2"
      >
        <span className="ll-relative">
          <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
        </span>
      </button>
      <div className="ll-relative ll-flex ll-items-center ll-justify-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          aria-labelledby={taskTextId}
          className="ll-peer ll-absolute ll-inset-0 ll-z-10 ll-h-full ll-w-full ll-cursor-pointer ll-opacity-0"
        />
        <div className="ll-check-circle ll-flex ll-h-5 ll-w-5 ll-items-center ll-justify-center ll-rounded-full ll-border ll-border-gray-300 ll-bg-transparent ll-transition-colors ll-peer-checked-border-transparent ll-peer-checked-bg-gray-300 ll-peer-focus-visible-ring-2 ll-peer-focus-visible-ring-gray-600 ll-dark-border-gray-700 ll-dark-peer-checked-bg-gray-700" />
      </div>
      <div className="ll-relative ll-flex ll-min-w-0 ll-flex-1 ll-flex-col">
        {dateDisplayValue ? (
          <span
            className="ll-absolute ll-top-neg-2 ll-text-xs ll-leading-none ll-text-gray-600 ll-dark-text-gray-300"
            style={{ insetInlineStart: 0 }}
          >
            {dateDisplayValue}
          </span>
        ) : null}
        {isEditing ? (
          <input
            ref={editInputRef}
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
              "ll-min-w-0 ll-w-full ll-bg-transparent ll-p-0 ll-font-semibold ll-leading-7 ll-focus-outline-none",
              task.completed
                ? "ll-text-gray-600 ll-line-through ll-dark-text-gray-300"
                : "ll-text-gray-900 ll-dark-text-gray-50",
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
                ? "ll-task-text-wrap ll-block ll-min-h-7 ll-min-w-0 ll-cursor-pointer ll-text-start ll-font-semibold ll-leading-7 ll-text-gray-600 ll-line-through ll-underline-offset-4 ll-hover-underline ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
                : clsx(
                    "ll-task-text-wrap ll-block ll-min-h-7 ll-min-w-0 ll-cursor-pointer ll-text-start ll-leading-7 ll-text-gray-900 ll-underline-offset-4 ll-hover-underline ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300",
                    task.pinned ? "ll-font-bold" : "ll-font-semibold",
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
        aria-label={taskActionLabel}
        title={taskActionLabel}
        onClick={() => onOpenTaskActions?.(task, actionButtonRef.current)}
        className="ll-pressable ll-flex ll-items-center ll-rounded-lg ll-p-1 ll-text-gray-400 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300"
      >
        <span className="ll-relative ll-inline-flex">
          <AppIcon
            name={task.pinned ? "push-pin" : "calendar-today"}
            aria-hidden="true"
            focusable="false"
          />
        </span>
      </button>
    </div>
  );
}

const TaskItem = memo(TaskItemComponent);

const TASK_CARD_INPUT_CLASS =
  "ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white ll-px-3 ll-py-2 ll-text-gray-900 ll-focus-border-gray-600 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-300 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-900 ll-dark-text-gray-50 ll-dark-focus-border-gray-300 ll-dark-focus-ring-gray-700";
const TASK_CARD_PRIMARY_BUTTON_CLASS =
  "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-bg-gray-900 ll-px-4 ll-py-2 ll-font-semibold ll-text-gray-50 ll-hover-opacity-90 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-50 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-focus-visible-outline-gray-300";
const TASK_CARD_SECONDARY_BUTTON_CLASS =
  "ll-inline-flex ll-items-center ll-justify-center ll-h-12 ll-w-12 ll-rounded-xl ll-border-gray-300 ll-font-semibold ll-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300";
const TASK_CARD_DESTRUCTIVE_BUTTON_CLASS =
  "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-bg-red-600 ll-px-4 ll-py-2 ll-font-semibold ll-text-white ll-hover-opacity-90 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-red-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-50 ll-dark-bg-red-400 ll-dark-focus-visible-outline-red-400";
const TASK_CARD_ICON_BUTTON_CLASS = clsx(
  TASK_CARD_SECONDARY_BUTTON_CLASS,
  "ll-pressable ll-px-2",
);

function EditTaskListDialog({
  taskList,
  isActive,
  onActivate,
  onDeleted,
  canDelete = true,
}: {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
  onDeleted?: () => void;
  canDelete?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(taskList.name);
  const [background, setBackground] = useState<string | null>(
    taskList.background,
  );
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={isActive && open}
      onOpenChange={(nextOpen: boolean) => {
        onActivate?.(taskList.id);
        setOpen(nextOpen);
        if (nextOpen) {
          setName(taskList.name);
          setBackground(taskList.background);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => onActivate?.(taskList.id)}
          className={TASK_CARD_ICON_BUTTON_CLASS}
          aria-label={t("taskList.editDetails")}
          title={t("taskList.editDetails")}
        >
          <AppIcon name="edit" aria-hidden="true" focusable="false" />
          <span className="ll-sr-only">{t("taskList.editDetails")}</span>
        </button>
      </DialogTrigger>
      <DialogContent
        title={t("taskList.editDetails")}
        description={t("app.taskListName")}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            void updateTaskList(taskList.id, {
              ...(name.trim() !== taskList.name ? { name: name.trim() } : {}),
              ...(background !== taskList.background ? { background } : {}),
            })
              .then(() => setOpen(false))
              .catch((updateError) =>
                setError(resolveErrorMessage(updateError, t, "common.error")),
              );
          }}
        >
          <div className="ll-mt-4 ll-flex ll-flex-col ll-gap-3">
            {error ? <Alert variant="error">{error}</Alert> : null}
            <label className="ll-flex ll-flex-col ll-gap-1">
              <span>{t("app.taskListName")}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("app.taskListNamePlaceholder")}
                className={TASK_CARD_INPUT_CLASS}
              />
            </label>
            <div className="ll-flex ll-flex-col ll-gap-2">
              <span>{t("taskList.selectColor")}</span>
              <ColorPicker
                colors={COLORS}
                selectedColor={background ?? null}
                onSelect={setBackground}
                ariaLabelPrefix={t("taskList.selectColor")}
              />
            </div>
            {canDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(t("taskList.deleteListConfirm.message"))
                  ) {
                    return;
                  }
                  setDeleting(true);
                  setError(null);
                  void deleteTaskList(taskList.id)
                    .then(() => {
                      setOpen(false);
                      onDeleted?.();
                    })
                    .catch((deleteError) =>
                      setError(
                        resolveErrorMessage(deleteError, t, "common.error"),
                      ),
                    )
                    .finally(() => setDeleting(false));
                }}
                disabled={deleting}
                className={clsx(
                  TASK_CARD_DESTRUCTIVE_BUTTON_CLASS,
                  "ll-mt-6 ll-w-full",
                )}
              >
                {deleting ? t("common.deleting") : t("taskList.deleteList")}
              </button>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className={TASK_CARD_SECONDARY_BUTTON_CLASS}
              >
                {t("common.cancel")}
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={!name.trim()}
              className={TASK_CARD_PRIMARY_BUTTON_CLASS}
            >
              {t("taskList.editDetails")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShareTaskListDialog({
  taskList,
  isActive,
  onActivate,
}: {
  taskList: TaskList;
  isActive: boolean;
  onActivate?: (taskListId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(
    taskList.shareCode ? normalizeShareCode(taskList.shareCode) : null,
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setShareCode(
      taskList.shareCode ? normalizeShareCode(taskList.shareCode) : null,
    );
  }, [taskList.shareCode, open]);

  return (
    <Dialog
      open={isActive && open}
      onOpenChange={(nextOpen: boolean) => {
        onActivate?.(taskList.id);
        setOpen(nextOpen);
        if (nextOpen) {
          setShareCode(
            taskList.shareCode ? normalizeShareCode(taskList.shareCode) : null,
          );
          setCopySuccess(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => onActivate?.(taskList.id)}
          className={TASK_CARD_ICON_BUTTON_CLASS}
          aria-label={t("taskList.share")}
          title={t("taskList.share")}
        >
          <AppIcon name="share" aria-hidden="true" focusable="false" />
          <span className="ll-sr-only">{t("taskList.share")}</span>
        </button>
      </DialogTrigger>
      <DialogContent
        title={t("taskList.shareTitle")}
        description={t("taskList.shareDescription")}
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
        {shareCode ? (
          <div className="ll-mt-4 ll-flex ll-flex-col ll-gap-3">
            <label className="ll-flex ll-flex-col ll-gap-1x5">
              <span>{t("taskList.shareCode")}</span>
              <div className="ll-flex ll-flex-wrap ll-gap-2">
                <input
                  type="text"
                  value={shareCode}
                  readOnly
                  className={clsx(TASK_CARD_INPUT_CLASS, "ll-font-mono")}
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/sharecodes/?code=${shareCode}`,
                      );
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    } catch {
                      setError(t("common.error"));
                    }
                  }}
                  className={TASK_CARD_SECONDARY_BUTTON_CLASS}
                >
                  {copySuccess ? t("common.copied") : t("common.copy")}
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={() => {
                setRemoving(true);
                setError(null);
                void removeShareCode(taskList.id)
                  .then(() => {
                    setShareCode(null);
                    logShareCodeRemove();
                  })
                  .catch((removeError) =>
                    setError(
                      resolveErrorMessage(removeError, t, "common.error"),
                    ),
                  )
                  .finally(() => setRemoving(false));
              }}
              disabled={removing}
              className={TASK_CARD_DESTRUCTIVE_BUTTON_CLASS}
            >
              {removing ? t("common.deleting") : t("taskList.removeShare")}
            </button>
          </div>
        ) : (
          <div className="ll-mt-4 ll-flex ll-flex-col ll-gap-3">
            <button
              type="button"
              onClick={() => {
                setGenerating(true);
                setError(null);
                void generateShareCode(taskList.id)
                  .then((code) => {
                    setShareCode(code);
                    logShareCodeGenerate();
                  })
                  .catch((generateError) =>
                    setError(
                      resolveErrorMessage(generateError, t, "common.error"),
                    ),
                  )
                  .finally(() => setGenerating(false));
              }}
              disabled={generating}
              className={TASK_CARD_PRIMARY_BUTTON_CLASS}
            >
              {generating ? t("common.loading") : t("taskList.generateShare")}
            </button>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className={TASK_CARD_SECONDARY_BUTTON_CLASS}>
              {t("common.close")}
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskListCard({
  taskList,
  autoSort,
  taskInsertPosition,
  isActive,
  shouldFocusNewTaskInput,
  onNewTaskInputFocusChange,
  onActivate,
  sensorsList,
  onSortingChange,
  onDragInteractionChange,
  onDeleted,
  canDeleteTaskList = true,
  activeTaskActionTaskId,
  onOpenTaskAction,
  onCloseTaskAction,
}: {
  taskList: TaskList;
  autoSort: boolean;
  taskInsertPosition: TaskInsertPosition;
  isActive: boolean;
  shouldFocusNewTaskInput: boolean;
  onNewTaskInputFocusChange: (taskListId: string, isFocused: boolean) => void;
  onActivate?: (taskListId: string) => void;
  sensorsList: SensorDescriptor<SensorOptions>[];
  onSortingChange?: (sorting: boolean) => void;
  onDragInteractionChange?: (active: boolean) => void;
  onDeleted?: () => void;
  canDeleteTaskList?: boolean;
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
  const pendingTasksRef = useRef<Task[] | null>(null);
  const baseTasks = pendingTasks ?? taskList.tasks;
  const taskListTasksRef = useRef(taskList.tasks);
  taskListTasksRef.current = taskList.tasks;
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    baseTasks,
    (draggedId, targetId) => updateTasksOrder(taskList.id, draggedId, targetId),
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const editingTaskIdRef = useRef<string | null>(null);
  editingTaskIdRef.current = editingTaskId;
  const [newTaskText, setNewTaskText] = useState("");
  const deferredNewTaskText = useDeferredValue(newTaskText);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteCompletedPending, setDeleteCompletedPending] = useState(false);
  const [exitingTaskIds, setExitingTaskIds] =
    useState<ReadonlySet<string> | null>(null);
  const knownTaskIdsRef = useRef<ReadonlySet<string> | null>(null);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
  const newTaskFormRef = useRef<HTMLFormElement | null>(null);
  const taskActionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousTaskActionTaskIdRef = useRef<string | null>(null);

  const handleTaskListClickCapture = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!isInputFocused) return;
      const target = event.target;
      if (target instanceof Node && newTaskFormRef.current?.contains(target)) {
        return;
      }
      newTaskInputRef.current?.blur();
    },
    [isInputFocused],
  );

  useEffect(() => {
    if (isActive && shouldFocusNewTaskInput) {
      newTaskInputRef.current?.focus();
    }
  }, [isActive, shouldFocusNewTaskInput]);

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
    if (taskListMutationQueues.has(taskList.id)) return;
    if (areTasksEqual(pendingTasks, normalizePendingTasks(taskList.tasks))) {
      pendingTasksRef.current = null;
      setPendingTasks(null);
    }
  }, [normalizePendingTasks, pendingTasks, taskList.tasks]);

  useEffect(() => {
    if (isActive) return;
    onDragInteractionChange?.(false);
  }, [isActive, onDragInteractionChange]);

  const knownTaskIds = knownTaskIdsRef.current;
  useEffect(() => {
    knownTaskIdsRef.current = new Set(tasks.map((task) => task.id));
  }, [tasks]);

  const applyPendingTasks = useCallback(
    (buildNextTasks: (currentTasks: Task[]) => Task[]) => {
      const current = pendingTasksRef.current ?? taskListTasksRef.current;
      const nextTasks = normalizePendingTasks(buildNextTasks(current));
      pendingTasksRef.current = nextTasks;
      setPendingTasks(nextTasks);
    },
    [normalizePendingTasks],
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
        if (!taskListMutationQueues.has(taskList.id)) {
          pendingTasksRef.current = null;
          setPendingTasks(null);
        }
        onError?.(error);
      } finally {
        if (!taskListMutationQueues.has(taskList.id)) {
          setTimeout(() => {
            if (!taskListMutationQueues.has(taskList.id)) {
              pendingTasksRef.current = null;
              setPendingTasks(null);
            }
          }, 0);
        }
      }
    },
    [applyPendingTasks, taskList.id],
  );

  const runTaskMutationRef = useRef(runTaskMutation);
  runTaskMutationRef.current = runTaskMutation;

  const historyOptions = useMemo(() => {
    const input = deferredNewTaskText.trim();
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
  }, [deferredNewTaskText, taskList.history]);

  useEffect(() => {
    if (historyOptions.length === 0) setHistoryOpen(false);
  }, [historyOptions.length]);

  const completedTaskCount = tasks.reduce(
    (count, task) => count + (task.completed ? 1 : 0),
    0,
  );
  const historyListId = `task-history-${reactId.replace(/:/g, "")}`;
  const activeTaskActionTask = useMemo(
    () =>
      activeTaskActionTaskId === null || activeTaskActionTaskId === undefined
        ? null
        : (tasks.find((task) => task.id === activeTaskActionTaskId) ?? null),
    [activeTaskActionTaskId, tasks],
  );
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

  const taskDndAccessibility = useMemo(
    () =>
      buildDndAccessibility(
        t,
        (id) => tasks.find((task) => task.id === id)?.text ?? "",
        () => tasks.map((task) => task.id),
      ),
    [t, tasks],
  );

  const addNewTask = (textToAdd: string, textOnError: string) => {
    const parsed = resolveTaskInput(
      textToAdd,
      normalizeLanguage(i18n.language),
    );
    const optimisticTask = {
      id: crypto.randomUUID(),
      text: parsed.text,
      completed: false,
      date: parsed.date,
      pinned: parsed.pinned,
    } satisfies Task;
    setHistoryOpen(false);
    setNewTaskText("");
    setAddTaskError(null);
    newTaskInputRef.current?.focus();
    void runTaskMutation({
      buildNextTasks: (currentTasks) =>
        taskInsertPosition === "top"
          ? [optimisticTask, ...currentTasks]
          : [...currentTasks, optimisticTask],
      commit: () =>
        addTask(taskList.id, textToAdd, resolvedTaskSettings, {
          taskId: optimisticTask.id,
        }),
      onSuccess: () => {
        logTaskAdd({ has_date: Boolean(parsed.date) });
      },
      onError: (error) => {
        setNewTaskText((current) => (current === "" ? textOnError : current));
        setAddTaskError(resolveErrorMessage(error, t, "common.error"));
      },
    });
  };

  const updateTaskFromAction = (
    task: Task,
    updates: Partial<Pick<Task, "date" | "pinned">>,
    field: "date" | "pinned",
  ) => {
    void runTaskMutation({
      buildNextTasks: (currentTasks) =>
        currentTasks.map((current) =>
          current.id === task.id ? { ...current, ...updates } : current,
        ),
      commit: () =>
        updateTask(taskList.id, task.id, updates, resolvedTaskSettings),
      onSuccess: () => {
        logTaskUpdate({ fields: field });
        onCloseTaskAction?.();
      },
      onError: (error) => {
        setTaskError(resolveErrorMessage(error, t, "common.error"));
      },
    });
  };

  return (
    <section
      className={clsx(
        "ll-h-full ll-overflow-y-auto",
        isActive ? "ll-pointer-events-auto" : "ll-pointer-events-none",
      )}
      onClickCapture={handleTaskListClickCapture}
      style={{ backgroundColor: taskList.background ?? undefined }}
    >
      <div className="ll-min-h-full ll-px-4">
        <div className="ll-flex ll-flex-col ll-gap-4">
          <div className="ll-flex ll-flex-col ll-gap-4">
            <div className="ll-flex ll-flex-col ll-gap-4">
              <div className="ll-flex ll-flex-wrap ll-items-center ll-justify-between ll-gap-3">
                <div className="ll-flex ll-flex-col ll-gap-1x5">
                  <h2 className="ll-font-display ll-m-0 ll-text-xl ll-font-semibold">
                    {taskList.name}
                  </h2>
                </div>
                <div className="ll-relative ll-left-2 ll-flex ll-flex-wrap ll-justify-end">
                  <EditTaskListDialog
                    taskList={taskList}
                    isActive={isActive}
                    onActivate={onActivate}
                    onDeleted={onDeleted}
                    canDelete={canDeleteTaskList}
                  />
                  <ShareTaskListDialog
                    taskList={taskList}
                    isActive={isActive}
                    onActivate={onActivate}
                  />
                </div>
              </div>
              {taskError ? <Alert variant="error">{taskError}</Alert> : null}
            </div>
            <form
              ref={newTaskFormRef}
              className="ll-flex ll-items-center"
              onSubmit={(event) => {
                event.preventDefault();
                const textToAdd = newTaskText.trim();
                if (textToAdd === "") return;
                addNewTask(textToAdd, textToAdd);
              }}
            >
              <div className="ll-relative ll-min-w-0 ll-flex-1">
                <CommandPrimitive
                  shouldFilter={false}
                  className="ll-bg-transparent"
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
                      onNewTaskInputFocusChange(taskList.id, true);
                    }}
                    onBlur={() => {
                      setHistoryOpen(false);
                      setIsInputFocused(false);
                      onNewTaskInputFocusChange(taskList.id, false);
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
                    className="ll-w-full ll-rounded-14px ll-border ll-border-gray-300 ll-bg-white-92 ll-px-3x5 ll-py-2x5 ll-text-gray-900 ll-shadow-sm ll-focus-border-gray-600 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-300 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-900-92 ll-dark-text-gray-50 ll-dark-focus-border-gray-300 ll-dark-focus-ring-gray-700"
                  />
                  {historyOpen && historyOptions.length > 0 ? (
                    <CommandPrimitive.List
                      id={historyListId}
                      className="ll-anim-pop ll-absolute ll-left-0 ll-right-0 ll-top-full ll-z-50 ll-mt-1 ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white-b ll-p-1 ll-shadow-lg ll-dark-border-gray-700 ll-dark-bg-gray-900b"
                    >
                      {historyOptions.map((text) => (
                        <CommandPrimitive.Item
                          key={text}
                          value={text}
                          onMouseDown={(event: MouseEvent<HTMLDivElement>) =>
                            event.preventDefault()
                          }
                          onSelect={() => {
                            const previousText = newTaskText;
                            addNewTask(text, previousText);
                          }}
                          className="ll-cursor-pointer ll-rounded-lg ll-px-3 ll-py-2 ll-text-sm ll-outline-none ll-data-selected-bg-gray-50 ll-dark-data-selected-bg-gray-950"
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
                  "ll-pressable ll-inline-flex ll-h-10 ll-shrink-0b ll-items-center ll-justify-center ll-overflow-hidden ll-rounded-xl ll-text-gray-400 ll-transition-all ll-duration-300 ll-ease-in-out ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300 ll-dark-disabled-opacity-50",
                  isInputFocused
                    ? "ll-ml-2 ll-w-8 ll-pointer-events-auto ll-opacity-100"
                    : "ll-ml-0 ll-w-0 ll-pointer-events-none ll-opacity-0",
                )}
              >
                <span className="ll-sr-only">{t("common.add")}</span>
                <span className="ll-relative ll-left-px">
                  <AppIcon name="send" aria-hidden="true" focusable="false" />
                </span>
              </button>
            </form>
            {addTaskError ? (
              <Alert variant="error">{addTaskError}</Alert>
            ) : null}
            <div className="ll-flex ll-items-center ll-justify-between ll-gap-2 ll-pb-6">
              <button
                type="button"
                disabled={tasks.length < 2}
                onClick={() => {
                  void runTaskMutation({
                    buildNextTasks: (currentTasks) => {
                      if (autoSort) return currentTasks;
                      const asStore = currentTasks.map((task, index) => ({
                        ...task,
                        order: (index + 1) * 1.0,
                      }));
                      const sorted = getAutoSortedTasks(asStore);
                      return sorted.map(
                        ({ id, text, completed, date, pinned }) => ({
                          id,
                          text,
                          completed,
                          date,
                          pinned,
                        }),
                      );
                    },
                    commit: () => sortTasks(taskList.id),
                    onSuccess: () => logTaskSort(),
                    onError: (error) => {
                      setTaskError(
                        resolveErrorMessage(error, t, "common.error"),
                      );
                    },
                  });
                }}
                className="ll-pressable ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-font-medium ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300"
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
                  if (
                    !window.matchMedia("(prefers-reduced-motion: reduce)")
                      .matches
                  ) {
                    setExitingTaskIds(
                      new Set(
                        tasks
                          .filter((task) => task.completed)
                          .map((task) => task.id),
                      ),
                    );
                    await new Promise((resolve) => setTimeout(resolve, 120));
                  }
                  await runTaskMutationRef
                    .current({
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
                    })
                    .finally(() => {
                      setDeleteCompletedPending(false);
                      setExitingTaskIds(null);
                    });
                }}
                className="ll-pressable ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-font-medium ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-red-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-text-gray-50 ll-dark-focus-visible-outline-red-400"
              >
                {deleteCompletedPending
                  ? t("common.deleting")
                  : t("pages.tasklist.deleteCompleted")}
                <span className="ll-pr-1">
                  <AppIcon name="delete" aria-hidden="true" focusable="false" />
                </span>
              </button>
            </div>
          </div>
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            accessibility={taskDndAccessibility}
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
                <p className="ll-text-gray-600 ll-dark-text-gray-300">
                  {t("pages.tasklist.noTasks")}
                </p>
              ) : (
                <div className="ll-flex ll-flex-col ll-gap-1">
                  {tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      animateEnter={
                        knownTaskIds !== null && !knownTaskIds.has(task.id)
                      }
                      isExiting={exitingTaskIds?.has(task.id) ?? false}
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
                        const currentTask =
                          pendingTasksRef.current?.find(
                            (current) => current.id === task.id,
                          ) ?? task;
                        const nextCompleted = !currentTask.completed;
                        void runTaskMutation({
                          buildNextTasks: (currentTasks) =>
                            currentTasks.map((currentTask) =>
                              currentTask.id === task.id
                                ? {
                                    ...currentTask,
                                    completed: nextCompleted,
                                  }
                                : currentTask,
                            ),
                          commit: () =>
                            updateTask(
                              taskList.id,
                              task.id,
                              { completed: nextCompleted },
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
                ? `${t("pages.tasklist.setDate")}: ${getTaskDateFormatter(
                    i18n.language,
                  ).format(
                    parseTaskDateValue(activeTaskActionTask.date) ?? new Date(),
                  )}`
                : t("pages.tasklist.setDate"),
            ].join(" / ")}
          >
            <div className="ll-flex ll-min-h-0 ll-flex-1 ll-flex-col ll-gap-3">
              <div className="ll-flex ll-min-h-11 ll-items-center ll-justify-end">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="ll-inline-flex ll-min-h-11 ll-items-center ll-rounded-xl ll-px-2 ll-text-sm ll-font-semibold ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
                  >
                    {t("common.close")}
                  </button>
                </DialogPrimitive.Close>
              </div>
              <button
                type="button"
                aria-pressed={activeTaskActionTask.pinned}
                aria-label={
                  activeTaskActionTask.pinned
                    ? t("pages.tasklist.unpinTask")
                    : t("pages.tasklist.pinTask")
                }
                onClick={() => {
                  updateTaskFromAction(
                    activeTaskActionTask,
                    { pinned: !activeTaskActionTask.pinned },
                    "pinned",
                  );
                }}
                className="ll-flex ll-min-h-12 ll-w-full ll-items-center ll-justify-between ll-rounded-xl ll-bg-gray-50 ll-px-4 ll-py-3 ll-text-start ll-text-sm ll-font-semibold ll-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-bg-gray-950 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300"
              >
                <span className="ll-flex ll-items-center ll-gap-3">
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
                <span
                  aria-hidden="true"
                  className={clsx(
                    "ll-flex ll-h-5 ll-w-5 ll-items-center ll-justify-center ll-rounded-full ll-border",
                    activeTaskActionTask.pinned
                      ? "ll-border-gray-900 ll-bg-gray-900 ll-text-gray-50 ll-dark-border-gray-50 ll-dark-bg-gray-50 ll-dark-text-gray-900"
                      : "ll-border-gray-300 ll-dark-border-gray-700",
                  )}
                >
                  {activeTaskActionTask.pinned ? (
                    <AppIcon
                      name="check"
                      size={14}
                      aria-hidden="true"
                      focusable="false"
                    />
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                disabled={!activeTaskActionTask.date}
                onClick={() => {
                  if (!activeTaskActionTask.date) return;
                  updateTaskFromAction(
                    activeTaskActionTask,
                    { date: "" },
                    "date",
                  );
                }}
                className="ll-inline-flex ll-min-h-11 ll-w-fit ll-items-center ll-self-start ll-rounded-xl ll-px-2 ll-text-sm ll-font-semibold ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-opacity-50 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
              >
                {t("pages.tasklist.clearDate")}
              </button>
              <div className="ll-min-h-0 ll-flex-1 ll-overflow-y-auto ll-rounded-xl ll-bg-gray-50 ll-p-3 ll-dark-bg-gray-950">
                <Calendar
                  mode="single"
                  selected={parseTaskDateValue(activeTaskActionTask.date)}
                  onSelect={(next) => {
                    const nextDate = next ? formatDate(next) : "";
                    updateTaskFromAction(
                      activeTaskActionTask,
                      { date: nextDate },
                      "date",
                    );
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
  const pendingInitialTaskListRoute = route.view === "unknown";
  return {
    currentView: pendingInitialTaskListRoute ? "detail" : currentRoute.view,
    selectedTaskListId:
      currentRoute.view === "detail" ? currentRoute.taskListId : null,
    activeTaskAction:
      currentRoute.view === "detail"
        ? readTaskActionHistoryState(window.history.state)
        : null,
    pendingInitialTaskListRoute,
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
        "ll-flex ll-items-center ll-gap-2 ll-rounded-10px ll-p-2",
        isActive ? "ll-bg-gray-50 ll-dark-bg-gray-900b" : "ll-bg-transparent",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="ll-flex ll-touch-none ll-items-center ll-rounded-lg ll-p-1 ll-text-gray-600 ll-hover-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-300 ll-dark-hover-text-gray-50 ll-dark-focus-visible-outline-gray-300"
      >
        <AppIcon name="drag-indicator" aria-hidden="true" focusable="false" />
      </button>

      <span
        aria-hidden="true"
        className="ll-h-3 ll-w-3 ll-rounded-full ll-border ll-border-gray-300 ll-dark-border-gray-700"
        style={{
          backgroundColor: resolveTaskListBackground(taskList.background),
        }}
      />

      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        className="ll-flex ll-flex-1 ll-flex-col ll-items-start ll-gap-0x5 ll-text-start"
      >
        <span className={clsx(isActive ? "ll-font-bold" : "ll-font-medium")}>
          {taskList.name}
        </span>
        <span className="ll-text-xs ll-text-gray-600 ll-dark-text-gray-300">
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
  onToggleComplete: () => void;
  onOpenActions: () => void;
  itemRef: (element: HTMLDivElement | null) => void;
  isHighlighted: boolean;
};

function CalendarTaskItem({
  task,
  onOpenTaskList,
  onSelectDate,
  onToggleComplete,
  onOpenActions,
  itemRef,
  isHighlighted,
}: CalendarTaskItemProps) {
  const { t } = useTranslation();
  const dateDisplayValue = useMemo(() => {
    const lang = document.documentElement.lang || "ja";
    return getTaskDateFormatter(lang).format(task.dateValue);
  }, [task.dateValue]);

  return (
    <div
      ref={itemRef}
      className={clsx(
        "ll-calendar-task-row ll-flex ll-items-center ll-gap-2 ll-border-b ll-border-gray-300 ll-px-4 ll-py-2x5 ll-last-border-b-0 ll-dark-border-gray-700",
        isHighlighted && "ll-bg-gray-50 ll-dark-bg-gray-700",
      )}
    >
      <div className="ll-relative ll-flex ll-items-center ll-justify-center">
        <input
          type="checkbox"
          checked={task.task.completed}
          onChange={onToggleComplete}
          aria-label={`${t("pages.tasklist.markComplete")}: ${task.task.text}`}
          className="ll-peer ll-absolute ll-inset-0 ll-z-10 ll-h-full ll-w-full ll-cursor-pointer ll-opacity-0"
        />
        <div className="ll-check-circle ll-flex ll-h-5 ll-w-5 ll-items-center ll-justify-center ll-rounded-full ll-border ll-border-gray-300 ll-bg-transparent ll-transition-colors ll-peer-checked-border-transparent ll-peer-checked-bg-gray-300 ll-peer-focus-visible-ring-2 ll-peer-focus-visible-ring-gray-600 ll-dark-border-gray-700 ll-dark-peer-checked-bg-gray-700" />
      </div>
      <div className="ll-flex ll-min-w-0 ll-flex-1 ll-flex-col ll-gap-1">
        <div className="ll-flex ll-min-w-0 ll-items-center ll-justify-between ll-gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(task.dateValue)}
            className="ll-shrink-0b ll-rounded-md ll-text-xs ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
          >
            {dateDisplayValue}
          </button>
          <button
            type="button"
            onClick={() => onOpenTaskList(task.taskListId)}
            className="ll-inline-flex ll-min-w-0 ll-items-center ll-justify-end ll-gap-2 ll-rounded-md ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300"
          >
            <span
              aria-hidden="true"
              className="ll-h-4 ll-w-4 ll-shrink-0b ll-rounded-full ll-border ll-border-gray-300 ll-dark-border-gray-700"
              style={{ backgroundColor: task.taskListBackground }}
            />
            <span className="ll-truncate ll-text-xs ll-font-medium ll-text-gray-900 ll-dark-text-gray-50">
              {task.taskListName}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelectDate(task.dateValue)}
          className="ll-task-text-wrap ll-rounded-md ll-text-start ll-font-medium ll-leading-6 ll-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300"
        >
          {task.task.text}
        </button>
      </div>
      <button
        type="button"
        aria-label={t("a11y.editTask")}
        title={t("a11y.editTask")}
        onClick={onOpenActions}
        className="ll-pressable ll-flex ll-items-center ll-rounded-lg ll-p-1 ll-text-gray-400 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300"
      >
        <span className="ll-relative ll-inline-flex">
          <AppIcon name="edit" aria-hidden="true" focusable="false" />
        </span>
      </button>
    </div>
  );
}

type CalendarScreenProps = {
  showCompactHeaderOffset?: boolean;
  taskLists: TaskList[];
  taskSettings: ResolvedTaskSettings;
  defaultTaskListId: string | null;
  onSelectTaskList: (taskListId: string) => void;
};

function CalendarScreen({
  showCompactHeaderOffset = false,
  taskLists,
  taskSettings,
  defaultTaskListId,
  onSelectTaskList,
}: CalendarScreenProps) {
  const { t, i18n } = useTranslation();
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    Date | undefined
  >(undefined);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => new Date());
  const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);
  const [addTaskText, setAddTaskText] = useState("");
  const [addTaskListId, setAddTaskListId] = useState(
    defaultTaskListId ?? taskLists[0]?.id ?? "",
  );
  const [addingTask, setAddingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [optimisticDatedTasks, setOptimisticDatedTasks] = useState<DatedTask[]>(
    [],
  );
  const [actionTask, setActionTask] = useState<DatedTask | null>(null);
  const [actionText, setActionText] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const datedTaskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const completeTask = (task: DatedTask) => {
    logTaskUpdate({ fields: "completed" });
    setUpdateError(null);
    void updateTask(
      task.taskListId,
      task.task.id,
      { completed: true },
      taskSettings,
    ).catch((error) =>
      setUpdateError(resolveErrorMessage(error, t, "common.error")),
    );
  };

  const applyTaskAction = (
    updates: Partial<Pick<Task, "completed" | "date" | "pinned" | "text">>,
    fields: string,
  ) => {
    if (!actionTask || savingAction) return;
    logTaskUpdate({ fields });
    setSavingAction(true);
    setActionError(null);
    void updateTask(actionTask.taskListId, actionTask.task.id, updates, taskSettings)
      .then(() => setActionTask(null))
      .catch((error) =>
        setActionError(resolveErrorMessage(error, t, "common.error")),
      )
      .finally(() => setSavingAction(false));
  };

  useEffect(() => {
    if (taskLists.some((taskList) => taskList.id === addTaskListId)) return;
    setAddTaskListId(defaultTaskListId ?? taskLists[0]?.id ?? "");
  }, [addTaskListId, defaultTaskListId, taskLists]);

  useEffect(() => {
    const loadedTaskIds = new Set(
      taskLists.flatMap((taskList) =>
        taskList.tasks.map((task) => `${taskList.id}:${task.id}`),
      ),
    );
    setOptimisticDatedTasks((current) =>
      current.filter(
        (task) => !loadedTaskIds.has(`${task.taskListId}:${task.task.id}`),
      ),
    );
  }, [taskLists]);

  const datedTasks = useMemo<DatedTask[]>(() => {
    const flattened: DatedTask[] = [];
    for (const [taskListIndex, taskList] of taskLists.entries()) {
      for (const [taskIndex, task] of taskList.tasks.entries()) {
        if (task.completed) continue;
        const parsedDate = parseTaskDate(task.date);
        if (!parsedDate) continue;
        flattened.push({
          taskListId: taskList.id,
          taskListName: taskList.name,
          taskListBackground: resolveTaskListBackground(taskList.background),
          task,
          dateValue: parsedDate,
          dateKey: formatDate(parsedDate),
          taskListIndex,
          taskIndex,
        });
      }
    }
    const loadedTaskIds = new Set(
      flattened.map((task) => `${task.taskListId}:${task.task.id}`),
    );
    for (const task of optimisticDatedTasks) {
      if (!loadedTaskIds.has(`${task.taskListId}:${task.task.id}`)) {
        flattened.push(task);
      }
    }
    flattened.sort((left, right) => {
      const byDate = left.dateValue.getTime() - right.dateValue.getTime();
      if (byDate !== 0) return byDate;
      const byTaskList = left.taskListIndex - right.taskListIndex;
      if (byTaskList !== 0) return byTaskList;
      return left.taskIndex - right.taskIndex;
    });
    return flattened;
  }, [optimisticDatedTasks, taskLists]);

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
    () => (selectedCalendarDate ? formatDate(selectedCalendarDate) : null),
    [selectedCalendarDate],
  );

  const handleSelectCalendarDate = (
    next: Date | undefined,
    tasksInMonth: DatedTask[],
  ) => {
    setSelectedCalendarDate(next);
    if (!next) return;
    const dateKey = formatDate(next);
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

  const displayedMonthKey = formatMonthKey(displayedMonth);
  const visibleDatedTasks = datedTasksByMonth[displayedMonthKey] ?? [];
  const calendarTaskDates = monthTaskDates[displayedMonthKey] ?? [];
  const dateDotColors = monthDateDotColors[displayedMonthKey] ?? {};

  return (
    <section className="ll-flex ll-h-full ll-min-h-0 ll-flex-col ll-bg-gray-50 ll-dark-bg-gray-950">
      <div className="ll-flex ll-h-full ll-min-h-0 ll-flex-col ll-p-4">
        {showCompactHeaderOffset ? <div className="ll-h-88px" /> : null}
        <div
          className={clsx(
            "ll-min-h-0 ll-flex-1 ll-overflow-y-auto ll-pb-12",
            "ll-lg-grid ll-lg-grid-cols-main",
            "ll-flex ll-flex-col ll-gap-3",
          )}
        >
          <div className="ll-w-full ll-lg-sticky ll-lg-top-0 ll-lg-self-start">
            <Calendar
              className="ll-w-full"
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
                  const dateKey = formatDate(props.day.date);
                  const colors = dateDotColors[dateKey] ?? [];
                  return (
                    <DayPickerDayButton {...props}>
                      <span className="ll-relative ll-flex ll-h-full ll-w-full ll-items-center ll-justify-center">
                        <span className={clsx(colors.length > 0 && "ll-pb-2")}>
                          {props.day.date.getDate()}
                        </span>
                        {colors.length > 0 ? (
                          <span className="ll-pointer-events-none ll-absolute ll-bottom-1 ll-left-half ll-flex ll-translate-x-neg-half ll-gap-0x5">
                            {colors.map((color, index) => (
                              <span
                                key={`${dateKey}-${color}-${index}`}
                                className="ll-h-1x5 ll-w-1x5 ll-rounded-full"
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
            {selectedCalendarDate ? (
              <button
                type="button"
                onClick={() => {
                  setAddTaskDate(selectedCalendarDate);
                  setAddTaskError(null);
                }}
                className="ll-pressable ll-mt-2 ll-inline-flex ll-min-h-11 ll-w-full ll-items-center ll-justify-center ll-rounded-xl ll-bg-gray-900 ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-focus-visible-outline-gray-300"
              >
                {getTaskDateFormatter(i18n.language).format(
                  selectedCalendarDate,
                )}{" "}
                · {t("a11y.addTask")}
              </button>
            ) : null}
          </div>
          <div className="ll-min-h-0 ll-overflow-y-auto ll-rounded-xl ll-bg-white-b ll-dark-bg-gray-900b ll-lg-h-full">
            {updateError ? (
              <div className="ll-p-4">
                <Alert variant="error">{updateError}</Alert>
              </div>
            ) : null}
            {visibleDatedTasks.length > 0 ? (
              visibleDatedTasks.map((task) => {
                const taskId = getDatedTaskId(task);
                return (
                  <CalendarTaskItem
                    key={taskId}
                    task={task}
                    onOpenTaskList={onSelectTaskList}
                    onSelectDate={(date) =>
                      handleSelectCalendarDate(date, visibleDatedTasks)
                    }
                    onToggleComplete={() => completeTask(task)}
                    onOpenActions={() => {
                      setActionTask(task);
                      setActionText(task.task.text);
                      setActionError(null);
                    }}
                    isHighlighted={selectedCalendarDateKey === task.dateKey}
                    itemRef={(element) => {
                      datedTaskRefs.current[taskId] = element;
                    }}
                  />
                );
              })
            ) : (
              <p className="ll-p-4 ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
                {t("app.calendarNoDatedTasks")}
              </p>
            )}
          </div>
        </div>
      </div>
      <Dialog
        open={addTaskDate !== null}
        onOpenChange={(open: boolean) => {
          if (!open && !addingTask) {
            setAddTaskDate(null);
            setAddTaskError(null);
          }
        }}
      >
        {addTaskDate ? (
          <ActionSheetContent
            title={t("a11y.addTask")}
            description={getTaskDateFormatter(i18n.language).format(
              addTaskDate,
            )}
          >
            <form
              className="ll-flex ll-min-h-0 ll-flex-1 ll-flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                const textToAdd = addTaskText.trim();
                const targetTaskList = taskLists.find(
                  (taskList) => taskList.id === addTaskListId,
                );
                if (!textToAdd || !targetTaskList || addingTask) return;

                const parsed = resolveTaskInput(
                  textToAdd,
                  taskSettings.language,
                );
                const taskId = crypto.randomUUID();
                const dateKey = formatDate(addTaskDate);
                const optimisticTask: DatedTask = {
                  taskListId: targetTaskList.id,
                  taskListName: targetTaskList.name,
                  taskListBackground: resolveTaskListBackground(
                    targetTaskList.background,
                  ),
                  task: {
                    id: taskId,
                    text: parsed.text,
                    completed: false,
                    date: dateKey,
                    pinned: parsed.pinned,
                  },
                  dateValue: addTaskDate,
                  dateKey,
                  taskListIndex: taskLists.findIndex(
                    (taskList) => taskList.id === targetTaskList.id,
                  ),
                  taskIndex:
                    taskSettings.taskInsertPosition === "top"
                      ? -1
                      : targetTaskList.tasks.length,
                };
                setAddingTask(true);
                setAddTaskError(null);
                setOptimisticDatedTasks((current) => [
                  ...current,
                  optimisticTask,
                ]);
                void addTask(targetTaskList.id, textToAdd, taskSettings, {
                  taskId,
                  date: dateKey,
                })
                  .then(() => {
                    logTaskAdd({ has_date: true });
                    setAddTaskText("");
                    setAddTaskDate(null);
                  })
                  .catch((error) => {
                    setOptimisticDatedTasks((current) =>
                      current.filter((task) => task.task.id !== taskId),
                    );
                    setAddTaskError(
                      resolveErrorMessage(error, t, "common.error"),
                    );
                  })
                  .finally(() => setAddingTask(false));
              }}
            >
              <div className="ll-flex ll-min-h-11 ll-items-center ll-justify-between ll-gap-3">
                <span className="ll-text-sm ll-font-semibold">
                  {getTaskDateFormatter(i18n.language).format(addTaskDate)}
                </span>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    disabled={addingTask}
                    className="ll-inline-flex ll-min-h-11 ll-items-center ll-rounded-xl ll-px-2 ll-text-sm ll-font-semibold ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-opacity-50 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
                  >
                    {t("common.close")}
                  </button>
                </DialogPrimitive.Close>
              </div>
              <div className="ll-mt-3 ll-flex ll-flex-col ll-gap-3">
                {addTaskError ? (
                  <Alert variant="error">{addTaskError}</Alert>
                ) : null}
                <label className="ll-flex ll-flex-col ll-gap-1">
                  <span className="ll-text-sm ll-font-semibold">
                    {t("app.drawerTitle")}
                  </span>
                  <select
                    value={addTaskListId}
                    onChange={(event) => setAddTaskListId(event.target.value)}
                    className={TASK_CARD_INPUT_CLASS}
                  >
                    {taskLists.map((taskList) => (
                      <option key={taskList.id} value={taskList.id}>
                        {taskList.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ll-flex ll-flex-col ll-gap-1">
                  <span className="ll-sr-only">
                    {t("pages.tasklist.addTaskPlaceholder")}
                  </span>
                  <input
                    autoFocus
                    type="text"
                    value={addTaskText}
                    onChange={(event) => setAddTaskText(event.target.value)}
                    placeholder={t("pages.tasklist.addTaskPlaceholder")}
                    className={TASK_CARD_INPUT_CLASS}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!addTaskText.trim() || !addTaskListId || addingTask}
                  className={TASK_CARD_PRIMARY_BUTTON_CLASS}
                >
                  {addingTask ? t("common.loading") : t("a11y.addTask")}
                </button>
              </div>
            </form>
          </ActionSheetContent>
        ) : null}
      </Dialog>
      <Dialog
        open={actionTask !== null}
        onOpenChange={(open: boolean) => {
          if (!open && !savingAction) {
            setActionTask(null);
            setActionError(null);
          }
        }}
      >
        {actionTask ? (
          <ActionSheetContent
            title={t("a11y.editTask")}
            description={actionTask.task.text}
          >
            <div className="ll-flex ll-min-h-0 ll-flex-1 ll-flex-col ll-gap-3">
              <div className="ll-flex ll-min-h-11 ll-items-center ll-justify-between ll-gap-3">
                <span className="ll-truncate ll-text-sm ll-font-semibold">
                  {actionTask.taskListName}
                </span>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    disabled={savingAction}
                    className="ll-inline-flex ll-min-h-11 ll-items-center ll-rounded-xl ll-px-2 ll-text-sm ll-font-semibold ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-opacity-50 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
                  >
                    {t("common.close")}
                  </button>
                </DialogPrimitive.Close>
              </div>
              {actionError ? <Alert variant="error">{actionError}</Alert> : null}
              <form
                className="ll-flex ll-items-center ll-gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextText = actionText.trim();
                  if (!nextText) return;
                  applyTaskAction({ text: nextText }, "text");
                }}
              >
                <label className="ll-flex ll-min-w-0 ll-flex-1 ll-flex-col ll-gap-1">
                  <span className="ll-sr-only">{t("a11y.editTask")}</span>
                  <input
                    autoFocus
                    type="text"
                    value={actionText}
                    onChange={(event) => setActionText(event.target.value)}
                    className={TASK_CARD_INPUT_CLASS}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!actionText.trim() || savingAction}
                  className={TASK_CARD_PRIMARY_BUTTON_CLASS}
                >
                  {savingAction ? t("common.loading") : t("taskList.save")}
                </button>
              </form>
              <button
                type="button"
                disabled={!actionTask.task.date || savingAction}
                onClick={() => applyTaskAction({ date: "" }, "date")}
                className="ll-inline-flex ll-min-h-11 ll-w-fit ll-items-center ll-self-start ll-rounded-xl ll-px-2 ll-text-sm ll-font-semibold ll-text-gray-600 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-opacity-50 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
              >
                {t("pages.tasklist.clearDate")}
              </button>
              <div className="ll-min-h-0 ll-flex-1 ll-overflow-y-auto ll-rounded-xl ll-bg-gray-50 ll-p-3 ll-dark-bg-gray-950">
                <Calendar
                  mode="single"
                  selected={parseTaskDateValue(actionTask.task.date)}
                  onSelect={(next) => {
                    applyTaskAction({ date: next ? formatDate(next) : "" }, "date");
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

type CalendarEntryButtonProps = {
  onOpen: () => void;
};

function CalendarEntryButton({ onOpen }: CalendarEntryButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ll-inline-flex ll-items-center ll-justify-center ll-gap-2 ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white-b ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-900 ll-shadow-sm ll-hover-bg-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-border-gray-700 ll-dark-bg-gray-900b ll-dark-text-gray-50 ll-dark-hover-bg-gray-950 ll-dark-focus-visible-outline-gray-300"
    >
      <AppIcon
        name="calendar-today"
        aria-hidden="true"
        focusable="false"
        className="ll-h-5 ll-w-5"
      />
      <span>{t("app.calendarCheckButton")}</span>
    </button>
  );
}

type SidebarProps = {
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
  >(null);
  const [showJoinListDialog, setShowJoinListDialog] = useState(false);
  const [joinListInput, setJoinListInput] = useState("");
  const [joiningList, setJoiningList] = useState(false);
  const [joinListError, setJoinListError] = useState<string | null>(null);
  const dialogPrimaryButtonClass =
    "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-bg-gray-900 ll-px-4 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-50 ll-shadow-sm ll-hover-opacity-90 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-50 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-focus-visible-outline-gray-300";
  const dialogSecondaryButtonClass =
    "ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white-b ll-px-3 ll-py-2 ll-text-sm ll-font-semibold ll-text-gray-900 ll-shadow-sm ll-hover-bg-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-border-gray-700 ll-dark-bg-gray-900b ll-dark-text-gray-50 ll-dark-hover-bg-gray-950 ll-dark-focus-visible-outline-gray-300";

  const taskListDndAccessibility = useMemo(
    () =>
      buildDndAccessibility(
        t,
        (id) => taskLists.find((taskList) => taskList.id === id)?.name ?? "",
        () => taskLists.map((taskList) => taskList.id),
      ),
    [t, taskLists],
  );

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
    setCreateListBackground(null);
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
    <div className="ll-flex ll-h-full ll-flex-col ll-gap-4">
      <DrawerHeader>
        <h2 id="drawer-task-lists-title" className="ll-sr-only">
          {t("app.drawerTitle")}
        </h2>
        <div className="ll-flex ll-items-center ll-justify-between ll-gap-2">
          <div className="ll-flex ll-min-w-0 ll-flex-1 ll-items-center ll-gap-2">
            <p
              id="drawer-task-lists-description"
              className="ll-m-0 ll-min-w-0 ll-flex-1 ll-truncate ll-text-sm ll-text-gray-600 ll-dark-text-gray-300"
            >
              {userEmail}
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              title={t("settings.title")}
              aria-label={t("settings.title")}
              data-vaul-no-drag
              className="ll-pressable ll-inline-flex ll-items-center ll-justify-center ll-rounded-xl ll-p-2 ll-text-gray-600 ll-hover-bg-gray-50 ll-hover-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-300 ll-dark-hover-bg-gray-900 ll-dark-hover-text-gray-50 ll-dark-focus-visible-outline-gray-300"
            >
              <AppIcon name="settings" aria-hidden="true" focusable="false" />
            </button>
          </div>
        </div>
      </DrawerHeader>

      <CalendarEntryButton onOpen={onOpenCalendar} />

      <div className="ll-flex ll-flex-1 ll-flex-col ll-gap-3 ll-overflow-y-auto">
        {hasTaskLists ? (
          <DndContext
            sensors={sensorsList}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            accessibility={taskListDndAccessibility}
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
          <p className="ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
            {t("app.emptyState")}
          </p>
        )}

        <div className="ll-grid ll-grid-cols-2 ll-gap-2">
          <Dialog
            open={showCreateListDialog}
            onOpenChange={(open: boolean) => {
              setShowCreateListDialog(open);
              if (!open) {
                setCreateListInput("");
                setCreateListBackground(null);
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
                <div className="ll-mt-4 ll-flex ll-flex-col ll-gap-3">
                  <label className="ll-flex ll-flex-col ll-gap-1">
                    <span>{t("app.taskListName")}</span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => setCreateListInput(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white ll-px-3 ll-py-2 ll-text-sm ll-text-gray-900 ll-shadow-sm ll-focus-border-gray-600 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-300 ll-dark-border-gray-700 ll-dark-bg-gray-900 ll-dark-text-gray-50 ll-dark-focus-border-gray-300 ll-dark-focus-ring-gray-700"
                    />
                  </label>
                  <div className="ll-flex ll-flex-col ll-gap-2">
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
                <div className="ll-mt-4 ll-flex ll-flex-col ll-gap-3">
                  {joinListError ? (
                    <Alert variant="error">{joinListError}</Alert>
                  ) : null}
                  <label className="ll-flex ll-flex-col ll-gap-1">
                    <span>{t("taskList.shareCode")}</span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => {
                        setJoinListInput(e.target.value);
                        setJoinListError(null);
                      }}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white ll-px-3 ll-py-2 ll-text-sm ll-text-gray-900 ll-shadow-sm ll-focus-border-gray-600 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-300 ll-dark-border-gray-700 ll-dark-bg-gray-900 ll-dark-text-gray-50 ll-dark-focus-border-gray-300 ll-dark-focus-ring-gray-700"
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
  const { authStatus, activeUid } = useSessionState();
  const isSessionActive =
    authStatus === "authenticated" ||
    (authStatus === "loading" && activeUid !== null);
  const user = useUser();
  const { settings, settingsStatus } = useSettingsState();
  const {
    hasStartupError,
    taskListDocsStatus,
    taskListOrderStatus,
    taskLists: stateTaskLists,
  } = useTaskListIndexState();
  const [startupTaskListSnapshot] = useState(readLastTaskListSnapshot);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    startupTaskListSnapshot?.id ?? null,
  );
  const [focusedNewTaskListId, setFocusedNewTaskListId] = useState<
    string | null
  >(null);
  const moveNewTaskFocusOnCarouselScrollRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const { items: taskLists, reorder: reorderTaskList } = useOptimisticReorder(
    stateTaskLists,
    async (_draggedId, _targetId, nextItems) => {
      await updateTaskListOrder(
        nextItems.map((taskList, index) => ({
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
  const previousViewRef = useRef(currentView);
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

  useEffect(() => {
    if (previousViewRef.current === currentView) return;
    previousViewRef.current = currentView;
    if (isWideLayout) return;
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
  }, [currentView, isWideLayout]);

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
    window.addEventListener("hashchange", syncView);
    window.addEventListener("popstate", syncView);
    return () => {
      window.removeEventListener("hashchange", syncView);
      window.removeEventListener("popstate", syncView);
    };
  }, []);

  useEffect(() => {
    if (
      isViewAnimationReady ||
      !isSessionActive ||
      pendingInitialTaskListRoute
    ) {
      return;
    }
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsViewAnimationReady(true);
    });
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isSessionActive, isViewAnimationReady, pendingInitialTaskListRoute]);

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
    if (typeof window === "undefined" || !isSessionActive) {
      return;
    }

    if (isInitializedAppHistoryState(window.history.state)) {
      return;
    }

    const initializedState = initializeAppHistory(
      parseAppHashRoute(window.location.hash),
    );
    setCurrentView(initializedState.currentView);
    if (!initializedState.pendingInitialTaskListRoute) {
      setSelectedTaskListId(initializedState.selectedTaskListId);
    }
    setActiveTaskAction(initializedState.activeTaskAction);
    setPendingInitialTaskListRoute(
      initializedState.pendingInitialTaskListRoute,
    );
  }, [isSessionActive]);

  const isSessionPending = !isSessionActive && authStatus === "loading";
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
    <div className="ll-flex ll-flex-col ll-gap-3 ll-p-2">
      <div className="ll-h-8 ll-w-32 ll-animate-pulse ll-rounded-lg ll-bg-gray-300 ll-dark-bg-gray-700" />
      <div className="ll-h-10 ll-w-full ll-animate-pulse ll-rounded-xl ll-bg-gray-300 ll-dark-bg-gray-700" />
      <div className="ll-h-10 ll-w-full ll-animate-pulse ll-rounded-xl ll-bg-gray-300 ll-dark-bg-gray-700" />
      <div className="ll-h-10 ll-w-full ll-animate-pulse ll-rounded-xl ll-bg-gray-300 ll-dark-bg-gray-700" />
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
    if (!pendingInitialTaskListRoute) return;
    if (settingsStatus === "idle" || settingsStatus === "loading") return;

    const startupView = settings?.startupView ?? "taskList";
    if (startupView === "calendar") {
      previousViewRef.current = "calendar";
      openCalendar("push");
      return;
    }
    if (startupView === "taskLists") {
      previousViewRef.current = "taskLists";
      setPendingInitialTaskListRoute(false);
      showTaskListsRoot();
      return;
    }

    if (!hasResolvedTaskLists) return;

    if (!hasTaskLists || !firstTaskListId) {
      setPendingInitialTaskListRoute(false);
      showTaskListsRoot();
      return;
    }

    const initialTaskListId =
      selectedTaskListId &&
      taskLists.some((taskList) => taskList.id === selectedTaskListId)
        ? selectedTaskListId
        : firstTaskListId;
    openTaskList(initialTaskListId, "push");
  }, [
    firstTaskListId,
    hasResolvedTaskLists,
    hasTaskLists,
    isWideLayout,
    pendingInitialTaskListRoute,
    selectedTaskListId,
    settings,
    settingsStatus,
    taskLists,
  ]);

  useEffect(() => {
    if (!selectedTaskList) {
      return;
    }
    writeLastTaskListSnapshot({
      id: selectedTaskList.id,
      background: resolveTaskListBackground(selectedTaskList.background),
    });
  }, [selectedTaskList]);

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
        const taskListId = await fetchTaskListIdByShareCode(code);
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
    ? "ll-motion-safe-transition-transform ll-motion-safe-duration-300 ll-motion-safe-ease-out-expo ll-motion-reduce-transition-none ll-motion-reduce-duration-0"
    : "ll-transition-none";
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
    <div
      className="ll-flex ll-h-full ll-flex-col ll-gap-4 ll-p-4 ll-pt-24"
      style={
        startupTaskListSnapshot
          ? { backgroundColor: startupTaskListSnapshot.background }
          : undefined
      }
    >
      <div className="ll-h-6 ll-w-40 ll-animate-pulse ll-rounded ll-bg-gray-300 ll-dark-bg-gray-700" />
      <div className="ll-flex ll-flex-col ll-gap-2">
        {Array.from({ length: taskRowCount }, (_, index) => (
          <div
            key={index}
            className={clsx(
              "ll-h-10 ll-animate-pulse ll-rounded-lg ll-bg-gray-300 ll-dark-bg-gray-700",
              index === taskRowCount - 1 && taskRowCount > 3
                ? "ll-w-3q4"
                : "ll-w-full",
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
      inert={currentView !== view}
      className={clsx(
        "ll-absolute ll-inset-0 ll-h-full ll-overflow-hidden ll-will-change-transform",
        mobileSlideTransitionClass,
        currentView === view ? "ll-z-20" : "ll-pointer-events-none ll-z-10",
        className,
      )}
      style={{ transform: getCompactPanelTransform(view) }}
    >
      {content}
    </div>
  );

  const detailContent = (
    <div className="ll-h-full ll-overflow-hidden">
      {isSessionPending ? (
        renderDetailSkeleton(4)
      ) : hasStartupError ? (
        <div className="ll-flex ll-h-full ll-items-center ll-justify-center ll-p-4">
          <Alert variant="error">{t("app.error")}</Alert>
        </div>
      ) : isTaskListsHydrating ? (
        renderDetailSkeleton(3)
      ) : hasTaskLists ? (
        <Carousel
          className="ll-h-full"
          index={selectedTaskListIndex}
          direction={carouselDirection}
          scrollEnabled={!isTaskSorting && !isTaskDragInteracting}
          onScrollStart={() => {
            moveNewTaskFocusOnCarouselScrollRef.current =
              focusedNewTaskListId === selectedTaskListId;
          }}
          onScrollEnd={(index) => {
            const taskList = taskLists[index];
            if (moveNewTaskFocusOnCarouselScrollRef.current && taskList) {
              setFocusedNewTaskListId(taskList.id);
            }
            moveNewTaskFocusOnCarouselScrollRef.current = false;
          }}
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
              className="ll-flex ll-h-full ll-w-full ll-flex-col"
              style={{
                backgroundColor: resolveTaskListBackground(taskList.background),
              }}
            >
              <div className="ll-h-88px" />
              <div
                className={clsx(
                  "ll-h-full ll-overflow-y-auto",
                  isWideLayout && "ll-mx-auto ll-max-w-3xl ll-min-w-480px",
                )}
              >
                <TaskListCard
                  taskList={taskList}
                  autoSort={settings?.autoSort ?? false}
                  taskInsertPosition={settings?.taskInsertPosition ?? "top"}
                  isActive={selectedTaskListId === taskList.id}
                  shouldFocusNewTaskInput={focusedNewTaskListId === taskList.id}
                  onNewTaskInputFocusChange={(taskListId, isFocused) => {
                    setFocusedNewTaskListId((currentTaskListId) =>
                      isFocused
                        ? taskListId
                        : currentTaskListId === taskListId
                          ? null
                          : currentTaskListId,
                    );
                  }}
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
        <div className="ll-flex ll-h-full ll-items-center ll-justify-center ll-p-4">
          <p className="ll-text-gray-600 ll-dark-text-gray-300">
            {t("app.emptyState")}
          </p>
        </div>
      )}
    </div>
  );

  const calendarContent = (
    <CalendarScreen
      showCompactHeaderOffset={!isWideLayout}
      taskLists={taskLists}
      taskSettings={{
        autoSort: settings?.autoSort ?? false,
        language: normalizeLanguage(i18n.language),
        taskInsertPosition: settings?.taskInsertPosition ?? "top",
      }}
      defaultTaskListId={selectedTaskListId}
      onSelectTaskList={(taskListId) =>
        openTaskList(taskListId, isWideLayout ? "replace" : "push")
      }
    />
  );

  const taskListsRootContent = (
    <div className="ll-h-full ll-overflow-y-auto ll-bg-white-b ll-p-4 ll-dark-bg-gray-900b">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {isSessionPending || isTaskListsHydrating
        ? taskListsPanelSkeleton
        : drawerPanel}
    </div>
  );

  if (authStatus === "unauthenticated") {
    return <Spinner fullPage />;
  }

  return (
    <div className="ll-h-full ll-min-h-full ll-w-full ll-overflow-hidden ll-text-gray-900 ll-dark-text-gray-50">
      <div
        className={clsx(
          "ll-flex ll-h-full",
          isWideLayout
            ? isRtl
              ? "ll-flex-row-reverse ll-items-start"
              : "ll-flex-row ll-items-start"
            : "ll-flex-col",
        )}
      >
        {isWideLayout ? (
          <aside
            className={clsx(
              "ll-sticky ll-top-0 ll-w-360px ll-max-w-420px ll-shrink-0b ll-self-stretch ll-border-gray-300",
              isRtl ? "ll-border-l" : "ll-border-r",
            )}
          >
            <div className="ll-flex ll-h-full ll-flex-col ll-overflow-y-auto ll-bg-white-b ll-p-4 ll-dark-border-gray-700 ll-dark-bg-gray-900b">
              {isSessionPending || isTaskListsHydrating
                ? taskListsPanelSkeleton
                : drawerPanel}
            </div>
          </aside>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="ll-flex ll-h-full ll-min-h-0 ll-w-full ll-min-w-0 ll-flex-1 ll-flex-col"
        >
          {isWideLayout ? (
            <div className="ll-h-full ll-overflow-hidden">
              {currentView === "settings" ? (
                <div className="ll-h-full ll-overflow-y-auto">
                  <SettingsView
                    showBackButton={false}
                    onOpenLicenses={() => openLicenses("replace")}
                  />
                </div>
              ) : currentView === "licenses" ? (
                <div className="ll-h-full ll-overflow-y-auto">
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
            <div className="ll-relative ll-h-full ll-overflow-hidden">
              {renderCompactPanel("taskLists", taskListsRootContent)}
              {renderCompactPanel(
                "detail",
                <>
                  <div className="ll-absolute ll-z-20 ll-w-full">
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
                <div className="ll-h-full ll-overflow-y-auto">
                  <SettingsView
                    onBack={handleBackToTaskLists}
                    showBackButton={true}
                    onOpenLicenses={() => openLicenses("push")}
                  />
                </div>,
                "ll-bg-gray-50 ll-dark-bg-gray-950",
              )}
              {renderCompactPanel(
                "licenses",
                <div className="ll-h-full ll-overflow-y-auto">
                  <LicensesView
                    onBack={handleBackToTaskLists}
                    showBackButton={true}
                  />
                </div>,
                "ll-bg-gray-50 ll-dark-bg-gray-950",
              )}
              {renderCompactPanel(
                "calendar",
                <>
                  <div className="ll-absolute ll-z-20 ll-w-full">
                    <AppHeader
                      backLabel={t("common.back")}
                      onBack={handleBackToTaskLists}
                    />
                  </div>
                  {calendarContent}
                </>,
                "ll-bg-gray-50 ll-dark-bg-gray-950",
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
  "ll-inline-flex ll-w-full ll-items-center ll-justify-center ll-rounded-lg ll-bg-gray-900 ll-px-4 ll-py-2x5 ll-text-sm ll-font-semibold ll-text-gray-50 ll-shadow-sm ll-transition-colors ll-hover-opacity-90 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-70 ll-dark-bg-gray-50 ll-dark-text-gray-900 ll-dark-focus-visible-outline-gray-300";

const AUTH_SECONDARY_BUTTON_CLASS =
  "ll-inline-flex ll-w-full ll-items-center ll-justify-center ll-rounded-lg ll-border ll-border-gray-300 ll-bg-white-b ll-px-4 ll-py-2x5 ll-text-sm ll-font-semibold ll-text-gray-900 ll-shadow-sm ll-transition-colors ll-hover-bg-gray-50 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-disabled-cursor-not-allowed ll-disabled-opacity-70 ll-dark-border-gray-700 ll-dark-bg-gray-900b ll-dark-text-gray-50 ll-dark-hover-bg-gray-950 ll-dark-focus-visible-outline-gray-300";

type FormInputProps = {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder: string;
  autoComplete?: string;
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
  autoComplete,
}: FormInputProps) {
  return (
    <div className="ll-flex ll-flex-col ll-gap-1">
      <label
        htmlFor={id}
        className="ll-text-sm ll-font-medium ll-text-gray-900 ll-dark-text-gray-50"
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
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white ll-px-3 ll-py-2 ll-text-sm ll-text-gray-900 ll-shadow-sm ll-focus-border-gray-600 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-300 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-900 ll-dark-text-gray-50 ll-dark-focus-border-gray-300 ll-dark-focus-ring-gray-700"
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="ll-text-xs ll-text-red-600 ll-dark-text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AuthPageLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="ll-min-h-screen ll-w-full ll-bg-gray-50 ll-text-gray-900 ll-dark-bg-gray-950 ll-dark-text-gray-50">
      <main
        id="main-content"
        tabIndex={-1}
        className="ll-mx-auto ll-flex ll-min-h-screen ll-w-full ll-max-w-xl ll-flex-col ll-justify-center ll-px-4 ll-py-10 ll-sm-px-6"
      >
        <div className="ll-w-full ll-rounded-24px ll-border ll-border-gray-300 ll-bg-white-b ll-p-6 ll-shadow-sm ll-dark-border-gray-700 ll-dark-bg-gray-900b ll-sm-p-8">
          <div className="ll-mb-6 ll-text-center">
            <h1 className="ll-font-display ll-text-2xl ll-font-semibold ll-tracking-tight ll-sm-text-3xl">
              {title}
            </h1>
          </div>
          {children}
        </div>
        <p className="ll-mt-6 ll-text-center ll-text-xs ll-text-gray-600 ll-dark-text-gray-300">
          {t("copyright")}
        </p>
      </main>
    </div>
  );
}

function LoginPage() {
  const { t, i18n } = useTranslation();
  const authStatus = useAuthStatus();
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const signInTabRef = useRef<HTMLButtonElement>(null);
  const signUpTabRef = useRef<HTMLButtonElement>(null);
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
    e: SubmitEvent<HTMLFormElement>,
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

  const handleSignIn = (e: SubmitEvent<HTMLFormElement>) => {
    void handleAuthAction(
      e,
      async () => {
        await signIn(email, password);
        logLogin();
      },
      { email, password },
      setLoading,
    );
  };

  const handleSignUp = (e: SubmitEvent<HTMLFormElement>) => {
    const resolvedLanguage = normalizeLanguage(i18n.language);
    void handleAuthAction(
      e,
      async () => {
        await signUp(email, password, resolvedLanguage);
        logSignUp();
      },
      { email, password, confirmPassword, requirePasswordConfirm: true },
      setLoading,
    );
  };

  const handlePasswordReset = async (e: SubmitEvent<HTMLFormElement>) => {
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

  const handleAuthTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    tab: "signin" | "signup",
  ) => {
    let nextTab: "signin" | "signup" | null = null;
    if (event.key === "Home") nextTab = "signin";
    if (event.key === "End") nextTab = "signup";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextTab = tab === "signin" ? "signup" : "signin";
    }
    if (!nextTab) return;
    event.preventDefault();
    handleTabChange(nextTab);
    (nextTab === "signin" ? signInTabRef : signUpTabRef).current?.focus();
  };

  const tabButtonClass = (isActive: boolean) =>
    [
      "ll-inline-flex ll-w-full ll-items-center ll-justify-center ll-rounded-lg ll-px-3 ll-py-2 ll-text-sm ll-font-semibold ll-transition-colors ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300",
      isActive
        ? "ll-bg-white-b ll-text-gray-900 ll-shadow-sm ll-dark-bg-gray-900b ll-dark-text-gray-50"
        : "ll-text-gray-600 ll-hover-bg-white-70 ll-dark-text-gray-300 ll-dark-hover-bg-gray-900-60",
    ].join(" ");

  const primaryButtonClass = AUTH_PRIMARY_BUTTON_CLASS;
  const secondaryButtonClass = AUTH_SECONDARY_BUTTON_CLASS;
  const selectedLanguage = normalizeLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );

  return (
    <AuthPageLayout title={t("title")}>
      <div className="ll-mb-6 ll-flex ll-justify-end">
        <select
          value={selectedLanguage}
          onChange={(event) =>
            void i18n.changeLanguage(normalizeLanguage(event.target.value))
          }
          className="ll-rounded-md ll-border ll-border-gray-300 ll-bg-white-b ll-px-3 ll-py-2 ll-text-sm ll-text-gray-900 ll-outline-none ll-transition ll-focus-border-gray-600 ll-dark-border-gray-700 ll-dark-bg-gray-950 ll-dark-text-gray-50 ll-dark-focus-border-gray-300"
          aria-label={t("settings.language.title")}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {LANGUAGE_DISPLAY_NAMES[language]}
            </option>
          ))}
        </select>
      </div>

      {activeTab !== "reset" ? (
        <div
          className="ll-mb-6 ll-grid ll-grid-cols-2 ll-gap-2 ll-rounded-xl ll-bg-gray-50 ll-p-1 ll-dark-bg-gray-900b"
          role="tablist"
          aria-label={t("title")}
        >
          <button
            ref={signInTabRef}
            id="auth-tab-signin"
            type="button"
            role="tab"
            tabIndex={activeTab === "signin" ? 0 : -1}
            aria-selected={activeTab === "signin"}
            aria-controls="auth-panel-signin"
            className={tabButtonClass(activeTab === "signin")}
            onClick={() => handleTabChange("signin")}
            onKeyDown={(event) => handleAuthTabKeyDown(event, "signin")}
          >
            {t("auth.tabs.signin")}
          </button>
          <button
            ref={signUpTabRef}
            id="auth-tab-signup"
            type="button"
            role="tab"
            tabIndex={activeTab === "signup" ? 0 : -1}
            aria-selected={activeTab === "signup"}
            aria-controls="auth-panel-signup"
            className={tabButtonClass(activeTab === "signup")}
            onClick={() => handleTabChange("signup")}
            onKeyDown={(event) => handleAuthTabKeyDown(event, "signup")}
          >
            {t("auth.tabs.signup")}
          </button>
        </div>
      ) : null}

      {activeTab === "signin" && (
        <section
          id="auth-panel-signin"
          role="tabpanel"
          aria-labelledby="auth-tab-signin"
          className="ll-space-y-4"
        >
          <form onSubmit={handleSignIn} className="ll-space-y-4">
            <FormInput
              id="signin-email"
              label={t("auth.form.email")}
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              disabled={loading}
              placeholder={t("auth.placeholder.email")}
              autoComplete="email"
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
              autoComplete="current-password"
            />
            {errors.general && <Alert variant="error">{errors.general}</Alert>}
            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClass}
            >
              {loading ? t("auth.button.signingIn") : t("auth.button.signin")}
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
          className="ll-space-y-4"
        >
          <form onSubmit={handleSignUp} className="ll-space-y-4">
            <FormInput
              id="signup-email"
              label={t("auth.form.email")}
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              disabled={loading}
              placeholder={t("auth.placeholder.email")}
              autoComplete="email"
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
              autoComplete="new-password"
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
              autoComplete="new-password"
            />
            {errors.general && <Alert variant="error">{errors.general}</Alert>}
            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClass}
            >
              {loading ? t("auth.button.signingUp") : t("auth.button.signup")}
            </button>
          </form>
        </section>
      )}

      {activeTab === "reset" && (
        <section className="ll-space-y-4">
          <form onSubmit={handlePasswordReset} className="ll-space-y-4">
            {resetSent ? (
              <Alert variant="success">{t("auth.passwordReset.success")}</Alert>
            ) : (
              <>
                <p className="ll-text-sm ll-text-gray-600 ll-dark-text-gray-300">
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
                  autoComplete="email"
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
    </AuthPageLayout>
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

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
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
        <div className="ll-space-y-4">
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
        <div className="ll-space-y-4">
          <Alert variant="success">
            {t("auth.passwordReset.resetSuccess")}
          </Alert>
          <div className="ll-flex ll-justify-center">
            <Spinner />
          </div>
        </div>
      );
    }

    return (
      <div className="ll-space-y-4">
        {errors.general && <Alert variant="error">{errors.general}</Alert>}

        <form onSubmit={handleSubmit} className="ll-space-y-4">
          <FormInput
            id="password"
            label={t("auth.passwordReset.newPassword")}
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={loading}
            placeholder={t("auth.placeholder.password")}
            autoComplete="new-password"
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
            autoComplete="new-password"
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
    <AuthPageLayout title={t("auth.passwordReset.title")}>
      {content}
    </AuthPageLayout>
  );
}

// pages/sharecodes.tsx
function HistoryBackButton() {
  const { t } = useTranslation();
  return (
    <button
      onClick={() => window.history.back()}
      className="ll-pressable ll-rounded-full ll-p-2 ll-text-gray-600 ll-hover-bg-gray-50 ll-dark-text-gray-300 ll-dark-hover-bg-gray-900"
      aria-label={t("common.back")}
    >
      <AppIcon name="arrow-back" className="ll-h-6 ll-w-6" />
    </button>
  );
}

function ShareCodePreviewPage() {
  const { t } = useTranslation();
  const user = useUser();
  const settings = useSettings();
  const [sharecode, setSharecode] = useState<string | null>(null);
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const [activeTaskAction, setActiveTaskAction] = useState<string | null>(null);
  const sensorsList = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
      <div className="ll-flex ll-h-full ll-flex-col ll-bg-gray-50 ll-dark-bg-gray-950">
        <div className="ll-bg-white-b ll-p-4 ll-shadow-sm ll-dark-bg-gray-900b">
          <HistoryBackButton />
        </div>
        <div className="ll-p-4">
          <Alert variant="error">{error}</Alert>
        </div>
      </div>
    );
  }

  if (!loading && sharedTaskListId && !taskList) return <Spinner fullPage />;

  if (!taskList) {
    return (
      <div className="ll-flex ll-h-full ll-flex-col ll-bg-gray-50 ll-dark-bg-gray-950">
        <div className="ll-bg-white-b ll-p-4 ll-shadow-sm ll-dark-bg-gray-900b">
          <HistoryBackButton />
        </div>
        <div className="ll-p-4">
          <p className="ll-text-center ll-text-gray-600 ll-dark-text-gray-300">
            {t("pages.sharecode.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ll-flex ll-h-full ll-flex-col ll-bg-gray-50 ll-dark-bg-gray-950">
      <header className="ll-flex ll-items-center ll-justify-between ll-border-b ll-border-gray-300 ll-bg-white-b ll-px-4 ll-py-3 ll-dark-border-gray-700 ll-dark-bg-gray-900b">
        <HistoryBackButton />
        {user && (
          <button
            onClick={handleAddToOrder}
            disabled={addToOrderLoading}
            className={TASK_CARD_PRIMARY_BUTTON_CLASS}
          >
            {addToOrderLoading
              ? t("common.loading")
              : t("pages.sharecode.addToOrder")}
          </button>
        )}
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="ll-flex-1 ll-overflow-y-auto"
      >
        {addToOrderError && (
          <div className="ll-p-4 ll-pb-0">
            <Alert variant="error">{addToOrderError}</Alert>
          </div>
        )}

        <div className="ll-mx-auto ll-h-full ll-w-full ll-max-w-3xl">
          <TaskListCard
            taskList={taskList}
            autoSort={settings?.autoSort ?? false}
            taskInsertPosition={settings?.taskInsertPosition ?? "top"}
            isActive={true}
            shouldFocusNewTaskInput={false}
            onNewTaskInputFocusChange={() => {}}
            sensorsList={sensorsList}
            canDeleteTaskList={false}
            activeTaskActionTaskId={activeTaskAction}
            onOpenTaskAction={(_, taskId) => setActiveTaskAction(taskId)}
            onCloseTaskAction={() => setActiveTaskAction(null)}
          />
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

const warmUpStartupData = (): void => {
  const uid = readLastUid();
  if (!uid) {
    return;
  }
  const db = getDbInstance();
  void getDocFromCache(doc(db, "settings", uid)).catch(() => {});
  void getDocFromCache(doc(db, "taskListOrder", uid)).catch(() => {});
  getTaskListIdChunks(readCachedTaskListOrderIds(uid)).forEach((chunk) => {
    void getDocsFromCache(
      query(collection(db, "taskLists"), where("__name__", "in", chunk)),
    ).catch(() => {});
  });
};

if (!isAuthFreePage()) {
  getAuthInstance();
  getDbInstance();
  warmUpStartupData();
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
