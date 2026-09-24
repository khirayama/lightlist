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
  isValidElement,
  memo,
  useLayoutEffect,
  startTransition,
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
import type { Analytics } from "firebase/analytics";
import {
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
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
  getDocFromServer,
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
import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import type { UniqueIdentifier } from "@dnd-kit/abstract";
import { Accessibility, PointerActivationConstraints } from "@dnd-kit/dom";
import {
  DragDropProvider,
  KeyboardSensor,
  PointerSensor,
} from "@dnd-kit/react";
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { DayButton as DayPickerDayButton, DayPicker } from "react-day-picker";

const SORTABLE_SENSORS = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 8 }),
    ],
  }),
  KeyboardSensor,
];

const SORTABLE_MODIFIERS = [RestrictToVerticalAxis];

function buildDndAccessibility(
  t: TFunction,
  getName: (id: string) => string,
  getIds: () => string[],
): ReturnType<typeof Accessibility.configure> {
  const positionOf = (id: string): number | null => {
    const index = getIds().indexOf(id);
    return index >= 0 ? index + 1 : null;
  };
  return Accessibility.configure({
    screenReaderInstructions: { draggable: t("a11y.dragInstructions") },
    announcements: {
      dragstart: ({ operation }: DragStartEvent) => {
        const source = operation.source;
        if (!source) return undefined;
        return t("a11y.dragStart", { item: getName(String(source.id)) });
      },
      dragover: ({ operation }: DragOverEvent) => {
        const source = operation.source;
        const target = operation.target;
        if (!source || !target) return undefined;
        const position = positionOf(String(target.id));
        if (position === null) return undefined;
        return t("a11y.dragOver", {
          item: getName(String(source.id)),
          position,
        });
      },
      dragend: ({ operation, canceled }: DragEndEvent) => {
        const source = operation.source;
        if (!source) return undefined;
        if (canceled) {
          return t("a11y.dragCancel", { item: getName(String(source.id)) });
        }
        const target = operation.target;
        if (!target) return undefined;
        const position = positionOf(String(target.id));
        if (position === null) return undefined;
        return t("a11y.dragEnd", {
          item: getName(String(source.id)),
          position,
        });
      },
    },
  });
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
  createdAt?: number;
  updatedAt?: number;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

type TaskListWrite<Result = void> = {
  committed: Promise<void>;
  result?: Result;
};
const taskListMutationQueues = new Map<string, Promise<void>>();
const taskListSubmissionQueues = new Map<string, Promise<void>>();

async function enqueueTaskListMutation<Result = void>(
  taskListId: string,
  operation: () => Promise<TaskListWrite<Result> | void>,
): Promise<Result | undefined> {
  return enqueueTaskListMutations([taskListId], operation);
}

async function enqueueTaskListMutations<Result = void>(
  taskListIds: string[],
  operation: () => Promise<TaskListWrite<Result> | void>,
): Promise<Result | undefined> {
  const ids = [...new Set(taskListIds)].sort(compareStringIds);
  const previousSubmissions = ids.map(
    (id) => taskListSubmissionQueues.get(id) ?? Promise.resolve(),
  );
  const previousWrites = ids.map(
    (id) => taskListMutationQueues.get(id) ?? Promise.resolve(),
  );
  const submitted = Promise.all(previousSubmissions).then(operation);
  const submission = submitted.then(
    () => undefined,
    () => undefined,
  );
  ids.forEach((id) => taskListSubmissionQueues.set(id, submission));
  void submission.then(() => {
    ids.forEach((id) => {
      if (taskListSubmissionQueues.get(id) === submission)
        taskListSubmissionQueues.delete(id);
    });
  });
  const committed = submitted.then((write) => write?.committed);
  const pending = Promise.allSettled([...previousWrites, committed]).then(
    () => {
      ids.forEach((id) => {
        if (taskListMutationQueues.get(id) === pending)
          taskListMutationQueues.delete(id);
      });
    },
  );
  ids.forEach((id) => taskListMutationQueues.set(id, pending));
  await pending;
  await committed;
  return (await submitted)?.result;
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
  try {
    if (import.meta.env.DEV) {
      console.log("[analytics]", eventName, params ?? {});
    }
    const analytics = await getAnalyticsInstance();
    if (!analytics) return;
    const { logEvent } = await getAnalyticsModule();
    logEvent(analytics, eventName, params);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] unavailable", error);
    }
  }
};

const logAppEvent = (eventName: string, params?: Record<string, unknown>) =>
  log(`app_${eventName}`, params);
const getErrorCategory = (error: unknown): string => {
  if (isRecord(error) && typeof error.code === "string") {
    return error.code;
  }
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return "unknown";
};
const logException = (operation: string, error?: unknown) => {
  const params: Record<string, unknown> = { operation };
  if (error !== undefined) {
    params.error_category = getErrorCategory(error);
  }
  return logAppEvent("exception", params);
};
type SyncListenerSource =
  "settings" | "task_list_order" | "task_lists" | "shared_task_list";
const logSyncListenerError = (
  source: SyncListenerSource,
  errorCategory: string,
) =>
  logAppEvent("sync_listener_error", { source, error_category: errorCategory });

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

const isRetryableFirestoreListenerError = (
  error: FirestoreError,
  authIsLoading = false,
): boolean =>
  ["aborted", "deadline-exceeded", "internal", "unavailable"].includes(
    error.code,
  ) ||
  (authIsLoading && error.code === "permission-denied");

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
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
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
  } catch {}
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
    logException("error_boundary", error);
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
      logException("window_error", event.error ?? event);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isAbortError(event.reason)) {
        event.preventDefault();
        return;
      }
      logException("unhandled_rejection", event.reason);
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

function AppWrapper({
  children,
  loadAppData,
}: {
  children: ReactNode;
  loadAppData: boolean;
}) {
  return (
    <AppStateProvider loadAppData={loadAppData}>
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
type SettingsContextValue = SettingsState & {
  setOptimisticAutoSort: (autoSort: boolean) => void;
};
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

const malformedTaskCleanupKeys = new Set<string>();

function isCompleteTaskStoreTask(
  taskId: string,
  value: unknown,
): value is TaskListStoreTask {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Record<string, unknown>;
  return (
    task.id === taskId &&
    typeof task.text === "string" &&
    typeof task.completed === "boolean" &&
    typeof task.date === "string" &&
    typeof task.order === "number" &&
    Number.isFinite(task.order) &&
    typeof task.pinned === "boolean"
  );
}

function getMalformedTaskIds(taskListData: unknown): string[] {
  if (typeof taskListData !== "object" || taskListData === null) return [];
  const tasks = (taskListData as Record<string, unknown>).tasks;
  if (typeof tasks !== "object" || tasks === null) return [];
  return Object.entries(tasks)
    .filter(([taskId, task]) => !isCompleteTaskStoreTask(taskId, task))
    .map(([taskId]) => taskId)
    .sort();
}

function scheduleMalformedTaskCleanup(
  taskListId: string,
  taskListData: unknown,
  fromCache: boolean,
  hasPendingWrites: boolean,
) {
  if (fromCache || hasPendingWrites) return;
  const malformedTaskIds = getMalformedTaskIds(taskListData);
  if (malformedTaskIds.length === 0) return;
  const cleanupKey = `${taskListId}:${malformedTaskIds.join("|")}`;
  if (malformedTaskCleanupKeys.has(cleanupKey)) return;
  malformedTaskCleanupKeys.add(cleanupKey);
  void enqueueTaskListMutation(taskListId, async () => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    malformedTaskIds.forEach((taskId) => {
      updates[`tasks.${taskId}`] = deleteField();
    });
    return {
      committed: updateDoc(
        doc(getDbInstance(), "taskLists", taskListId),
        updates,
      ),
    };
  })
    .catch((error) => {
      console.error("malformed task cleanup error:", error);
      logException("malformed_task_cleanup", error);
    })
    .finally(() => {
      malformedTaskCleanupKeys.delete(cleanupKey);
    });
}

function normalizeTaskListStore(taskListData: TaskListStore): TaskListStore {
  let didNormalizeDate = false;
  const normalizedTasks: TaskListStore["tasks"] = Object.fromEntries(
    Object.entries(taskListData.tasks).flatMap(
      ([taskId, task]): [string, TaskListStoreTask][] => {
        if (!isCompleteTaskStoreTask(taskId, task)) return [];

        const normalizedDate =
          task.date && parseTaskDateValue(task.date) ? task.date : "";
        if (normalizedDate === task.date) return [[taskId, task]];

        didNormalizeDate = true;
        return [[taskId, { ...task, date: normalizedDate }]];
      },
    ),
  );
  if (
    !didNormalizeDate &&
    Object.keys(normalizedTasks).length ===
      Object.keys(taskListData.tasks).length
  ) {
    return taskListData;
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
const mapTaskListStoreToTaskList = (
  taskListId: string,
  taskListData: TaskListStore,
): TaskList => ({
  id: taskListId,
  name: taskListData.name,
  tasks: getOrderedTasks(taskListData),
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

const getTaskListIdChunks = (taskListIds: string[]): string[][] =>
  Array.from({ length: Math.ceil(taskListIds.length / 10) }, (_, index) =>
    taskListIds.slice(index * 10, index * 10 + 10),
  );

const resolveMemberTaskListIds = async (
  taskListIds: string[],
  uid: string,
  source: "cache" | "server" = "server",
): Promise<string[]> => {
  const membershipSnapshots = await Promise.all(
    taskListIds.map((taskListId) => {
      const membershipRef = doc(
        getDbInstance(),
        "taskLists",
        taskListId,
        "members",
        uid,
      );
      return source === "cache"
        ? getDocFromCache(membershipRef).catch(() => null)
        : getDoc(membershipRef);
    }),
  );
  return taskListIds.filter(
    (_taskListId, index) => membershipSnapshots[index]?.exists() === true,
  );
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
          getTaskListOrderEntries(action.taskListOrder).length > 0
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
const SettingsContext = createContext<SettingsContextValue | null>(null);
const TaskListsContext = createContext<TaskListsContextValue | null>(null);

function useRequiredContext<T>(context: Context<T | null>): T {
  const value = useContext(context);
  if (!value) {
    throw new Error("AppStateProvider is required");
  }
  return value;
}

function AppStateProvider({
  children,
  loadAppData = true,
}: {
  children: ReactNode;
  loadAppData?: boolean;
}) {
  const [session, setSession] = useState<SessionState>(serverSessionState);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [settingsState, setSettingsState] =
    useState<SettingsState>(serverSettingsState);
  const optimisticAutoSortRef = useRef<boolean | null>(null);
  const [taskListsState, dispatchTaskLists] = useReducer(
    taskListsReducer,
    initialTaskListsState(),
  );
  const taskListOrderStateRef = useRef(taskListsState.taskListOrder);
  taskListOrderStateRef.current = taskListsState.taskListOrder;
  const sharedTaskListsByIdRef = useRef(taskListsState.sharedTaskListsById);
  sharedTaskListsByIdRef.current = taskListsState.sharedTaskListsById;
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
  const authStateReady = session.authStatus !== "loading";

  const setOptimisticAutoSort = useCallback((autoSort: boolean) => {
    optimisticAutoSortRef.current = autoSort;
    setSettingsState((current) =>
      current.settings
        ? {
            ...current,
            settings: { ...current.settings, autoSort },
          }
        : current,
    );
  }, []);

  useEffect(() => {
    if (!loadAppData) {
      setSettingsState(serverSettingsState);
      return;
    }
    optimisticAutoSortRef.current = null;
    if (!activeUid) {
      setSettingsState(serverSettingsState);
      return;
    }

    const settingsRef = doc(getDbInstance(), "settings", activeUid);

    setSettingsState((current) => ({
      settings: current.settings,
      settingsStatus: "loading",
    }));

    let disposed = false;
    let retryTimer: number | null = null;
    let retryDelayMs = 1000;
    let reportedError = false;
    let unsubscribe: (() => void) | null = null;
    const clearListener = () => {
      unsubscribe?.();
      unsubscribe = null;
    };
    const scheduleRetry = (error: FirestoreError) => {
      if (disposed || retryTimer !== null) return;
      if (!reportedError) {
        void logSyncListenerError("settings", error.code);
        reportedError = true;
      }
      setSettingsState((current) => ({
        settings: current.settings,
        settingsStatus: "error",
      }));
      clearListener();
      if (
        !isRetryableFirestoreListenerError(
          error,
          sessionRef.current.authStatus === "loading",
        )
      ) {
        return;
      }
      const delayMs = retryDelayMs;
      retryDelayMs = Math.min(retryDelayMs * 2, 30000);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (!disposed) installListener();
      }, delayMs);
    };
    const installListener = () => {
      if (disposed) return;
      clearListener();
      unsubscribe = onSnapshot(
        settingsRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            const settingsStore = assertSettingsStore(
              snapshot.exists() ? snapshot.data() : {},
              activeUid,
            );
            const nextSettings = mapSettingsStore(settingsStore);
            if (!nextSettings) {
              throw new Error(`Settings mapping failed: ${activeUid}`);
            }
            const optimisticAutoSort = optimisticAutoSortRef.current;
            if (
              optimisticAutoSort !== null &&
              nextSettings.autoSort === optimisticAutoSort
            ) {
              optimisticAutoSortRef.current = null;
            }
            setSettingsState({
              settings: {
                ...nextSettings,
                autoSort:
                  optimisticAutoSortRef.current ?? nextSettings.autoSort,
              },
              settingsStatus: "ready",
            });
            if (
              !snapshot.metadata.fromCache &&
              !snapshot.metadata.hasPendingWrites
            ) {
              retryDelayMs = 1000;
              reportedError = false;
            }
          } catch (error) {
            console.error("settings decode error:", error);
            logException("settings_decode", error);
            setSettingsState((current) => ({
              settings: current.settings,
              settingsStatus: "error",
            }));
          }
        },
        scheduleRetry,
      );
    };
    installListener();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      clearListener();
    };
  }, [activeUid, loadAppData]);

  useEffect(() => {
    if (!loadAppData) {
      dispatchTaskLists({ type: "reset", taskListOrderStatus: "idle" });
      return;
    }
    if (!activeUid) {
      dispatchTaskLists({ type: "reset", taskListOrderStatus: "idle" });
      return;
    }

    const taskListOrderRef = doc(getDbInstance(), "taskListOrder", activeUid);

    dispatchTaskLists({ type: "reset", taskListOrderStatus: "loading" });

    let disposed = false;
    let retryTimer: number | null = null;
    let retryDelayMs = 1000;
    let reportedError = false;
    let unsubscribe: (() => void) | null = null;
    const clearListener = () => {
      unsubscribe?.();
      unsubscribe = null;
    };
    const scheduleRetry = (error: FirestoreError) => {
      if (disposed || retryTimer !== null) return;
      if (!reportedError) {
        void logSyncListenerError("task_list_order", error.code);
        reportedError = true;
      }
      dispatchTaskLists({
        type: "setTaskListOrder",
        taskListOrder: taskListOrderStateRef.current,
        taskListOrderStatus: "error",
      });
      clearListener();
      if (
        !isRetryableFirestoreListenerError(
          error,
          sessionRef.current.authStatus === "loading",
        )
      ) {
        return;
      }
      const delayMs = retryDelayMs;
      retryDelayMs = Math.min(retryDelayMs * 2, 30000);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (!disposed) installListener();
      }, delayMs);
    };
    const installListener = () => {
      if (disposed) return;
      clearListener();
      unsubscribe = onSnapshot(
        taskListOrderRef,
        (snapshot) => {
          try {
            const taskListOrder = snapshot.exists()
              ? assertTaskListOrderStore(snapshot.data(), activeUid)
              : null;
            writeCachedTaskListOrderIds(activeUid, taskListOrder);
            dispatchTaskLists({
              type: "setTaskListOrder",
              taskListOrder,
              taskListOrderStatus: "ready",
            });
            if (!snapshot.metadata.fromCache) {
              retryDelayMs = 1000;
              reportedError = false;
            }
          } catch (error) {
            console.error("taskListOrder decode error:", error);
            logException("task_list_order_decode", error);
            dispatchTaskLists({
              type: "setTaskListOrder",
              taskListOrder: taskListOrderStateRef.current,
              taskListOrderStatus: "error",
            });
          }
        },
        scheduleRetry,
      );
    };
    installListener();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      clearListener();
    };
  }, [activeUid, loadAppData]);

  const orderedTaskListIds = useMemo(
    () => getOrderedTaskListIds(taskListsState.taskListOrder),
    [taskListsState.taskListOrder],
  );
  const orderedTaskListIdsKey = useMemo(() => {
    const updatedAt = taskListsState.taskListOrder?.updatedAt;
    return `${orderedTaskListIds.length > 0 ? [...orderedTaskListIds].sort().join("|") : ""}:${String(updatedAt ?? "")}`;
  }, [orderedTaskListIds, taskListsState.taskListOrder?.updatedAt]);
  const orderedTaskListIdsRef = useRef(orderedTaskListIds);
  orderedTaskListIdsRef.current = orderedTaskListIds;
  const [memberTaskListIds, setMemberTaskListIds] = useState<string[] | null>(
    null,
  );
  const membershipUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeUid) {
      membershipUidRef.current = null;
      setMemberTaskListIds([]);
      return;
    }

    if (membershipUidRef.current !== activeUid) {
      setMemberTaskListIds(null);
    }
    const applyMemberTaskListIds = (nextIds: string[]) => {
      membershipUidRef.current = activeUid;
      setMemberTaskListIds((currentIds) => {
        if (!currentIds || currentIds.length !== nextIds.length) {
          return nextIds;
        }
        const nextIdSet = new Set(nextIds);
        return currentIds.every((id) => nextIdSet.has(id))
          ? currentIds
          : nextIds;
      });
    };
    let disposed = false;
    let retryTimer: number | null = null;
    let retryDelayMs = 1000;
    const resolveMembership = async () => {
      try {
        const accessibleIds = await resolveMemberTaskListIds(
          orderedTaskListIdsRef.current,
          activeUid,
          authStateReady ? "server" : "cache",
        );
        if (disposed) return;
        if (
          !authStateReady &&
          orderedTaskListIdsRef.current.length > 0 &&
          accessibleIds.length === 0
        ) {
          return;
        }
        applyMemberTaskListIds(accessibleIds);
        retryDelayMs = 1000;
      } catch (error) {
        if (disposed) return;
        logException("task_list_membership_decode", error);
        if (getErrorCategory(error) === "permission-denied") {
          applyMemberTaskListIds(orderedTaskListIdsRef.current);
          return;
        }
        const delayMs = retryDelayMs;
        retryDelayMs = Math.min(delayMs * 2, 30000);
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          void resolveMembership();
        }, delayMs);
      }
    };
    void resolveMembership();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [activeUid, authStateReady, orderedTaskListIdsKey]);

  useEffect(() => {
    const accessibleTaskListIds = memberTaskListIds ?? [];
    dispatchTaskLists({
      type: "pruneTaskListsById",
      taskListIds: accessibleTaskListIds,
    });

    if (!activeUid || memberTaskListIds === null) {
      dispatchTaskLists({
        type: "setTaskListDocsStatus",
        taskListDocsStatus: "loading",
      });
      return;
    }

    if (accessibleTaskListIds.length === 0) {
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

    const taskListQueryChunks = getTaskListIdChunks(accessibleTaskListIds).map(
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
        const rawTaskListData = documentSnapshot.data({
          serverTimestamps: "estimate",
        });
        scheduleMalformedTaskCleanup(
          documentSnapshot.id,
          rawTaskListData,
          snapshot.metadata.fromCache,
          snapshot.metadata.hasPendingWrites,
        );
        try {
          taskListsById[documentSnapshot.id] = normalizeTaskListStore(
            assertTaskListStore(rawTaskListData, documentSnapshot.id),
          );
        } catch (error) {
          console.error("taskList decode error:", error);
          logException("task_list_decode", error);
        }
      });
      dispatchTaskLists({
        type: "setTaskListChunk",
        taskListIds,
        taskListsById,
      });
    };

    let disposed = false;
    const chunks = taskListQueryChunks.map((chunk) => ({
      ...chunk,
      unsubscribe: null as (() => void) | null,
      retryTimer: null as number | null,
      retryDelayMs: 1000,
      failed: false,
      loaded: false,
    }));
    const publishStatus = () => {
      dispatchTaskLists({
        type: "setTaskListDocsStatus",
        taskListDocsStatus: chunks.some((chunk) => chunk.failed)
          ? "error"
          : chunks.every((chunk) => chunk.loaded)
            ? "ready"
            : "loading",
      });
    };
    const installListener = (chunk: (typeof chunks)[number]) => {
      if (disposed) return;
      chunk.unsubscribe?.();
      chunk.unsubscribe = onSnapshot(
        chunk.taskListQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (disposed) return;
          applyTaskListSnapshot(chunk.taskListIds, snapshot);
          chunk.loaded = true;
          if (!snapshot.metadata.fromCache) {
            chunk.retryDelayMs = 1000;
            chunk.failed = false;
          }
          publishStatus();
        },
        (error: FirestoreError) => {
          if (disposed || chunk.retryTimer !== null) return;
          if (!chunk.failed)
            void logSyncListenerError("task_lists", error.code);
          chunk.failed = true;
          publishStatus();
          chunk.unsubscribe?.();
          chunk.unsubscribe = null;
          if (
            !isRetryableFirestoreListenerError(
              error,
              sessionRef.current.authStatus === "loading",
            )
          ) {
            return;
          }
          const delayMs = chunk.retryDelayMs;
          chunk.retryDelayMs = Math.min(delayMs * 2, 30000);
          chunk.retryTimer = window.setTimeout(() => {
            chunk.retryTimer = null;
            installListener(chunk);
          }, delayMs);
        },
      );
    };
    chunks.forEach(installListener);
    return () => {
      disposed = true;
      chunks.forEach((chunk) => {
        chunk.unsubscribe?.();
        if (chunk.retryTimer !== null) window.clearTimeout(chunk.retryTimer);
      });
    };
  }, [activeUid, memberTaskListIds]);

  const registerSharedTaskList = useCallback((taskListId: string) => {
    const nextCount =
      (sharedTaskListRefCounts.current.get(taskListId) ?? 0) + 1;
    sharedTaskListRefCounts.current.set(taskListId, nextCount);

    if (!sharedTaskListUnsubscribers.current.has(taskListId)) {
      let disposed = false;
      let retryTimer: number | null = null;
      let retryDelayMs = 1000;
      let reportedError = false;
      let unsubscribe: (() => void) | null = null;
      const clearListener = () => {
        unsubscribe?.();
        unsubscribe = null;
      };
      const scheduleRetry = (error: FirestoreError) => {
        if (disposed || retryTimer !== null) return;
        if (!reportedError) {
          void logSyncListenerError("shared_task_list", error.code);
          reportedError = true;
        }
        dispatchTaskLists({
          type: "setSharedTaskList",
          taskListId,
          taskListData: sharedTaskListsByIdRef.current[taskListId] ?? null,
        });
        clearListener();
        if (
          !isRetryableFirestoreListenerError(
            error,
            sessionRef.current.authStatus === "loading",
          )
        ) {
          return;
        }
        const delayMs = retryDelayMs;
        retryDelayMs = Math.min(retryDelayMs * 2, 30000);
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          if (!disposed) installListener();
        }, delayMs);
      };
      const installListener = () => {
        if (disposed) return;
        clearListener();
        unsubscribe = onSnapshot(
          doc(getDbInstance(), "taskLists", taskListId),
          { includeMetadataChanges: true },
          (snapshot) => {
            const rawTaskListData = snapshot.exists()
              ? snapshot.data({ serverTimestamps: "estimate" })
              : null;
            if (rawTaskListData) {
              scheduleMalformedTaskCleanup(
                taskListId,
                rawTaskListData,
                snapshot.metadata.fromCache,
                snapshot.metadata.hasPendingWrites,
              );
            }
            let taskListData: TaskListStore | null = null;
            try {
              taskListData = rawTaskListData
                ? normalizeTaskListStore(
                    assertTaskListStore(rawTaskListData, taskListId),
                  )
                : null;
            } catch (error) {
              console.error("shared taskList decode error:", error);
              logException("shared_task_list_decode", error);
            }
            dispatchTaskLists({
              type: "setSharedTaskList",
              taskListId,
              taskListData,
            });
            if (!snapshot.metadata.fromCache) {
              retryDelayMs = 1000;
              reportedError = false;
            }
          },
          scheduleRetry,
        );
      };
      const cleanup = () => {
        disposed = true;
        if (retryTimer !== null) window.clearTimeout(retryTimer);
        clearListener();
      };
      sharedTaskListUnsubscribers.current.set(taskListId, cleanup);
      installListener();
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
    const unsubscribers = sharedTaskListUnsubscribers.current;
    const refCounts = sharedTaskListRefCounts.current;
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.clear();
      refCounts.clear();
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

  const settingsContextValue = useMemo<SettingsContextValue>(
    () => ({ ...settingsState, setOptimisticAutoSort }),
    [settingsState, setOptimisticAutoSort],
  );

  return (
    <SessionContext.Provider value={sessionContextValue}>
      <SettingsContext.Provider value={settingsContextValue}>
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

function useSettingsState(): SettingsContextValue {
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

const requireCurrentUser = (): FirebaseAuthUser => {
  const user = getAuthInstance().currentUser;
  if (!user) {
    throw new Error("No user logged in");
  }
  return user;
};

const requireCurrentUserId = (): string => requireCurrentUser().uid;

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
    ? assertSettingsStore(settingsSnapshot.data(), uid)
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
  const settingsData: SettingsStore = {
    theme: "system",
    language: normalizedLanguage,
    taskInsertPosition: "top",
    autoSort: true,
    startupView: "taskList",
    createdAt: now,
    updatedAt: now,
  };
  const taskListData: TaskListStore = {
    id: taskListId,
    name: getTranslationBundle(normalizedLanguage).app.initialTaskListName,
    tasks: {},
    history: [],
    shareCode: null,
    background: null,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  const taskListOrderData: TaskListOrderStore = {
    [taskListId]: { order: 1.0 },
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, "settings", uid), settingsData);
  batch.set(doc(db, "taskLists", taskListId), taskListData);
  batch.set(doc(db, "taskLists", taskListId, "members", uid), {
    joinedAt: now,
    joinCode: null,
  });
  batch.set(doc(db, "taskListOrder", uid), taskListOrderData);
  try {
    await batch.commit();
  } catch (error) {
    await deleteUser(userCredential.user).catch(() => {});
    await firebaseSignOut(auth).catch(() => {});
    throw error;
  }
}

async function signIn(email: string, password: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      logException("auth_sign_in_timeout");
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

async function deleteAccount(password: string) {
  const user = requireCurrentUser();
  if (!user.email || !password) throw new Error("Authentication required");
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );
  const db = getDbInstance();
  const uid = user.uid;
  const taskListOrderRef = doc(db, "taskListOrder", uid);
  const taskListOrderSnapshot = await getDoc(taskListOrderRef);
  if (taskListOrderSnapshot.exists()) {
    const taskListOrderData = assertTaskListOrderStore(
      taskListOrderSnapshot.data(),
      uid,
    );
    const taskListIds = getTaskListOrderEntries(taskListOrderData).map(
      ([taskListId]) => taskListId,
    );
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
  if (!isRecord(data)) throw new Error(`TaskList not found: ${id}`);
  const tasks = isRecord(data.tasks) ? data.tasks : null;
  if (
    data.id !== id ||
    typeof data.name !== "string" ||
    tasks === null ||
    !Array.isArray(data.history) ||
    !data.history.every((value) => typeof value === "string") ||
    (data.shareCode !== null && typeof data.shareCode !== "string") ||
    (data.background !== null && typeof data.background !== "string") ||
    typeof data.memberCount !== "number" ||
    !Number.isInteger(data.memberCount) ||
    data.memberCount < 1 ||
    (typeof data.createdAt !== "number" && !hasToMillis(data.createdAt)) ||
    (typeof data.updatedAt !== "number" && !hasToMillis(data.updatedAt))
  ) {
    throw new Error(`TaskList data is malformed: ${id}`);
  }
  const validTasks: Record<string, TaskListStoreTask> = {};
  for (const [taskId, task] of Object.entries(tasks)) {
    if (isCompleteTaskStoreTask(taskId, task)) {
      validTasks[taskId] = task;
    }
  }
  return {
    id,
    name: data.name,
    tasks: validTasks,
    history: data.history,
    shareCode: data.shareCode,
    background: data.background,
    memberCount: data.memberCount,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function assertTaskListOrderStore(
  data: unknown,
  uid: string,
): TaskListOrderStore {
  if (!isRecord(data)) throw new Error(`TaskListOrder not found: ${uid}`);
  if (
    typeof data.createdAt !== "number" ||
    !Number.isFinite(data.createdAt) ||
    typeof data.updatedAt !== "number" ||
    !Number.isFinite(data.updatedAt)
  ) {
    throw new Error(`TaskListOrder data is malformed: ${uid}`);
  }
  const result: TaskListOrderStore = {
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  for (const [taskListId, value] of Object.entries(data)) {
    if (TASK_LIST_ORDER_METADATA_KEYS.has(taskListId)) continue;
    if (
      !isRecord(value) ||
      typeof value.order !== "number" ||
      !Number.isFinite(value.order)
    ) {
      throw new Error(`TaskListOrder data is malformed: ${uid}`);
    }
    result[taskListId] = { order: value.order };
  }
  return result;
}

function assertSettingsStore(data: unknown, uid: string): SettingsStore {
  if (!isRecord(data)) throw new Error(`Settings not found: ${uid}`);
  const theme = data.theme == null ? "system" : data.theme;
  const language = data.language == null ? DEFAULT_LANGUAGE : data.language;
  const taskInsertPosition =
    data.taskInsertPosition == null ? "top" : data.taskInsertPosition;
  const startupView = data.startupView == null ? undefined : data.startupView;
  if (
    (theme !== "system" && theme !== "light" && theme !== "dark") ||
    typeof language !== "string" ||
    !SUPPORTED_LANGUAGE_SET.has(language as Language) ||
    (taskInsertPosition !== "top" && taskInsertPosition !== "bottom") ||
    (data.autoSort != null && typeof data.autoSort !== "boolean")
  ) {
    throw new Error(`Settings data is malformed: ${uid}`);
  }
  return {
    theme: theme as Theme,
    language: language as Language,
    taskInsertPosition: taskInsertPosition as TaskInsertPosition,
    autoSort: data.autoSort ?? true,
    startupView:
      startupView === undefined ? undefined : normalizeStartupView(startupView),
    createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : undefined,
  };
}

function assertShareCodeStore(
  data: unknown,
  shareCode: string,
): { taskListId: string; createdAt: number } {
  if (
    !isRecord(data) ||
    typeof data.taskListId !== "string" ||
    !data.taskListId ||
    typeof data.createdAt !== "number" ||
    !Number.isFinite(data.createdAt)
  ) {
    throw new Error(`ShareCode data is malformed: ${shareCode}`);
  }
  return { taskListId: data.taskListId, createdAt: data.createdAt };
}

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
  const taskListRef = doc(getDbInstance(), "taskLists", taskListId);
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

function renumberTasks(tasks: TaskListStoreTask[]): TaskListStoreTask[] {
  return tasks.map((task, index) => ({ ...task, order: index + 1 }));
}

function getTaskDisplayGroup(
  task: Pick<TaskListStoreTask, "completed" | "pinned">,
) {
  if (task.completed) return 2;
  return task.pinned ? 0 : 1;
}

function hasTaskContent(
  task: Pick<TaskListStoreTask, "date" | "pinned" | "text">,
) {
  return task.text.trim().length > 0 || Boolean(task.date) || task.pinned;
}

function getOrderedTasks(
  taskList: Pick<TaskListStore, "tasks">,
  displayOrder = false,
): TaskListStoreTask[] {
  return Object.values(taskList.tasks)
    .filter(hasTaskContent)
    .sort((a, b) => {
      const groupDifference = displayOrder
        ? getTaskDisplayGroup(a) - getTaskDisplayGroup(b)
        : 0;
      return (
        groupDifference || a.order - b.order || compareStringIds(a.id, b.id)
      );
    });
}

function getDisplayOrderedTaskArray(tasks: Task[], autoSort: boolean): Task[] {
  if (!autoSort) return tasks;
  const taskRecords: Record<string, TaskListStoreTask> = Object.fromEntries(
    tasks.map((task, index) => [task.id, { ...task, order: index + 1 }]),
  );
  return getOrderedTasks({ tasks: taskRecords }, true).map(
    ({ id, text, completed, date, pinned }) => ({
      id,
      text,
      completed,
      date,
      pinned,
    }),
  );
}

function canReorderTasks(
  first: Pick<TaskListStoreTask, "completed" | "date" | "pinned">,
  second: Pick<TaskListStoreTask, "completed" | "date" | "pinned">,
  autoSort: boolean,
) {
  if (!autoSort) return true;
  return (
    getTaskDisplayGroup(first) === getTaskDisplayGroup(second) &&
    first.date === second.date
  );
}

function reorderTasksByIds(
  tasks: TaskListStoreTask[],
  orderedTaskIds: string[],
  autoSort: boolean,
): TaskListStoreTask[] | null {
  if (
    tasks.length !== orderedTaskIds.length ||
    new Set(orderedTaskIds).size !== tasks.length
  ) {
    return null;
  }
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const reorderedTasks = orderedTaskIds.map((taskId) => tasksById.get(taskId));
  if (reorderedTasks.some((task) => task === undefined)) return null;
  const nextTasks = reorderedTasks as TaskListStoreTask[];
  if (
    nextTasks.some(
      (task, index) => !canReorderTasks(task, tasks[index], autoSort),
    )
  ) {
    return null;
  }
  return renumberTasks(nextTasks);
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
  const previousTasks = params.previousTasks ?? [];
  const previousById = new Map(previousTasks.map((task) => [task.id, task]));
  const nextTaskIds = new Set(params.tasks.map((task) => task.id));
  previousTasks.forEach((task) => {
    if (!nextTaskIds.has(task.id)) {
      updates[`tasks.${task.id}`] = deleteField();
    }
  });
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
  const taskListId = await enqueueTaskListMutation<string>(
    `taskListOrder:${uid}`,
    async () => {
      const db = getDbInstance();
      const nextTaskListId = doc(collection(db, "taskLists")).id;
      const now = Date.now();
      const taskListOrder = assertTaskListOrderStore(
        (await getDoc(doc(db, "taskListOrder", uid))).data(),
        uid,
      );
      const nextOrder =
        Math.max(0, ...getOrderedTaskListOrders(taskListOrder)) + 1;
      const normalizedName = name.trim();
      const batch = writeBatch(db);
      batch.set(doc(db, "taskLists", nextTaskListId), {
        id: nextTaskListId,
        name: normalizedName,
        tasks: {},
        history: [],
        shareCode: null,
        background: background ?? null,
        memberCount: 1,
        createdAt: now,
        updatedAt: now,
      });
      batch.set(doc(db, "taskLists", nextTaskListId, "members", uid), {
        joinedAt: now,
        joinCode: null,
      });
      batch.set(
        doc(db, "taskListOrder", uid),
        {
          [nextTaskListId]: { order: nextOrder },
          updatedAt: now,
        },
        { merge: true },
      );
      return { committed: batch.commit(), result: nextTaskListId };
    },
  );
  if (!taskListId) throw new Error("Task list creation failed");
  return taskListId;
}

async function updateTaskList(
  taskListId: string,
  updates: { name?: string; background?: string | null },
) {
  await enqueueTaskListMutation(taskListId, async () => ({
    committed: updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
      ...updates,
      updatedAt: Date.now(),
    }),
  }));
}

async function deleteTaskList(taskListId: string) {
  const uid = requireCurrentUserId();
  await enqueueTaskListMutations(
    [taskListId, `taskListOrder:${uid}`],
    async () => {
      const db = getDbInstance();
      const taskListRef = doc(db, "taskLists", taskListId);
      const taskListOrderRef = doc(db, "taskListOrder", uid);
      const membershipRef = doc(db, "taskLists", taskListId, "members", uid);
      const [taskListSnapshot, taskListOrderSnapshot] = await Promise.all([
        getDocFromServer(taskListRef),
        getDocFromServer(taskListOrderRef),
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
        !getTaskListOrderEntries(taskListOrder).some(
          ([id]) => id === taskListId,
        )
      ) {
        return;
      }
      const now = Date.now();
      const batch = writeBatch(db);
      batch.update(taskListOrderRef, {
        [taskListId]: deleteField(),
        updatedAt: now,
      });
      batch.delete(membershipRef);
      if (taskList.memberCount <= 1) {
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
      return { committed: batch.commit() };
    },
  );
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
    return {
      committed: updateDoc(doc(getDbInstance(), "taskListOrder", uid), updates),
    };
  });
}

async function addTask(
  taskListId: string,
  rawText: string,
  settings: ResolvedTaskSettings,
  options?: { taskId?: string; date?: string; pinned?: boolean },
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
      pinned: options?.pinned ?? parsed.pinned,
    };
    if (!hasTaskContent(nextTask)) {
      throw new Error("Task has no content");
    }
    const nextTasks = getSortedTasks(
      settings.taskInsertPosition === "top"
        ? [nextTask, ...tasks]
        : [...tasks, nextTask],
      settings,
    );
    return {
      committed: updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
        ...buildTaskUpdateData({ previousTasks: tasks, tasks: nextTasks }),
        history: buildHistory(taskList, parsed.text),
        updatedAt: now,
      }),
    };
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
      typeof updates.date === "string" ||
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
      normalizedUpdates.text =
        updates.text?.trim() === "" &&
        ("date" in updates || "pinned" in updates)
          ? ""
          : resolvedTextAndDate.text;
      if (!("date" in updates)) {
        normalizedUpdates.date = resolvedTextAndDate.date;
      }
      if (!("pinned" in updates) && resolvedTextAndDate.pinnedChanged) {
        normalizedUpdates.pinned = resolvedTextAndDate.pinned;
      }
    }
    const now = Date.now();
    const historyUpdate =
      taskList &&
      currentTask &&
      resolvedTextAndDate &&
      resolvedTextAndDate.text.trim() !== currentTask.text.trim()
        ? buildHistory(taskList, resolvedTextAndDate.text, currentTask.text)
        : null;

    const nextCurrentTask = currentTask
      ? { ...currentTask, ...normalizedUpdates }
      : null;
    if (nextCurrentTask && !hasTaskContent(nextCurrentTask)) {
      return {
        committed: updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
          [`tasks.${taskId}`]: deleteField(),
          updatedAt: now,
        }),
      };
    }

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
      return {
        committed: updateDoc(
          doc(getDbInstance(), "taskLists", taskListId),
          nextUpdates,
        ),
      };
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
    const nextTasks = getSortedTasks(updatedTasks, settings);
    const nextUpdates: Record<string, unknown> = {
      ...buildTaskUpdateData({ previousTasks: tasks, tasks: nextTasks }),
      updatedAt: now,
    };
    if (historyUpdate) {
      nextUpdates.history = historyUpdate;
    }
    return {
      committed: updateDoc(
        doc(getDbInstance(), "taskLists", taskListId),
        nextUpdates,
      ),
    };
  });
}

async function moveTask(
  sourceTaskListId: string,
  targetTaskListId: string,
  taskId: string,
  updates: Partial<Pick<Task, "date" | "pinned" | "text">>,
  settings: ResolvedTaskSettings,
) {
  await enqueueTaskListMutations(
    [sourceTaskListId, targetTaskListId],
    async () => {
      const [sourceTaskList, targetTaskList] = await Promise.all([
        getTaskListData(sourceTaskListId),
        getTaskListData(targetTaskListId),
      ]);
      const currentTask = sourceTaskList.tasks[taskId];
      if (!currentTask) {
        throw new Error("Task not found");
      }
      const resolved =
        typeof updates.text === "string"
          ? resolveTaskInput(updates.text, settings.language, currentTask)
          : null;
      const nextText =
        updates.text?.trim() === "" &&
        ("date" in updates || "pinned" in updates)
          ? ""
          : resolved
            ? resolved.text
            : currentTask.text;
      const nextDate =
        updates.date !== undefined
          ? updates.date
          : (resolved?.date ?? currentTask.date);
      const nextPinned =
        typeof updates.pinned === "boolean"
          ? updates.pinned
          : resolved?.pinnedChanged
            ? resolved.pinned
            : currentTask.pinned;
      if (
        !hasTaskContent({
          text: nextText,
          date: nextDate,
          pinned: nextPinned,
        })
      ) {
        return {
          committed: updateDoc(
            doc(getDbInstance(), "taskLists", sourceTaskListId),
            {
              [`tasks.${taskId}`]: deleteField(),
              updatedAt: Date.now(),
            },
          ),
        };
      }
      const now = Date.now();
      const targetTasks = getOrderedTasks(targetTaskList);
      const nextOrder =
        settings.taskInsertPosition === "bottom"
          ? (targetTasks[targetTasks.length - 1]?.order ?? 0) + 1
          : (targetTasks[0]?.order ?? 1) - 1;
      const movedTask: TaskListStoreTask = {
        id: taskId,
        text: nextText,
        completed: currentTask.completed,
        date: nextDate,
        order: nextOrder,
        pinned: nextPinned,
      };
      const nextTargetTasks = getSortedTasks(
        settings.taskInsertPosition === "top"
          ? [movedTask, ...targetTasks]
          : [...targetTasks, movedTask],
        settings,
      );
      const db = getDbInstance();
      const batch = writeBatch(db);
      batch.update(doc(db, "taskLists", sourceTaskListId), {
        [`tasks.${taskId}`]: deleteField(),
        updatedAt: now,
      });
      batch.update(doc(db, "taskLists", targetTaskListId), {
        ...buildTaskUpdateData({
          previousTasks: targetTasks,
          tasks: nextTargetTasks,
        }),
        history: buildHistory(targetTaskList, nextText),
        updatedAt: now,
      });
      return { committed: batch.commit() };
    },
  );
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
    return {
      committed: updateDoc(
        doc(getDbInstance(), "taskLists", taskListId),
        nextData,
      ),
    };
  });
}

async function sortTasks(taskListId: string) {
  await enqueueTaskListMutation(taskListId, async () => {
    const taskList = await getTaskListData(taskListId);
    const tasks = getOrderedTasks(taskList);
    const sortedTasks = getAutoSortedTasks(tasks);
    return {
      committed: updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
        ...buildTaskUpdateData({ previousTasks: tasks, tasks: sortedTasks }),
        updatedAt: Date.now(),
      }),
    };
  });
}

async function updateTasksOrder(
  taskListId: string,
  orderedTaskIds: string[],
  autoSort: boolean,
) {
  await enqueueTaskListMutation(taskListId, async () => {
    const taskList = await getTaskListData(taskListId);
    const tasks = autoSort
      ? getOrderedTasks(taskList, true)
      : getOrderedTasks(taskList);
    const nextTasks = reorderTasksByIds(tasks, orderedTaskIds, autoSort);
    if (!nextTasks) return;
    return {
      committed: updateDoc(doc(getDbInstance(), "taskLists", taskListId), {
        ...buildTaskUpdateData({ previousTasks: tasks, tasks: nextTasks }),
        updatedAt: Date.now(),
      }),
    };
  });
}

const MAX_SHARE_CODE_ATTEMPTS = 10;

async function fetchTaskListByShareCode(shareCode: string) {
  const normalizedCode = normalizeShareCode(shareCode);
  if (!normalizedCode) return null;
  const snapshots = await getDocFromServer(
    doc(getDbInstance(), "shareCodes", normalizedCode),
  );
  return snapshots.exists()
    ? assertShareCodeStore(snapshots.data(), normalizedCode)
    : null;
}

async function fetchTaskListIdByShareCode(shareCode: string) {
  const shareCodeData = await fetchTaskListByShareCode(shareCode);
  if (!shareCodeData) return null;
  const snapshot = await getDocFromServer(
    doc(getDbInstance(), "taskLists", shareCodeData.taskListId),
  );
  if (!snapshot.exists()) return null;
  const taskList = assertTaskListStore(
    snapshot.data(),
    shareCodeData.taskListId,
  );
  return taskList.shareCode === normalizeShareCode(shareCode)
    ? shareCodeData.taskListId
    : null;
}

async function addSharedTaskListToOrder(taskListId: string, shareCode: string) {
  const uid = requireCurrentUserId();
  const normalizedCode = normalizeShareCode(shareCode);
  if (!normalizedCode) throw new Error("Invalid share code");
  await enqueueTaskListMutations(
    [taskListId, `taskListOrder:${uid}`],
    async () => {
      const db = getDbInstance();
      const taskListRef = doc(db, "taskLists", taskListId);
      const taskListOrderRef = doc(db, "taskListOrder", uid);
      const membershipRef = doc(db, "taskLists", taskListId, "members", uid);
      const [taskListSnapshot, taskListOrderSnapshot, membershipSnapshot] =
        await Promise.all([
          getDocFromServer(taskListRef),
          getDocFromServer(taskListOrderRef),
          getDocFromServer(membershipRef),
        ]);
      const taskList = assertTaskListStore(taskListSnapshot.data(), taskListId);
      if (taskList.shareCode !== normalizedCode) {
        throw new Error("Invalid share code");
      }
      const taskListOrder = taskListOrderSnapshot.exists()
        ? assertTaskListOrderStore(taskListOrderSnapshot.data(), uid)
        : null;
      if (
        taskListOrder &&
        getTaskListOrderEntries(taskListOrder).some(
          ([id]) => id === taskListId,
        ) &&
        membershipSnapshot.exists()
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
      if (!membershipSnapshot.exists()) {
        batch.set(membershipRef, {
          joinedAt: now,
          joinCode: normalizedCode,
        });
        batch.update(taskListRef, {
          memberCount: increment(1),
          updatedAt: now,
        });
      }
      return { committed: batch.commit() };
    },
  );
}

async function removeShareCode(taskListId: string) {
  await enqueueTaskListMutation(taskListId, async () => {
    const db = getDbInstance();
    const snapshot = await getDocFromServer(doc(db, "taskLists", taskListId));
    const taskList = assertTaskListStore(snapshot.data(), taskListId);
    if (!taskList.shareCode) return;
    const normalizedCode = normalizeShareCode(taskList.shareCode);
    const batch = writeBatch(db);
    if (normalizedCode) {
      batch.delete(doc(db, "shareCodes", normalizedCode));
    }
    batch.update(doc(db, "taskLists", taskListId), {
      shareCode: null,
      updatedAt: Date.now(),
    });
    return { committed: batch.commit() };
  });
}

function generateRandomShareCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    crypto.getRandomValues(new Uint32Array(8)),
    (value) => chars[value % chars.length],
  ).join("");
}

async function generateShareCode(taskListId: string): Promise<string> {
  const shareCode = await enqueueTaskListMutation<string>(
    taskListId,
    async () => {
      const db = getDbInstance();
      for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
        try {
          const nextShareCode = generateRandomShareCode();
          const shareCodeRef = doc(db, "shareCodes", nextShareCode);
          const shareCodeSnapshot = await getDocFromServer(shareCodeRef);
          if (shareCodeSnapshot.exists()) continue;
          const snapshot = await getDocFromServer(
            doc(db, "taskLists", taskListId),
          );
          const taskList = assertTaskListStore(snapshot.data(), taskListId);
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
            shareCode: nextShareCode,
            updatedAt: Date.now(),
          });
          await batch.commit();
          return {
            committed: Promise.resolve(),
            result: nextShareCode,
          };
        } catch (error) {
          if (isAbortError(error) && attempt + 1 < MAX_SHARE_CODE_ATTEMPTS) {
            continue;
          }
          throw error;
        }
      }
      throw new Error("Failed to generate share code");
    },
  );
  if (!shareCode) throw new Error("Failed to generate share code");
  return shareCode;
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
  | "check"
  | "add"
  | "link"
  | "chevron-right";

const ICON_PATHS: Record<AppIconName, string | string[]> = {
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM5.92 19H5v-.92l9.06-9.06.92.92L5.92 19zM20.71 5.63l-2.34-2.34c-.2-.2-.45-.29-.71-.29s-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41z",
  share:
    "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
  "calendar-today":
    "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z",
  "push-pin": "M16 9V4l1-1V2H7v1l1 1v5l-2 2v2h5.2v7h1.6v-7H18v-2l-2-2z",
  "drag-indicator":
    "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  settings:
    "M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
  close:
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  sort: "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z",
  delete:
    "M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z",
  "arrow-back": "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  "alert-circle":
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  "chevron-right": "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
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
  const shouldMirrorArrow =
    (name === "arrow-back" || name === "chevron-right") && isRtl;
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
  const { t } = useTranslation();
  return (
    <div className="ll-flex ll-flex-wrap ll-gap-1">
      {colors.map((color) => {
        const isSelected = selectedColor === color.value;
        const colorNameKey: ColorNameKey | undefined =
          color.value === null
            ? "taskList.backgroundNoneShort"
            : COLOR_NAME_KEYS[color.value];
        const ariaLabel =
          color.label ??
          (colorNameKey
            ? `${ariaLabelPrefix}: ${t(colorNameKey)}`
            : `${ariaLabelPrefix} ${color.value ?? ""}`.trim());
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
            className="ll-color-swatch"
          >
            <span
              aria-hidden="true"
              className="ll-color-swatch-dot"
              data-empty={color.value === null ? "true" : undefined}
              style={{ backgroundColor: previewColor }}
            >
              {color.shortLabel ?? ""}
            </span>
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
          "ll-anim-dialog ll-dialog-panel ll-fixed ll-left-half ll-top-half ll-z-1300 ll-translate-x-neg-half ll-translate-y-neg-half ll-bg-dialog ll-outline-none ll-p-6 ll-text-dialog-fg ll-shadow-2xl",
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
          "ll-anim-sheet ll-sheet-panel ll-fixed ll-inset-x-0 ll-bottom-0 ll-z-1300 ll-flex ll-max-h-sheet ll-w-full ll-translate-x-0 ll-translate-y-0 ll-flex-col ll-overflow-hidden ll-rounded-t-28px ll-bg-white-b ll-outline-none ll-px-4 ll-pb-6 ll-pt-3 ll-text-gray-900 ll-shadow-2xl ll-sm-left-half ll-sm-top-half ll-sm-translate-x-neg-half ll-sm-translate-y-neg-half ll-dark-bg-gray-900b ll-dark-text-gray-50",
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

function DialogFooter({
  children,
  start,
}: {
  children: ReactNode;
  start?: ReactNode;
}) {
  return (
    <div className="ll-mt-6 ll-flex ll-flex-wrap ll-items-center ll-justify-end ll-gap-2">
      {start ? <div className="ll-dialog-footer-start">{start}</div> : null}
      {children}
    </div>
  );
}

const BUTTON_PRIMARY_CLASS = "ll-pressable ll-btn ll-btn-primary";
const BUTTON_SECONDARY_CLASS = "ll-pressable ll-btn ll-btn-secondary";
const BUTTON_GHOST_CLASS = "ll-pressable ll-btn ll-btn-ghost";
const BUTTON_TONAL_CLASS = "ll-pressable ll-btn ll-btn-tonal";
const BUTTON_DANGER_CLASS = "ll-pressable ll-btn ll-btn-danger";
const BUTTON_DESTRUCTIVE_CLASS = "ll-pressable ll-btn ll-btn-destructive";
const ICON_BUTTON_CLASS = "ll-pressable ll-icon-btn";

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
      className={clsx(ICON_BUTTON_CLASS, "ll-page-header-back")}
    >
      <AppIcon name="arrow-back" aria-hidden="true" focusable="false" />
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
              className={BUTTON_SECONDARY_CLASS}
            >
              {cancelText}
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={
              isDestructive ? BUTTON_DESTRUCTIVE_CLASS : BUTTON_PRIMARY_CLASS
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
    <section className="ll-rounded-xl ll-bg-white-b ll-px-4 ll-py-3 ll-dark-bg-gray-900b">
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
      className={`ll-settings-row ll-transition ll-focus-within-outline-1 ll-focus-within-outline-2 ll-focus-within-outline-offset-2 ll-focus-within-outline-gray-300 ll-dark-focus-within-outline-gray-700 ${
        disabled ? "ll-opacity-50" : ""
      }`}
    >
      <span className="ll-min-w-0 ll-flex-1">{label}</span>
      <span className="ll-settings-select-wrap">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="ll-settings-select ll-text-sm ll-text-gray-900 ll-dark-text-gray-50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
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
  const { settings, settingsStatus, setOptimisticAutoSort } =
    useSettingsState();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "signOut" | "deleteAccount" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  }): Promise<boolean> => {
    if (isUpdating) {
      return false;
    }

    setError(null);
    setIsUpdating(true);
    try {
      await updateSettings(next);
      return true;
    } catch (err) {
      setError(resolveErrorMessage(err, t, "auth.error.general"));
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    await updateSetting({ theme });
    logAppEvent("settings_theme_change", { theme });
  };

  const handleLanguageChange = async (language: Language) => {
    await updateSetting({ language });
    logAppEvent("settings_language_change", { language });
  };

  const handleTaskInsertPositionChange = async (
    taskInsertPosition: TaskInsertPosition,
  ) => {
    await updateSetting({ taskInsertPosition });
    logAppEvent("settings_task_insert_position_change", {
      position: taskInsertPosition,
    });
  };

  const handleAutoSortChange = async (autoSort: boolean) => {
    const previousAutoSort = settings?.autoSort ?? true;
    setOptimisticAutoSort(autoSort);
    const updated = await updateSetting({ autoSort });
    if (updated) {
      logAppEvent("settings_auto_sort_change", { enabled: autoSort });
    } else {
      setOptimisticAutoSort(previousAutoSort);
    }
  };

  const handleStartupViewChange = async (startupView: StartupView) => {
    await updateSetting({ startupView });
    logAppEvent("settings_startup_view_change", { view: startupView });
  };

  const handleSignOut = async () => {
    if (pendingAction) {
      return;
    }

    setPendingAction("signOut");
    setError(null);

    try {
      await signOut();
      logAppEvent("sign_out");
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
      setDeleteError(null);
      await deleteAccount(deletePassword);
      setDeletePassword("");
      setShowDeleteConfirm(false);
      logAppEvent("delete_account");
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    } catch (err) {
      setDeleteError(resolveErrorMessage(err, t, "auth.error.general"));
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
      logAppEvent("email_change_requested");
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
    <div className="ll-h-5 ll-w-32 ll-animate-pulse ll-rounded ll-bg-gray-300 ll-dark-bg-gray-700" />
  );

  return (
    <div className="ll-min-h-full ll-w-full ll-bg-gray-50 ll-text-gray-900 ll-dark-bg-gray-950 ll-dark-text-gray-50">
      {showBackButton ? (
        <AppHeader
          backLabel={t("common.back")}
          onBack={() => onBack?.()}
          title={t("settings.title")}
        />
      ) : null}
      <div
        className={clsx(
          "ll-page-container ll-flex ll-flex-col ll-gap-4",
          showBackButton && "ll-page-container-compact",
        )}
      >
        {showBackButton ? null : (
          <header className="ll-page-header">
            <h1 className="ll-page-title">{t("settings.title")}</h1>
          </header>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {settingsStatus === "error" ? (
          <Alert variant="error">{t("auth.error.general")}</Alert>
        ) : (
          <>
            <SettingsSection>
              <div className="ll-flex ll-flex-col">
                <h2 className="ll-settings-heading">
                  {t("settings.userInfo.title")}
                </h2>
                <div className="ll-flex ll-flex-col">
                  <div className="ll-settings-row">
                    {user ? (
                      <p className="ll-m-0 ll-min-w-0 ll-break-all">
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
                      className="ll-settings-row"
                    >
                      {t("settings.emailChange.title")}
                      <AppIcon
                        name="chevron-right"
                        size={20}
                        className="ll-muted-icon"
                        aria-hidden="true"
                        focusable="false"
                      />
                    </button>
                  )}
                  {showEmailChangeForm && (
                    <div className="ll-flex ll-flex-col ll-gap-3 ll-pb-3 ll-pt-1">
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
                              className="ll-field-label ll-mb-1 ll-block"
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
                              className="ll-field"
                            />
                          </div>
                          <div className="ll-flex ll-justify-end ll-gap-2">
                            <button
                              type="button"
                              onClick={handleEmailChangeClose}
                              disabled={isChangingEmail}
                              className={BUTTON_SECONDARY_CLASS}
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleEmailChangeSubmit()}
                              disabled={isChangingEmail || !newEmail.trim()}
                              className={BUTTON_PRIMARY_CLASS}
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
                <legend className="ll-settings-heading">
                  {t("settings.preferences.title")}
                </legend>
                <div className="ll-divide-y ll-divide-gray-300 ll-dark-divide-gray-700">
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
                      <div key={key} className="ll-settings-row">
                        <span>{label}</span>
                        {skeletonSelect}
                      </div>
                    ))
                  )}
                </div>
                <label
                  className={`ll-flex ll-cursor-pointer ll-items-center ll-justify-between ll-gap-4 ll-border-t ll-border-gray-300 ll-py-3 ll-transition ll-focus-within-outline-1 ll-focus-within-outline-2 ll-focus-within-outline-offset-2 ll-focus-within-outline-gray-300 ll-dark-border-gray-700 ll-dark-focus-within-outline-gray-700 ${
                    settingsDisabled ? "ll-opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name="autoSort"
                    role="switch"
                    aria-checked={settings?.autoSort ?? true}
                    checked={settings?.autoSort ?? true}
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
                    className={`ll-settings-toggle ll-relative ll-inline-flex ll-h-7 ll-w-12 ll-items-center ll-rounded-full ll-border ${
                      settings?.autoSort
                        ? "ll-border-gray-900 ll-bg-gray-900 ll-dark-border-gray-50 ll-dark-bg-gray-50"
                        : "ll-border-gray-300 ll-bg-gray-300 ll-dark-border-gray-700 ll-dark-bg-gray-900"
                    }`}
                  >
                    <span
                      data-checked={settings?.autoSort ? "true" : "false"}
                      className="ll-settings-toggle-thumb ll-inline-block ll-h-5 ll-w-5 ll-rounded-full ll-bg-white-b ll-shadow-sm ll-dark-bg-gray-950"
                    />
                  </span>
                </label>
              </fieldset>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-flex ll-flex-col">
                <h2 className="ll-settings-heading">
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
                        className="ll-settings-row"
                      >
                        {t(`settings.licenses.${key}`)}
                        <AppIcon
                          name="chevron-right"
                          size={20}
                          className="ll-muted-icon"
                          aria-hidden="true"
                          focusable="false"
                        />
                      </button>
                    </Fragment>
                  ),
                )}
              </div>
            </SettingsSection>

            <SettingsSection>
              <div className="ll-flex ll-flex-col">
                <h2 className="ll-settings-heading">
                  {t("settings.actions.title")}
                </h2>
                <div className="ll-flex ll-flex-col">
                  <button
                    type="button"
                    onClick={() => setShowSignOutConfirm(true)}
                    disabled={actionsDisabled}
                    className="ll-settings-row"
                  >
                    {signOutLabel}
                  </button>
                  <div className="ll-border-t ll-border-gray-300 ll-dark-border-gray-700" />
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={actionsDisabled}
                    className="ll-settings-row ll-settings-row-danger"
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

        <Dialog
          open={showDeleteConfirm}
          onOpenChange={(open) => {
            if (pendingAction) return;
            setShowDeleteConfirm(open);
            setDeletePassword("");
            setDeleteError(null);
          }}
        >
          <DialogContent
            title={t("auth.deleteAccountConfirm.title")}
            description={t("auth.deleteAccountConfirm.message")}
          >
            <form
              className="ll-space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
            >
              <FormInput
                id="delete-password"
                label={t("auth.form.password")}
                type="password"
                value={deletePassword}
                onChange={setDeletePassword}
                disabled={Boolean(pendingAction)}
                placeholder={t("auth.form.password")}
                autoComplete="current-password"
                error={deleteError ?? undefined}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    className={BUTTON_SECONDARY_CLASS}
                  >
                    {t("common.cancel")}
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={!deletePassword || Boolean(pendingAction)}
                  className={BUTTON_DESTRUCTIVE_CLASS}
                >
                  {pendingAction === "deleteAccount"
                    ? t("settings.deletingAccount")
                    : t("auth.button.delete")}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

type LicensesViewProps = {
  onBack?: () => void;
  showBackButton?: boolean;
  compact?: boolean;
};

function LicenseCard({ entry }: { entry: LicenseEntry }) {
  const sourceUrl = entry.repository ?? entry.source;

  return (
    <details className="ll-license-card ll-py-3">
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
          <AppIcon
            name="chevron-right"
            size={20}
            className="ll-license-chevron ll-muted-icon"
            aria-hidden="true"
            focusable="false"
          />
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

function LicensesView({
  onBack,
  showBackButton = false,
  compact = false,
}: LicensesViewProps) {
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
      {compact ? (
        <AppHeader
          backLabel={t("common.back")}
          onBack={() => onBack?.()}
          title={t("settings.licenses.title")}
        />
      ) : null}
      <div
        className={clsx(
          "ll-page-container ll-flex ll-flex-col ll-gap-4",
          compact && "ll-page-container-compact",
        )}
      >
        {compact ? null : (
          <header className="ll-page-header">
            {showBackButton ? <BackButton onBack={onBack} /> : null}
            <h1 className="ll-page-title">{t("settings.licenses.title")}</h1>
          </header>
        )}

        {error ? <Alert variant="error">{error}</Alert> : null}

        {!payload && !error ? <Spinner /> : null}

        {payload ? (
          <>
            <SettingsSection>
              <div className="ll-flex ll-flex-col">
                <h2 className="ll-settings-heading">
                  {t("settings.licenses.openSource")}
                </h2>
                <div className="ll-flex ll-flex-col ll-divide-y ll-divide-gray-300 ll-dark-divide-gray-700">
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
              <div className="ll-flex ll-flex-col">
                <h2 className="ll-settings-heading">
                  {t("settings.licenses.bundledAssets")}
                </h2>
                <div className="ll-flex ll-flex-col ll-divide-y ll-divide-gray-300 ll-dark-divide-gray-700">
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

type ColorNameKey =
  | "taskList.colorRed"
  | "taskList.colorYellow"
  | "taskList.colorGreen"
  | "taskList.colorBlue"
  | "taskList.colorIndigo"
  | "taskList.colorPurple"
  | "taskList.backgroundNoneShort";

const COLOR_NAME_KEYS: Partial<Record<string, ColorNameKey>> = {
  "#F87171": "taskList.colorRed",
  "#FBBF24": "taskList.colorYellow",
  "#34D399": "taskList.colorGreen",
  "#38BDF8": "taskList.colorBlue",
  "#818CF8": "taskList.colorIndigo",
  "#A78BFA": "taskList.colorPurple",
};

const resolveTaskListBackground = (background: string | null): string =>
  background
    ? `color-mix(in oklab, ${background} var(--tasklist-color-strength), var(--tasklist-theme-bg))`
    : "var(--tasklist-theme-bg)";

const LAST_TASK_LIST_STORAGE_KEY_PREFIX = "lightlist.lastTaskList.";

type LastTaskListSnapshot = {
  id: string;
  background: string;
};

const readLastTaskListSnapshot = (
  uid: string | null,
): LastTaskListSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(
      `${LAST_TASK_LIST_STORAGE_KEY_PREFIX}${uid}`,
    );
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

const writeLastTaskListSnapshot = (
  uid: string | null,
  snapshot: LastTaskListSnapshot,
): void => {
  if (typeof window === "undefined") {
    return;
  }
  if (!uid) return;
  try {
    window.localStorage.setItem(
      `${LAST_TASK_LIST_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(snapshot),
    );
  } catch {
    return;
  }
};

const parseTaskDate = (dateStr: string | null | undefined): Date | null =>
  parseTaskDateValue(dateStr ?? undefined) ?? null;

const createDateFromKey = (dateKey: string): Date | null =>
  parseTaskDateValue(dateKey) ?? null;

const formatMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getStringId = (id: UniqueIdentifier): string | null =>
  typeof id === "string" ? id : null;

type AppView = "taskLists" | "detail" | "settings" | "licenses" | "calendar";

type DatedTask = {
  taskListId: string;
  taskListName: string;
  taskListBackground: string | null;
  task: Task;
  dateValue: Date | null;
  dateKey: string;
  taskListIndex: number;
  taskIndex: number;
};

const getDatedTaskId = (task: DatedTask): string =>
  `${task.taskListId}:${task.task.id}`;

type OptimisticDatedTaskOverride = {
  revision: number;
  task: DatedTask | null;
};

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

type AppHeaderProps = {
  backLabel: string;
  onBack: () => void;
  title?: string;
};

function AppHeader({ backLabel, onBack, title }: AppHeaderProps) {
  return (
    <header className="ll-app-header">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        title={backLabel}
        className={ICON_BUTTON_CLASS}
      >
        <AppIcon name="arrow-back" aria-hidden="true" focusable="false" />
      </button>
      {title ? <h1 className="ll-app-header-title">{title}</h1> : null}
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
  fitContent = false,
  indicatorBackground,
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
  fitContent?: boolean;
  indicatorBackground?: string | null;
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
      className={clsx(
        "ll-relative ll-w-full",
        !fitContent && "ll-overflow-hidden",
        className,
      )}
      style={
        fitContent
          ? { backgroundColor: indicatorBackground ?? "transparent" }
          : undefined
      }
    >
      {showIndicators && count > 0 ? (
        <nav
          aria-label={ariaLabel}
          className={clsx(
            indicatorInFlow
              ? "ll-flex ll-justify-center ll-gap-0x5"
              : fitContent
                ? "ll-carousel-indicator-sticky"
                : "ll-pointer-events-none ll-absolute ll-left-0 ll-right-0 ll-z-30 ll-flex ll-justify-center ll-gap-0x5",
            indicatorInFlow
              ? indicatorPosition === "top"
                ? "ll-mb-2"
                : "ll-mt-2"
              : indicatorPosition === "top"
                ? "ll-top-14"
                : "ll-bottom-4",
          )}
          style={
            fitContent
              ? { backgroundColor: indicatorBackground ?? "transparent" }
              : undefined
          }
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
                "ll-carousel-indicator ll-inline-flex ll-items-center ll-justify-center ll-rounded-full ll-p-2",
                !indicatorInFlow && "ll-pointer-events-auto",
                "ll-hover-bg-gray-900-10 ll-dark-hover-bg-gray-50-10",
              )}
              aria-label={getIndicatorLabel?.(idx, count) ?? `${idx + 1}`}
              aria-current={idx === currentIndex ? "true" : undefined}
            >
              <span
                className={clsx(
                  "ll-carousel-indicator-dot ll-h-2 ll-w-2 ll-rounded-full",
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
          "ll-relative ll-flex ll-w-full ll-snap-x ll-snap-mandatory no-scrollbar ll-scroll-smooth",
          !fitContent && "ll-h-full",
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
            key={isValidElement(child) && child.key !== null ? child.key : idx}
            role="group"
            aria-roledescription="slide"
            aria-label={getIndicatorLabel?.(idx, count) ?? `${idx + 1}`}
            className={clsx(
              "ll-w-full ll-shrink-0 ll-snap-start ll-snap-always",
              !fitContent && "ll-h-full",
            )}
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
const DATE_FNS_LOCALE_LOADERS: Record<
  Exclude<Language, "en">,
  DateFnsLocaleLoader
> = {
  ja: () => import("date-fns/locale/ja").then((module) => module.ja),
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
    if (language === "en") {
      setLocale(undefined);
      return;
    }
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
        logException("date_fns_locale_load", error);
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
      navLayout="around"
      className={clsx("ll-w-full", className)}
      locale={resolvedLocale}
      classNames={{
        months: "ll-flex ll-w-full ll-flex-col",
        month: "ll-calendar-month ll-w-full",
        month_caption: "ll-flex ll-h-11 ll-items-center ll-justify-center",
        caption_label: "ll-font-semibold",
        button_previous: "ll-pressable ll-calendar-nav-button",
        button_next: "ll-pressable ll-calendar-nav-button",
        chevron: "ll-calendar-chevron",
        month_grid: "ll-w-full",
        weekdays: "ll-flex",
        weekday:
          "ll-flex-1 ll-text-xs ll-font-medium ll-text-gray-600 ll-dark-text-gray-300",
        week: "ll-mt-1 ll-flex ll-w-full",
        day: "ll-calendar-cell ll-relative ll-flex ll-h-12 ll-flex-1 ll-items-center ll-justify-center ll-p-0 ll-text-center ll-text-sm",
        day_button:
          "ll-calendar-day ll-h-10 ll-w-10 ll-rounded-full ll-p-0 ll-font-medium",
        selected: "",
        today: "",
        outside: "",
        disabled: "ll-opacity-50",
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
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1) return undefined;

  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
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
  index,
  canEdit,
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
  index: number;
  canEdit: boolean;
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
  const { ref, handleRef, isDragging } = useSortable({
    id: task.id,
    index,
    disabled: !canEdit,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      idle: true,
    },
  });
  const rowOpacity =
    (isDragging ? 0.8 : 1) * (task.completed ? completedTaskOpacity : 1);
  const style = {
    scale: isDragging ? "1.03" : undefined,
    transition: "opacity 180ms ease",
    opacity: rowOpacity,
  };
  const [isHandlePointerDown, setIsHandlePointerDown] = useState(false);
  const animateEnterRef = useRef(animateEnter);
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
      ref={ref}
      style={style}
      className={clsx(
        "ll-task-row ll-flex ll-items-center ll-gap-0",
        dateDisplayValue ? "ll-task-row-with-date" : null,
        animateEnterRef.current && "ll-anim-task-enter",
        isExiting && "ll-anim-task-exit",
      )}
    >
      {canEdit ? (
        <button
          ref={handleRef}
          title={t("pages.tasklist.dragHint")}
          aria-label={t("pages.tasklist.dragHint")}
          type="button"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            setIsHandlePointerDown(true);
          }}
          className="ll-task-row-handle ll-muted-icon ll-flex ll-h-12 ll-w-12 ll-shrink-0 ll-touch-none ll-items-center ll-justify-center ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2"
        >
          <AppIcon
            name="drag-indicator"
            size={20}
            aria-hidden="true"
            focusable="false"
          />
        </button>
      ) : null}
      <div className="ll-relative ll-flex ll-h-12 ll-w-12 ll-shrink-0 ll-items-center ll-justify-center">
        <input
          type="checkbox"
          checked={task.completed}
          disabled={!canEdit}
          onChange={() => onToggle(task)}
          aria-labelledby={taskTextId}
          className="ll-peer ll-absolute ll-inset-0 ll-z-10 ll-h-full ll-w-full ll-cursor-pointer ll-opacity-0"
        />
        <div
          data-completed={task.completed ? "true" : "false"}
          className="ll-check-circle ll-task-completion-circle ll-flex ll-h-5 ll-w-5 ll-items-center ll-justify-center ll-rounded-full ll-border ll-bg-transparent ll-peer-checked-bg-gray-300 ll-peer-focus-visible-ring-2 ll-peer-focus-visible-ring-gray-600 ll-dark-peer-checked-bg-gray-700"
        />
      </div>
      <div
        className={clsx(
          "ll-task-row-content ll-flex ll-min-w-0 ll-flex-1 ll-flex-col",
          !dateDisplayValue && "ll-justify-center",
          dateDisplayValue && "ll-task-row-content-with-date",
        )}
      >
        {dateDisplayValue ? (
          <div className="ll-task-row-date ll-muted-text ll-flex ll-h-5 ll-items-center ll-text-start ll-text-xs ll-leading-none">
            {dateDisplayValue}
          </div>
        ) : null}
        {isEditing && canEdit ? (
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
              "ll-h-12 ll-min-w-0 ll-w-full ll-bg-transparent ll-p-0 ll-leading-7 ll-focus-outline-none",
              task.completed
                ? "ll-font-medium ll-text-gray-600 ll-line-through ll-dark-text-gray-300"
                : "ll-text-gray-900 ll-dark-text-gray-50",
              !task.completed &&
                (task.pinned ? "ll-font-bold" : "ll-font-medium"),
            )}
          />
        ) : (
          <button
            id={taskTextId}
            type="button"
            onClick={canEdit ? () => onEditStart(task) : undefined}
            className={
              task.completed
                ? clsx(
                    "ll-task-row-text ll-task-text-wrap ll-flex ll-min-h-12 ll-min-w-0 ll-w-full ll-items-center ll-border-0 ll-bg-transparent ll-p-0 ll-text-start ll-font-medium ll-leading-7 ll-text-gray-600 ll-line-through ll-underline-offset-4 ll-dark-text-gray-300",
                    canEdit &&
                      "ll-cursor-pointer ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300",
                  )
                : clsx(
                    "ll-task-row-text ll-task-text-wrap ll-flex ll-min-h-12 ll-min-w-0 ll-w-full ll-items-center ll-border-0 ll-bg-transparent ll-p-0 ll-text-start ll-leading-7 ll-text-gray-900 ll-dark-text-gray-50",
                    canEdit &&
                      "ll-cursor-pointer ll-underline-offset-4 ll-hover-underline ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300",
                    task.pinned ? "ll-font-bold" : "ll-font-medium",
                  )
            }
          >
            {task.text}
          </button>
        )}
      </div>
      {canEdit ? (
        <button
          ref={actionButtonRef}
          type="button"
          aria-label={taskActionLabel}
          title={taskActionLabel}
          onClick={() => onOpenTaskActions?.(task, actionButtonRef.current)}
          className="ll-pressable ll-icon-btn ll-muted-icon ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300"
        >
          <AppIcon
            name={task.pinned ? "push-pin" : "calendar-today"}
            size={20}
            aria-hidden="true"
            focusable="false"
          />
        </button>
      ) : null}
    </div>
  );
}

const TaskItem = memo(TaskItemComponent);

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
  const [saving, setSaving] = useState(false);
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
          className={ICON_BUTTON_CLASS}
          aria-label={t("taskList.editDetails")}
          title={t("taskList.editDetails")}
        >
          <AppIcon name="edit" size={22} aria-hidden="true" focusable="false" />
          <span className="ll-sr-only">{t("taskList.editDetails")}</span>
        </button>
      </DialogTrigger>
      <DialogContent title={t("taskList.editTitle")}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || saving || deleting) return;
            setSaving(true);
            void updateTaskList(taskList.id, {
              ...(name.trim() !== taskList.name ? { name: name.trim() } : {}),
              ...(background !== taskList.background ? { background } : {}),
            })
              .then(() => setOpen(false))
              .catch((updateError) =>
                setError(resolveErrorMessage(updateError, t, "common.error")),
              )
              .finally(() => setSaving(false));
          }}
        >
          <div className="ll-mt-5 ll-flex ll-flex-col ll-gap-5">
            {error ? <Alert variant="error">{error}</Alert> : null}
            <label className="ll-flex ll-flex-col ll-gap-2">
              <span className="ll-field-label">{t("app.taskListName")}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("app.taskListNamePlaceholder")}
                className="ll-field"
              />
            </label>
            <div className="ll-flex ll-flex-col ll-gap-1">
              <span className="ll-field-label">
                {t("taskList.selectColor")}
              </span>
              <ColorPicker
                colors={COLORS}
                selectedColor={background ?? null}
                onSelect={setBackground}
                ariaLabelPrefix={t("taskList.selectColor")}
              />
            </div>
          </div>
          <DialogFooter
            start={
              canDelete ? (
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
                  className={BUTTON_DANGER_CLASS}
                >
                  {deleting ? t("common.deleting") : t("taskList.deleteList")}
                </button>
              ) : null
            }
          >
            <DialogClose asChild>
              <button type="button" className={BUTTON_SECONDARY_CLASS}>
                {t("common.cancel")}
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={!name.trim() || saving || deleting}
              className={BUTTON_PRIMARY_CLASS}
            >
              {t("taskList.save")}
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
          className={ICON_BUTTON_CLASS}
          aria-label={t("taskList.share")}
          title={t("taskList.share")}
        >
          <AppIcon
            name="share"
            size={22}
            aria-hidden="true"
            focusable="false"
          />
          <span className="ll-sr-only">{t("taskList.share")}</span>
        </button>
      </DialogTrigger>
      <DialogContent
        title={t("taskList.shareTitle")}
        description={t("taskList.shareDescription")}
      >
        {error ? (
          <Alert variant="error" className="ll-mt-4">
            {error}
          </Alert>
        ) : null}
        {shareCode ? (
          <label className="ll-mt-5 ll-flex ll-flex-col ll-gap-2">
            <span className="ll-field-label">{t("taskList.shareCode")}</span>
            <div className="ll-flex ll-gap-2">
              <input
                type="text"
                value={shareCode}
                readOnly
                className="ll-field ll-font-mono ll-min-w-0"
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
                className={BUTTON_SECONDARY_CLASS}
              >
                {copySuccess ? t("common.copied") : t("common.copy")}
              </button>
            </div>
          </label>
        ) : null}
        <DialogFooter
          start={
            shareCode ? (
              <button
                type="button"
                onClick={() => {
                  setRemoving(true);
                  setError(null);
                  void removeShareCode(taskList.id)
                    .then(() => {
                      setShareCode(null);
                      logAppEvent("share_code_remove");
                    })
                    .catch((removeError) =>
                      setError(
                        resolveErrorMessage(removeError, t, "common.error"),
                      ),
                    )
                    .finally(() => setRemoving(false));
                }}
                disabled={removing}
                className={BUTTON_DANGER_CLASS}
              >
                {removing ? t("common.deleting") : t("taskList.removeShare")}
              </button>
            ) : null
          }
        >
          <DialogClose asChild>
            <button type="button" className={BUTTON_SECONDARY_CLASS}>
              {t("common.close")}
            </button>
          </DialogClose>
          {shareCode ? null : (
            <button
              type="button"
              onClick={() => {
                setGenerating(true);
                setError(null);
                void generateShareCode(taskList.id)
                  .then((code) => {
                    setShareCode(code);
                    logAppEvent("share_code_generate");
                  })
                  .catch((generateError) =>
                    setError(
                      resolveErrorMessage(generateError, t, "common.error"),
                    ),
                  )
                  .finally(() => setGenerating(false));
              }}
              disabled={generating}
              className={BUTTON_PRIMARY_CLASS}
            >
              {generating ? t("common.loading") : t("taskList.generateShare")}
            </button>
          )}
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
  onSortingChange,
  onDragInteractionChange,
  onDeleted,
  canDeleteTaskList = true,
  canManageShareCode = true,
  canEditTasks = true,
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
  onSortingChange?: (sorting: boolean) => void;
  onDragInteractionChange?: (active: boolean) => void;
  onDeleted?: () => void;
  canDeleteTaskList?: boolean;
  canManageShareCode?: boolean;
  canEditTasks?: boolean;
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
  const baseTasks =
    pendingTasks ?? getDisplayOrderedTaskArray(taskList.tasks, autoSort);
  const taskListTasksRef = useRef(taskList.tasks);
  taskListTasksRef.current = taskList.tasks;
  const { items: tasks, reorder: reorderTask } = useOptimisticReorder(
    baseTasks,
    (_draggedId, _targetId, nextItems) =>
      updateTasksOrder(
        taskList.id,
        nextItems.map((task) => task.id),
        autoSort,
      ),
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
  const [historyHighlightIndex, setHistoryHighlightIndex] = useState(-1);
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
      const normalizedTasks = nextTasks
        .filter(hasTaskContent)
        .map((task, index) => ({
          id: task.id,
          text: task.text,
          completed: task.completed,
          date: task.date,
          order: index + 1,
          pinned: task.pinned,
        }));
      const sortedTasks = autoSort
        ? getAutoSortedTasks(normalizedTasks)
        : normalizedTasks;
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
  }, [normalizePendingTasks, pendingTasks, taskList.id, taskList.tasks]);

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
    if (historyOptions.length === 0) {
      setHistoryOpen(false);
      setHistoryHighlightIndex(-1);
      return;
    }
    setHistoryHighlightIndex((current) =>
      Math.min(current, historyOptions.length - 1),
    );
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
    if (!hasTaskContent(optimisticTask)) return;
    setHistoryOpen(false);
    setHistoryHighlightIndex(-1);
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
        logAppEvent("task_add", { has_date: Boolean(parsed.date) });
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
        logAppEvent("task_update", { fields: field });
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
        "ll-min-h-full",
        isActive ? "ll-pointer-events-auto" : "ll-pointer-events-none",
      )}
      onClickCapture={handleTaskListClickCapture}
      style={{
        backgroundColor: taskList.background
          ? resolveTaskListBackground(taskList.background)
          : undefined,
      }}
    >
      <div className="ll-min-h-full ll-px-4">
        <div className="ll-flex ll-flex-col ll-gap-4">
          <div className="ll-flex ll-flex-col ll-gap-4">
            <div className="ll-flex ll-flex-col ll-gap-4">
              <div className="ll-flex ll-min-h-12 ll-items-center ll-justify-between ll-gap-3">
                <h2 className="ll-font-display ll-task-text-wrap ll-m-0 ll-min-w-0 ll-flex-1 ll-text-xl ll-font-semibold">
                  {taskList.name}
                </h2>
                <div className="ll-task-card-actions">
                  {canEditTasks ? (
                    <EditTaskListDialog
                      taskList={taskList}
                      isActive={isActive}
                      onActivate={onActivate}
                      onDeleted={onDeleted}
                      canDelete={canDeleteTaskList}
                    />
                  ) : null}
                  {canManageShareCode ? (
                    <ShareTaskListDialog
                      taskList={taskList}
                      isActive={isActive}
                      onActivate={onActivate}
                    />
                  ) : null}
                </div>
              </div>
              {taskError ? <Alert variant="error">{taskError}</Alert> : null}
            </div>
            {canEditTasks ? (
              <>
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
                      value={historyOptions[historyHighlightIndex] ?? ""}
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
                          setHistoryHighlightIndex(-1);
                          setHistoryOpen(true);
                        }}
                        onFocus={() => {
                          setHistoryHighlightIndex(-1);
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
                          if (
                            event.key === "ArrowDown" &&
                            historyOpen &&
                            historyOptions.length > 0
                          ) {
                            event.preventDefault();
                            setHistoryHighlightIndex((current) =>
                              Math.min(current + 1, historyOptions.length - 1),
                            );
                            return;
                          }
                          if (
                            event.key === "ArrowUp" &&
                            historyOpen &&
                            historyOptions.length > 0
                          ) {
                            event.preventDefault();
                            setHistoryHighlightIndex((current) =>
                              Math.max(current - 1, -1),
                            );
                            return;
                          }
                          if (
                            event.key === "Enter" &&
                            newTaskText.trim() !== ""
                          ) {
                            event.preventDefault();
                            const selectedHistoryText =
                              historyOptions[historyHighlightIndex];
                            if (selectedHistoryText) {
                              const previousText = newTaskText;
                              addNewTask(selectedHistoryText, previousText);
                              return;
                            }
                            event.currentTarget.form?.requestSubmit();
                          }
                          if (event.key === "Escape") {
                            setHistoryOpen(false);
                            setHistoryHighlightIndex(-1);
                          }
                        }}
                        placeholder={t("pages.tasklist.addTaskPlaceholder")}
                        className="ll-add-task-input ll-w-full ll-rounded-14px ll-border ll-border-gray-300 ll-bg-white-92 ll-px-3x5 ll-py-2x5 ll-text-gray-900 ll-shadow-sm ll-focus-border-gray-600 ll-focus-outline-none ll-focus-ring-2 ll-focus-ring-gray-300 ll-disabled-cursor-not-allowed ll-disabled-opacity-60 ll-dark-border-gray-700 ll-dark-bg-gray-900-92 ll-dark-text-gray-50 ll-dark-focus-border-gray-300 ll-dark-focus-ring-gray-700"
                      />
                      {historyOpen && historyOptions.length > 0 ? (
                        <CommandPrimitive.List
                          id={historyListId}
                          className="ll-anim-pop ll-absolute ll-left-0 ll-right-0 ll-top-full ll-z-50 ll-mt-1 ll-rounded-xl ll-border ll-border-gray-300 ll-bg-white-b ll-p-1 ll-shadow-lg ll-dark-border-gray-700 ll-dark-bg-gray-900b"
                        >
                          {historyOptions.map((text, index) => (
                            <CommandPrimitive.Item
                              key={text}
                              value={text}
                              aria-selected={index === historyHighlightIndex}
                              data-selected={
                                index === historyHighlightIndex ? "" : undefined
                              }
                              onMouseDown={(
                                event: MouseEvent<HTMLDivElement>,
                              ) => event.preventDefault()}
                              onSelect={() => {
                                const previousText = newTaskText;
                                addNewTask(text, previousText);
                              }}
                              className={clsx(
                                "ll-cursor-pointer ll-rounded-lg ll-px-3 ll-py-2 ll-text-sm ll-outline-none",
                                index === historyHighlightIndex &&
                                  "ll-bg-gray-50 ll-dark-bg-gray-950",
                              )}
                            >
                              {text}
                            </CommandPrimitive.Item>
                          ))}
                        </CommandPrimitive.List>
                      ) : null}
                    </CommandPrimitive>
                    <button
                      type="submit"
                      onMouseDown={(event) => event.preventDefault()}
                      disabled={newTaskText.trim() === ""}
                      aria-label={t("common.add")}
                      title={t("common.add")}
                      className={clsx(
                        "ll-add-task-submit ll-pressable ll-icon-btn ll-text-gray-900 ll-dark-text-gray-50",
                        newTaskText.trim() === ""
                          ? "ll-pointer-events-none ll-opacity-0"
                          : "ll-opacity-100",
                      )}
                    >
                      <AppIcon
                        name="send"
                        size={20}
                        aria-hidden="true"
                        focusable="false"
                      />
                    </button>
                  </div>
                </form>
                {addTaskError ? (
                  <Alert variant="error">{addTaskError}</Alert>
                ) : null}
                <div className="ll-task-toolbar ll-flex ll-items-center ll-justify-between ll-gap-2">
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
                        onSuccess: () => logAppEvent("task_sort"),
                        onError: (error) => {
                          setTaskError(
                            resolveErrorMessage(error, t, "common.error"),
                          );
                        },
                      });
                    }}
                    className="ll-pressable ll-task-toolbar-button"
                  >
                    <span className="ll-task-toolbar-icon">
                      <AppIcon
                        name="sort"
                        size={20}
                        aria-hidden="true"
                        focusable="false"
                      />
                    </span>
                    {t("pages.tasklist.sort")}
                  </button>
                  <button
                    type="button"
                    disabled={
                      deleteCompletedPending || completedTaskCount === 0
                    }
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
                        await new Promise((resolve) =>
                          setTimeout(resolve, 120),
                        );
                      }
                      await runTaskMutationRef
                        .current({
                          buildNextTasks: (currentTasks) =>
                            currentTasks.filter((task) => !task.completed),
                          commit: () =>
                            deleteCompletedTasks(
                              taskList.id,
                              resolvedTaskSettings,
                            ),
                          onSuccess: () =>
                            logAppEvent("task_delete_completed", {
                              count: completedTaskCount,
                            }),
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
                    className="ll-pressable ll-task-toolbar-button"
                  >
                    {deleteCompletedPending
                      ? t("common.deleting")
                      : t("pages.tasklist.deleteCompleted")}
                    <span className="ll-task-toolbar-icon">
                      <AppIcon
                        name="delete"
                        size={20}
                        aria-hidden="true"
                        focusable="false"
                      />
                    </span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <DragDropProvider
            sensors={SORTABLE_SENSORS}
            modifiers={SORTABLE_MODIFIERS}
            plugins={(defaults) => [...defaults, taskDndAccessibility]}
            onDragStart={(event: DragStartEvent) => {
              if (typeof event.operation.source?.id === "string") {
                onSortingChange?.(true);
              }
            }}
            onDragEnd={async (event: DragEndEvent) => {
              onSortingChange?.(false);
              if (event.canceled) return;
              const { source } = event.operation;
              if (!isSortable(source) || source.initialIndex === source.index) {
                return;
              }
              const draggedTaskId =
                typeof source.id === "string" ? source.id : null;
              const targetTaskId = tasks[source.index]?.id ?? null;
              if (!draggedTaskId || !targetTaskId) return;
              const draggedTask = tasks.find(
                (task) => task.id === draggedTaskId,
              );
              const targetTask = tasks.find((task) => task.id === targetTaskId);
              if (
                !draggedTask ||
                !targetTask ||
                !canReorderTasks(draggedTask, targetTask, autoSort)
              ) {
                return;
              }
              setTaskError(null);
              try {
                await reorderTask(draggedTaskId, targetTaskId);
                logAppEvent("task_reorder");
              } catch (error) {
                setTaskError(resolveErrorMessage(error, t, "common.error"));
              }
            }}
          >
            {tasks.length === 0 ? (
              <p className="ll-text-gray-600 ll-dark-text-gray-300">
                {t("pages.tasklist.noTasks")}
              </p>
            ) : (
              <div className="ll-flex ll-flex-col">
                {tasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    canEdit={canEditTasks}
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
                          logAppEvent("task_update", {
                            fields: fields.join(","),
                          });
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
                          logAppEvent("task_update", { fields: "completed" }),
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
          </DragDropProvider>
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
              <TaskSheetHeader
                title={
                  activeTaskActionTask.text.trim() ||
                  t("pages.tasklist.setDate")
                }
              />
              <div className="ll-flex ll-items-center ll-justify-between ll-gap-2">
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
                  className={clsx(BUTTON_GHOST_CLASS, "ll-sheet-start-action")}
                >
                  {t("pages.tasklist.clearDate")}
                </button>
                <PinToggleButton
                  pinned={activeTaskActionTask.pinned}
                  onToggle={() => {
                    updateTaskFromAction(
                      activeTaskActionTask,
                      { pinned: !activeTaskActionTask.pinned },
                      "pinned",
                    );
                  }}
                />
              </div>
              <div className="ll-sheet-calendar">
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
  historyDepth = currentState &&
  typeof currentState === "object" &&
  typeof (currentState as Record<string, unknown>).lightlistAppHistoryDepth ===
    "number"
    ? (currentState as Record<string, unknown>).lightlistAppHistoryDepth
    : 0,
): Record<string, unknown> => ({
  ...(currentState && typeof currentState === "object"
    ? (currentState as Record<string, unknown>)
    : {}),
  lightlistMobileStackInitialized: true,
  lightlistAppView: route.view,
  lightlistAppHistoryDepth: historyDepth,
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

const getAppHistoryDepth = (state: unknown): number => {
  if (!isInitializedAppHistoryState(state) || typeof state !== "object") {
    return 0;
  }
  const depth = (state as Record<string, unknown>).lightlistAppHistoryDepth;
  return typeof depth === "number" && Number.isInteger(depth) && depth >= 0
    ? depth
    : 0;
};

const getCurrentHistoryState = (): Record<string, unknown> | null =>
  window.history.state && typeof window.history.state === "object"
    ? (window.history.state as Record<string, unknown>)
    : null;

const replaceHistoryForRoute = (route: KnownAppHashRoute): void => {
  window.history.replaceState(
    buildAppHistoryState(route, null, null, 0),
    "",
    toAppUrl(route),
  );
};

const pushHistoryForRoute = (route: KnownAppHashRoute): void => {
  window.history.pushState(
    buildAppHistoryState(
      route,
      getCurrentHistoryState(),
      null,
      getAppHistoryDepth(window.history.state) + 1,
    ),
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
  index: number;
  onSelect: (taskListId: string) => void;
  dragHintLabel: string;
  taskCountLabel: string;
  isActive: boolean;
};

function SortableTaskListItem({
  taskList,
  index,
  onSelect,
  dragHintLabel,
  taskCountLabel,
  isActive,
}: SortableTaskListItemProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: taskList.id,
    index,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  });

  return (
    <div
      ref={ref}
      style={{
        scale: isDragging ? "1.03" : undefined,
        transition: "opacity 180ms ease",
        opacity: isDragging ? 0.5 : 1,
      }}
      data-active={isActive ? "true" : "false"}
      className="ll-sidebar-item ll-reveal-group"
    >
      <button
        type="button"
        onClick={() => onSelect(taskList.id)}
        aria-current={isActive ? "page" : undefined}
        className="ll-sidebar-item-main"
      >
        <span className="ll-sidebar-icon-slot">
          <span
            aria-hidden="true"
            className="ll-list-dot"
            data-empty={taskList.background ? undefined : "true"}
            style={
              taskList.background
                ? { backgroundColor: taskList.background }
                : undefined
            }
          />
        </span>
        <span className="ll-flex ll-min-w-0 ll-flex-1 ll-flex-col">
          <span
            className={clsx(
              "ll-truncate ll-text-sm",
              isActive ? "ll-font-semibold" : "ll-font-medium",
            )}
          >
            {taskList.name}
          </span>
          <span className="ll-muted-text ll-truncate ll-text-xs">
            {taskCountLabel}
          </span>
        </span>
      </button>
      <button
        ref={handleRef}
        title={dragHintLabel}
        aria-label={dragHintLabel}
        type="button"
        className="ll-sidebar-item-handle ll-reveal-on-hover ll-muted-icon"
      >
        <AppIcon
          name="drag-indicator"
          size={20}
          aria-hidden="true"
          focusable="false"
        />
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
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const dateDisplayValue = useMemo(() => {
    if (!task.dateValue) return null;
    return getTaskDateFormatter(language).format(task.dateValue);
  }, [language, task.dateValue]);

  return (
    <div
      ref={itemRef}
      data-highlighted={isHighlighted ? "true" : undefined}
      className="ll-calendar-task-row"
    >
      <div className="ll-calendar-task-meta">
        <span className="ll-muted-text ll-flex ll-min-w-0 ll-flex-1 ll-items-center ll-gap-1">
          {task.dateValue && dateDisplayValue ? (
            <button
              type="button"
              onClick={() => {
                if (task.dateValue) onSelectDate(task.dateValue);
              }}
              className="ll-rounded-md ll-text-xs ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-300 ll-dark-focus-visible-outline-gray-300"
            >
              {dateDisplayValue}
            </button>
          ) : null}
          {task.task.pinned ? (
            <AppIcon
              name="push-pin"
              size={14}
              aria-hidden="true"
              focusable="false"
            />
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => onOpenTaskList(task.taskListId)}
          className="ll-calendar-task-list-meta ll-inline-flex ll-min-w-0 ll-items-center ll-justify-end ll-gap-1x5 ll-rounded-md ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300"
        >
          <span
            aria-hidden="true"
            className="ll-list-dot"
            data-empty={task.taskListBackground ? undefined : "true"}
            style={
              task.taskListBackground
                ? { backgroundColor: task.taskListBackground }
                : undefined
            }
          />
          <span className="ll-min-w-0 ll-truncate ll-text-xs ll-font-medium ll-text-gray-900 ll-dark-text-gray-50">
            {task.taskListName}
          </span>
        </button>
      </div>
      <div className="ll-calendar-task-content">
        <div className="ll-calendar-task-check ll-relative ll-flex ll-h-12 ll-w-12 ll-justify-center">
          <input
            type="checkbox"
            checked={task.task.completed}
            onChange={onToggleComplete}
            aria-label={`${t("pages.tasklist.markComplete")}: ${task.task.text}`}
            className="ll-peer ll-absolute ll-inset-0 ll-z-10 ll-h-full ll-w-full ll-cursor-pointer ll-opacity-0"
          />
          <div
            data-completed={task.task.completed ? "true" : "false"}
            className="ll-check-circle ll-task-completion-circle ll-flex ll-h-5 ll-w-5 ll-items-center ll-justify-center ll-rounded-full ll-border ll-bg-transparent ll-peer-checked-bg-gray-300 ll-peer-focus-visible-ring-2 ll-peer-focus-visible-ring-gray-600 ll-dark-peer-checked-bg-gray-700"
          />
        </div>
        {task.dateValue ? (
          <button
            type="button"
            onClick={() => {
              const dateValue = task.dateValue;
              if (dateValue) onSelectDate(dateValue);
            }}
            className="ll-calendar-task-text ll-task-text-wrap ll-flex ll-min-h-12 ll-rounded-md ll-text-start ll-font-medium ll-leading-6 ll-text-gray-900 ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-text-gray-50 ll-dark-focus-visible-outline-gray-300"
          >
            {task.task.text}
          </button>
        ) : (
          <div className="ll-calendar-task-text ll-task-text-wrap ll-flex ll-min-h-12 ll-rounded-md ll-text-start ll-font-medium ll-leading-6 ll-text-gray-900 ll-dark-text-gray-50">
            {task.task.text}
          </div>
        )}
        <button
          type="button"
          aria-label={t("a11y.editTask")}
          title={t("a11y.editTask")}
          onClick={onOpenActions}
          className="ll-calendar-task-edit ll-pressable ll-muted-icon ll-flex ll-h-12 ll-w-12 ll-justify-center ll-rounded-lg ll-focus-visible-outline-1 ll-focus-visible-outline-2 ll-focus-visible-outline-offset-2 ll-focus-visible-outline-gray-600 ll-dark-focus-visible-outline-gray-300"
        >
          <AppIcon name="edit" size={20} aria-hidden="true" focusable="false" />
        </button>
      </div>
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

type TaskSheetSubmitValues = {
  taskListId: string;
  text: string;
  pinned: boolean;
  date: string;
};

function TaskSheetHeader({
  title,
  closeDisabled = false,
}: {
  title: string;
  closeDisabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="ll-flex ll-min-h-11 ll-items-center ll-justify-between ll-gap-3">
      <span className="ll-min-w-0 ll-truncate ll-font-semibold">{title}</span>
      <DialogPrimitive.Close asChild>
        <button
          type="button"
          disabled={closeDisabled}
          className={clsx(BUTTON_GHOST_CLASS, "ll-sheet-end-action")}
        >
          {t("common.close")}
        </button>
      </DialogPrimitive.Close>
    </div>
  );
}

function PinToggleButton({
  pinned,
  onToggle,
  disabled = false,
}: {
  pinned: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={pinned}
      disabled={disabled}
      onClick={onToggle}
      className="ll-pressable ll-btn ll-pin-toggle"
    >
      <AppIcon name="push-pin" size={18} aria-hidden="true" focusable="false" />
      {pinned ? t("pages.tasklist.unpinTask") : t("pages.tasklist.pinTask")}
    </button>
  );
}

function TaskSheetContent({
  mode,
  taskLists,
  initialTaskListId,
  initialText,
  initialPinned,
  initialDate,
  submitting,
  error,
  onSubmit,
}: {
  mode: "add" | "edit";
  taskLists: TaskList[];
  initialTaskListId: string;
  initialText: string;
  initialPinned: boolean;
  initialDate: Date | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: TaskSheetSubmitValues) => void;
}) {
  const { t } = useTranslation();
  const [taskListId, setTaskListId] = useState(initialTaskListId);
  const [text, setText] = useState(initialText);
  const [pinned, setPinned] = useState(initialPinned);
  const [date, setDate] = useState<Date | null>(initialDate);
  const title = mode === "add" ? t("a11y.addTask") : t("a11y.editTask");

  return (
    <ActionSheetContent title={title}>
      <form
        className="ll-flex ll-min-h-0 ll-flex-1 ll-flex-col ll-gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const textToSubmit = text.trim();
          if (
            (mode === "add" && !textToSubmit && !pinned && !date) ||
            !taskListId ||
            submitting
          ) {
            return;
          }
          onSubmit({
            taskListId,
            text: textToSubmit,
            pinned,
            date: date ? formatDate(date) : "",
          });
        }}
      >
        <TaskSheetHeader title={title} closeDisabled={submitting} />
        {error ? <Alert variant="error">{error}</Alert> : null}
        <label className="ll-select-wrap">
          <span className="ll-sr-only">{t("app.drawerTitle")}</span>
          <select
            value={taskListId}
            onChange={(event) => setTaskListId(event.target.value)}
            className="ll-field"
          >
            {taskLists.map((taskList) => (
              <option key={taskList.id} value={taskList.id}>
                {taskList.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ll-flex ll-flex-col">
          <span className="ll-sr-only">
            {t("pages.tasklist.addTaskPlaceholder")}
          </span>
          <input
            autoFocus={mode === "add"}
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("pages.tasklist.addTaskPlaceholder")}
            className="ll-field"
          />
        </label>
        <div className="ll-flex ll-items-center ll-justify-between ll-gap-2">
          <button
            type="button"
            disabled={!date || submitting}
            onClick={() => setDate(null)}
            className={clsx(BUTTON_GHOST_CLASS, "ll-sheet-start-action")}
          >
            {t("pages.tasklist.clearDate")}
          </button>
          <PinToggleButton
            pinned={pinned}
            disabled={submitting}
            onToggle={() => setPinned((current) => !current)}
          />
        </div>
        <div className="ll-sheet-calendar">
          <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={(next) => setDate(next ?? null)}
          />
        </div>
        <button
          type="submit"
          disabled={
            (mode === "add" && !text.trim() && !pinned && !date) ||
            !taskListId ||
            submitting
          }
          className={clsx(BUTTON_PRIMARY_CLASS, "ll-w-full")}
        >
          {submitting
            ? t("common.loading")
            : mode === "add"
              ? t("a11y.addTask")
              : t("taskList.save")}
        </button>
      </form>
    </ActionSheetContent>
  );
}

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
  const [taskSheet, setTaskSheet] = useState<
    { mode: "add"; date: Date } | { mode: "edit"; task: DatedTask } | null
  >(null);
  const [taskSheetSaving, setTaskSheetSaving] = useState(false);
  const [taskSheetError, setTaskSheetError] = useState<string | null>(null);
  const [optimisticDatedTasks, setOptimisticDatedTasks] = useState<DatedTask[]>(
    [],
  );
  const [optimisticDatedTaskOverrides, setOptimisticDatedTaskOverrides] =
    useState<Record<string, OptimisticDatedTaskOverride>>({});
  const [updateError, setUpdateError] = useState<string | null>(null);
  const datedTaskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const optimisticDatedTaskRevisionRef = useRef(0);

  const nextOptimisticDatedTaskRevision = () => {
    optimisticDatedTaskRevisionRef.current += 1;
    return optimisticDatedTaskRevisionRef.current;
  };

  const clearOptimisticDatedTaskOverrides = (
    taskIds: string[],
    revision: number,
  ) => {
    setOptimisticDatedTaskOverrides((current) => {
      const next = { ...current };
      taskIds.forEach((taskId) => {
        if (next[taskId]?.revision === revision) {
          delete next[taskId];
        }
      });
      return next;
    });
  };

  const completeTask = (task: DatedTask) => {
    const taskId = getDatedTaskId(task);
    const revision = nextOptimisticDatedTaskRevision();
    logAppEvent("task_update", { fields: "completed" });
    setUpdateError(null);
    setOptimisticDatedTaskOverrides((current) => ({
      ...current,
      [taskId]: { revision, task: null },
    }));
    void updateTask(
      task.taskListId,
      task.task.id,
      { completed: true },
      taskSettings,
    )
      .catch((error) =>
        setUpdateError(resolveErrorMessage(error, t, "common.error")),
      )
      .finally(() => {
        clearOptimisticDatedTaskOverrides([taskId], revision);
      });
  };

  const handleTaskSheetSubmit = (values: TaskSheetSubmitValues) => {
    if (!taskSheet || taskSheetSaving) return;
    setTaskSheetSaving(true);
    setTaskSheetError(null);
    if (taskSheet.mode === "add") {
      const targetTaskList = taskLists.find(
        (taskList) => taskList.id === values.taskListId,
      );
      if (!targetTaskList) {
        setTaskSheetSaving(false);
        return;
      }
      const parsed = resolveTaskInput(values.text, taskSettings.language);
      if (!parsed.text.trim() && !values.date && !values.pinned) {
        setTaskSheetSaving(false);
        return;
      }
      const taskId = crypto.randomUUID();
      const dateValue = values.date ? createDateFromKey(values.date) : null;
      const optimisticTask: DatedTask = {
        taskListId: targetTaskList.id,
        taskListName: targetTaskList.name,
        taskListBackground: targetTaskList.background,
        task: {
          id: taskId,
          text: parsed.text,
          completed: false,
          date: dateValue ? values.date : "",
          pinned: values.pinned,
        },
        dateValue,
        dateKey: dateValue ? values.date : "",
        taskListIndex: taskLists.findIndex(
          (taskList) => taskList.id === targetTaskList.id,
        ),
        taskIndex:
          taskSettings.taskInsertPosition === "top"
            ? -1
            : targetTaskList.tasks.length,
      };
      setOptimisticDatedTasks((current) => [...current, optimisticTask]);
      void addTask(targetTaskList.id, values.text, taskSettings, {
        taskId,
        date: values.date,
        pinned: values.pinned,
      })
        .then(() => {
          logAppEvent("task_add", { has_date: Boolean(values.date) });
          setTaskSheet(null);
        })
        .catch((error) => {
          setOptimisticDatedTasks((current) =>
            current.filter((task) => task.task.id !== taskId),
          );
          setTaskSheetError(resolveErrorMessage(error, t, "common.error"));
        })
        .finally(() => setTaskSheetSaving(false));
      return;
    }
    const editedTask = taskSheet.task;
    const isMove = values.taskListId !== editedTask.taskListId;
    const targetTaskList = taskLists.find(
      (taskList) => taskList.id === values.taskListId,
    );
    const parsed = resolveTaskInput(
      values.text,
      taskSettings.language,
      editedTask.task,
    );
    const nextDateValue = values.date ? createDateFromKey(values.date) : null;
    const nextTask: Task = {
      ...editedTask.task,
      text: values.text.trim() === "" ? "" : parsed.text,
      date: nextDateValue ? values.date : "",
      pinned: values.pinned,
    };
    const shouldKeepTask = hasTaskContent(nextTask);
    const sourceTaskId = getDatedTaskId(editedTask);
    const targetTaskId =
      targetTaskList && isMove
        ? `${targetTaskList.id}:${editedTask.task.id}`
        : null;
    const revision = nextOptimisticDatedTaskRevision();
    const optimisticOverrides: Record<string, OptimisticDatedTaskOverride> = {
      [sourceTaskId]: {
        revision,
        task:
          isMove || !shouldKeepTask
            ? null
            : {
                ...editedTask,
                task: nextTask,
                dateValue: nextDateValue,
                dateKey: nextDateValue ? values.date : "",
              },
      },
    };
    if (targetTaskList && isMove && shouldKeepTask && targetTaskId) {
      optimisticOverrides[targetTaskId] = {
        revision,
        task: {
          taskListId: targetTaskList.id,
          taskListName: targetTaskList.name,
          taskListBackground: targetTaskList.background,
          task: nextTask,
          dateValue: nextDateValue,
          dateKey: nextDateValue ? values.date : "",
          taskListIndex: taskLists.findIndex(
            (taskList) => taskList.id === targetTaskList.id,
          ),
          taskIndex:
            taskSettings.taskInsertPosition === "top"
              ? -1
              : targetTaskList.tasks.length,
        },
      };
    }
    const optimisticOverrideIds = Object.keys(optimisticOverrides);
    setOptimisticDatedTaskOverrides((current) => ({
      ...current,
      ...optimisticOverrides,
    }));
    logAppEvent("task_update", {
      fields: isMove ? "text,date,pinned,taskList" : "text,date,pinned",
    });
    const taskWrite = isMove
      ? moveTask(
          editedTask.taskListId,
          values.taskListId,
          editedTask.task.id,
          {
            text: values.text,
            date: values.date,
            pinned: values.pinned,
          },
          taskSettings,
        )
      : updateTask(
          editedTask.taskListId,
          editedTask.task.id,
          {
            text: values.text,
            date: values.date,
            pinned: values.pinned,
          },
          taskSettings,
        );
    void taskWrite
      .then(() => {
        clearOptimisticDatedTaskOverrides(optimisticOverrideIds, revision);
        setTaskSheet(null);
      })
      .catch((error) => {
        clearOptimisticDatedTaskOverrides(optimisticOverrideIds, revision);
        setTaskSheetError(resolveErrorMessage(error, t, "common.error"));
      })
      .finally(() => setTaskSheetSaving(false));
  };

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
      const orderedTasks = getDisplayOrderedTaskArray(
        taskList.tasks,
        taskSettings.autoSort,
      );
      for (const [taskIndex, task] of orderedTasks.entries()) {
        if (task.completed) continue;
        const parsedDate = parseTaskDate(task.date);
        flattened.push({
          taskListId: taskList.id,
          taskListName: taskList.name,
          taskListBackground: taskList.background,
          task,
          dateValue: parsedDate ?? null,
          dateKey: parsedDate ? formatDate(parsedDate) : "",
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
    for (const [taskId, { task: override }] of Object.entries(
      optimisticDatedTaskOverrides,
    )) {
      const existingIndex = flattened.findIndex(
        (task) => getDatedTaskId(task) === taskId,
      );
      if (existingIndex >= 0) {
        flattened.splice(existingIndex, 1);
      }
      if (override) {
        flattened.push(override);
      }
    }
    flattened.sort((left, right) => {
      const byPinned =
        Number(right.task.pinned ?? false) - Number(left.task.pinned ?? false);
      if (byPinned !== 0) return byPinned;
      const leftDateKey = left.dateKey === "" ? "9999-12-31" : left.dateKey;
      const rightDateKey = right.dateKey === "" ? "9999-12-31" : right.dateKey;
      if (leftDateKey !== rightDateKey) {
        return leftDateKey < rightDateKey ? -1 : 1;
      }
      const byTaskList = left.taskListIndex - right.taskListIndex;
      if (byTaskList !== 0) return byTaskList;
      return left.taskIndex - right.taskIndex;
    });
    return flattened;
  }, [
    optimisticDatedTaskOverrides,
    optimisticDatedTasks,
    taskLists,
    taskSettings.autoSort,
  ]);

  const datedTasksByMonth = useMemo<Record<string, DatedTask[]>>(() => {
    const map: Record<string, DatedTask[]> = {};
    for (const task of datedTasks) {
      if (!task.dateValue) continue;
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
    Record<string, Record<string, Array<string | null>>>
  >(() => {
    const map: Record<string, Record<string, Array<string | null>>> = {};
    for (const [monthKey, tasks] of Object.entries(datedTasksByMonth)) {
      const monthDotColors: Record<string, Array<string | null>> = {};
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
  const visibleDatedTasks = useMemo(
    () =>
      datedTasks.filter(
        (task) =>
          task.dateKey === "" || task.dateKey.startsWith(displayedMonthKey),
      ),
    [datedTasks, displayedMonthKey],
  );
  const calendarTaskDates = monthTaskDates[displayedMonthKey] ?? [];
  const dateDotColors = monthDateDotColors[displayedMonthKey] ?? {};

  return (
    <section className="ll-flex ll-h-full ll-min-h-0 ll-flex-col ll-bg-gray-50 ll-dark-bg-gray-950">
      <div className="ll-flex ll-h-full ll-min-h-0 ll-flex-col">
        {showCompactHeaderOffset ? (
          <div className="ll-h-14 ll-shrink-0" />
        ) : null}
        <div
          className={clsx(
            "ll-min-h-0 ll-flex-1 ll-overflow-y-auto",
            showCompactHeaderOffset ? "ll-px-4 ll-pb-6" : "ll-calendar-page",
          )}
        >
          {showCompactHeaderOffset ? null : (
            <header className="ll-page-header ll-mb-2">
              <h1 className="ll-page-title">{t("app.calendar")}</h1>
            </header>
          )}
          <div className="ll-calendar-layout">
            <div className="ll-calendar-layout-aside ll-w-full">
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
                          <span
                            className={clsx(colors.length > 0 && "ll-pb-2")}
                          >
                            {props.day.date.getDate()}
                          </span>
                          {colors.length > 0 ? (
                            <span className="ll-pointer-events-none ll-absolute ll-bottom-1 ll-left-half ll-flex ll-translate-x-neg-half ll-gap-0x5">
                              {colors.map((color, index) => (
                                <span
                                  key={`${dateKey}-${color}-${index}`}
                                  className={clsx(
                                    "ll-h-1x5 ll-w-1x5 ll-rounded-full",
                                    color === null &&
                                      "ll-border ll-border-gray-400 ll-dark-border-gray-500",
                                  )}
                                  style={
                                    color !== null
                                      ? { backgroundColor: color }
                                      : undefined
                                  }
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
              <button
                type="button"
                onClick={() => {
                  setTaskSheet({
                    mode: "add",
                    date: selectedCalendarDate ?? new Date(),
                  });
                  setTaskSheetError(null);
                }}
                className={clsx(BUTTON_PRIMARY_CLASS, "ll-mt-2 ll-w-full")}
              >
                <AppIcon
                  name="add"
                  size={20}
                  aria-hidden="true"
                  focusable="false"
                />
                {selectedCalendarDate
                  ? `${getTaskDateFormatter(i18n.language).format(
                      selectedCalendarDate,
                    )} · ${t("a11y.addTask")}`
                  : t("a11y.addTask")}
              </button>
            </div>
            <div className="ll-calendar-task-list">
              {updateError ? (
                <div className="ll-p-4">
                  <Alert variant="error">{updateError}</Alert>
                </div>
              ) : null}
              {visibleDatedTasks.length > 0 ? (
                visibleDatedTasks.map((task, index) => {
                  const taskId = getDatedTaskId(task);
                  const startsUndatedGroup =
                    !task.dateValue &&
                    (index === 0 ||
                      Boolean(visibleDatedTasks[index - 1]?.dateValue));
                  return (
                    <Fragment key={taskId}>
                      {startsUndatedGroup ? (
                        <p className="ll-calendar-group-label">
                          {t("pages.tasklist.noDate")}
                        </p>
                      ) : null}
                      <CalendarTaskItem
                        task={task}
                        onOpenTaskList={onSelectTaskList}
                        onSelectDate={(date) =>
                          handleSelectCalendarDate(date, visibleDatedTasks)
                        }
                        onToggleComplete={() => completeTask(task)}
                        onOpenActions={() => {
                          setTaskSheet({ mode: "edit", task });
                          setTaskSheetError(null);
                        }}
                        isHighlighted={selectedCalendarDateKey === task.dateKey}
                        itemRef={(element) => {
                          datedTaskRefs.current[taskId] = element;
                        }}
                      />
                    </Fragment>
                  );
                })
              ) : (
                <p className="ll-muted-text ll-m-0 ll-py-4 ll-text-sm">
                  {t("app.calendarNoDatedTasks")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={taskSheet !== null}
        onOpenChange={(open: boolean) => {
          if (!open && !taskSheetSaving) {
            setTaskSheet(null);
            setTaskSheetError(null);
          }
        }}
      >
        {taskSheet ? (
          <TaskSheetContent
            mode={taskSheet.mode}
            taskLists={taskLists}
            initialTaskListId={
              taskSheet.mode === "add"
                ? (defaultTaskListId ?? taskLists[0]?.id ?? "")
                : taskSheet.task.taskListId
            }
            initialText={
              taskSheet.mode === "add" ? "" : taskSheet.task.task.text
            }
            initialPinned={
              taskSheet.mode === "add" ? false : taskSheet.task.task.pinned
            }
            initialDate={
              taskSheet.mode === "add"
                ? taskSheet.date
                : (parseTaskDateValue(taskSheet.task.task.date) ?? null)
            }
            submitting={taskSheetSaving}
            error={taskSheetError}
            onSubmit={handleTaskSheetSubmit}
          />
        ) : null}
      </Dialog>
    </section>
  );
}

type CalendarEntryButtonProps = {
  onOpen: () => void;
  isActive: boolean;
};

function CalendarEntryButton({ onOpen, isActive }: CalendarEntryButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={isActive ? "page" : undefined}
      className="ll-nav-row"
    >
      <span className="ll-sidebar-icon-slot">
        <AppIcon
          name="calendar-today"
          size={20}
          aria-hidden="true"
          focusable="false"
        />
      </span>
      <span className="ll-min-w-0 ll-truncate">{t("app.calendar")}</span>
    </button>
  );
}

type SidebarProps = {
  hasTaskLists: boolean;
  calendarActive: boolean;
  settingsActive: boolean;
  taskLists: TaskList[];
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
  hasTaskLists,
  calendarActive,
  settingsActive,
  taskLists,
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
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source) || source.initialIndex === source.index) return;
    const draggedId = getStringId(source.id);
    const targetId = taskLists[source.index]?.id ?? null;
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
    <div className="ll-flex ll-h-full ll-flex-col ll-gap-3">
      <DrawerHeader>
        <h2 id="drawer-task-lists-title" className="ll-sr-only">
          {t("app.drawerTitle")}
        </h2>
        <div className="ll-sidebar-header">
          <span className="ll-sidebar-brand">
            <img
              src="/brand/logo.svg"
              alt=""
              aria-hidden="true"
              className="ll-sidebar-brand-logo"
            />
            {t("title")}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            title={t("settings.title")}
            aria-label={t("settings.title")}
            aria-current={settingsActive ? "page" : undefined}
            data-vaul-no-drag
            className={clsx(ICON_BUTTON_CLASS, "ll-sidebar-settings")}
          >
            <AppIcon
              name="settings"
              size={22}
              aria-hidden="true"
              focusable="false"
            />
          </button>
        </div>
      </DrawerHeader>

      <nav aria-label={t("app.calendar")}>
        <CalendarEntryButton
          onOpen={onOpenCalendar}
          isActive={calendarActive}
        />
      </nav>

      <div className="ll-flex ll-min-h-0 ll-flex-1 ll-flex-col ll-overflow-y-auto">
        <p className="ll-sidebar-section-label">{t("app.drawerTitle")}</p>
        {hasTaskLists ? (
          <DragDropProvider
            sensors={SORTABLE_SENSORS}
            modifiers={SORTABLE_MODIFIERS}
            plugins={(defaults) => [...defaults, taskListDndAccessibility]}
            onDragEnd={handleDragEnd}
          >
            {taskLists.map((taskList, index) => (
              <SortableTaskListItem
                key={taskList.id}
                taskList={taskList}
                index={index}
                onSelect={(taskListId) => {
                  onSelectTaskList(taskListId);
                  onCloseDrawer();
                }}
                dragHintLabel={t("app.dragHint")}
                taskCountLabel={t("taskList.remainingCount", {
                  count: taskList.tasks.filter((task) => !task.completed)
                    .length,
                })}
                isActive={selectedTaskListId === taskList.id}
              />
            ))}
          </DragDropProvider>
        ) : (
          <p className="ll-muted-text ll-m-0 ll-px-3 ll-py-2 ll-text-sm">
            {t("app.emptyState")}
          </p>
        )}

        <div className="ll-mt-3 ll-grid ll-grid-cols-2 ll-gap-2">
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
              <button type="button" className={BUTTON_TONAL_CLASS}>
                <AppIcon
                  name="add"
                  size={18}
                  aria-hidden="true"
                  focusable="false"
                />
                {t("app.createNew")}
              </button>
            </DialogTrigger>
            <DialogContent title={t("app.createTaskList")}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreateList();
                }}
              >
                <div className="ll-mt-5 ll-flex ll-flex-col ll-gap-5">
                  <label className="ll-flex ll-flex-col ll-gap-2">
                    <span className="ll-field-label">
                      {t("app.taskListName")}
                    </span>
                    <input
                      type="text"
                      value={createListInput}
                      onChange={(e) => setCreateListInput(e.target.value)}
                      placeholder={t("app.taskListNamePlaceholder")}
                      className="ll-field"
                    />
                  </label>
                  <div className="ll-flex ll-flex-col ll-gap-1">
                    <span className="ll-field-label">
                      {t("taskList.selectColor")}
                    </span>
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
                    <button type="button" className={BUTTON_SECONDARY_CLASS}>
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!createListInput.trim()}
                    className={BUTTON_PRIMARY_CLASS}
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
              <button type="button" className={BUTTON_TONAL_CLASS}>
                <AppIcon
                  name="link"
                  size={18}
                  aria-hidden="true"
                  focusable="false"
                />
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
                <div className="ll-mt-5 ll-flex ll-flex-col ll-gap-5">
                  {joinListError ? (
                    <Alert variant="error">{joinListError}</Alert>
                  ) : null}
                  <label className="ll-flex ll-flex-col ll-gap-2">
                    <span className="ll-field-label">
                      {t("taskList.shareCode")}
                    </span>
                    <input
                      type="text"
                      value={joinListInput}
                      onChange={(e) => {
                        setJoinListInput(e.target.value);
                        setJoinListError(null);
                      }}
                      placeholder={t("app.shareCodePlaceholder")}
                      className="ll-field"
                    />
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <button
                      type="button"
                      disabled={joiningList}
                      className={BUTTON_SECONDARY_CLASS}
                    >
                      {t("app.cancel")}
                    </button>
                  </DialogClose>
                  <button
                    type="submit"
                    disabled={!joinListInput.trim() || joiningList}
                    className={BUTTON_PRIMARY_CLASS}
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
  const [startupTaskListSnapshot] = useState(() =>
    readLastTaskListSnapshot(activeUid),
  );
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
  const [isCarouselScrolling, setIsCarouselScrolling] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("detail");
  const previousViewRef = useRef(currentView);
  const [isViewAnimationReady, setIsViewAnimationReady] = useState(false);
  const [viewTransitionDirection, setViewTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const historyDepthRef = useRef(0);
  const [pendingInitialTaskListRoute, setPendingInitialTaskListRoute] =
    useState(false);
  const [activeTaskAction, setActiveTaskAction] = useState<{
    taskListId: string;
    taskId: string;
  } | null>(null);

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
      const nextHistoryDepth = getAppHistoryDepth(window.history.state);

      setViewTransitionDirection(
        nextHistoryDepth < historyDepthRef.current ||
          (route.view === "taskLists" &&
            previousViewRef.current !== "taskLists")
          ? "backward"
          : "forward",
      );
      historyDepthRef.current = nextHistoryDepth;
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
    historyDepthRef.current = getAppHistoryDepth(window.history.state);
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

  const setViewState = useCallback(
    (
      route: KnownAppHashRoute,
      mode: "push" | "replace",
      historyDepthOverride?: number,
    ) => {
      const currentHistoryDepth =
        typeof window === "undefined"
          ? 0
          : getAppHistoryDepth(window.history.state);
      const nextHistoryDepth =
        historyDepthOverride ??
        (mode === "push" ? currentHistoryDepth + 1 : currentHistoryDepth);
      const nextViewTransitionDirection =
        nextHistoryDepth < currentHistoryDepth ||
        (route.view === "taskLists" && previousViewRef.current !== "taskLists")
          ? "backward"
          : "forward";

      startTransition(() => {
        setViewTransitionDirection(nextViewTransitionDirection);
        setCurrentView(route.view);
        setActiveTaskAction(null);
        if (route.view === "detail") {
          setSelectedTaskListId(route.taskListId);
        }
        setPendingInitialTaskListRoute(false);
      });

      if (typeof window === "undefined") {
        return;
      }

      historyDepthRef.current = nextHistoryDepth;
      const nextState = buildAppHistoryState(
        route,
        window.history.state,
        null,
        nextHistoryDepth,
      );
      if (mode === "push") {
        window.history.pushState(nextState, "", toAppUrl(route));
        return;
      }

      window.history.replaceState(nextState, "", toAppUrl(route));
    },
    [],
  );
  const showTaskListsRoot = useCallback(
    () => setViewState({ view: "taskLists" }, "replace", 0),
    [setViewState],
  );
  const openTaskList = useCallback(
    (taskListId: string, mode: "push" | "replace" = "replace") =>
      setViewState(
        { view: "detail", taskListId },
        isWideLayout ? "replace" : mode,
      ),
    [isWideLayout, setViewState],
  );
  const openSettings = (mode: "push" | "replace" = "replace") =>
    setViewState({ view: "settings" }, isWideLayout ? "replace" : mode);
  const openLicenses = (mode: "push" | "replace" = "replace") =>
    setViewState({ view: "licenses" }, isWideLayout ? "replace" : mode);
  const openCalendar = useCallback(
    (mode: "push" | "replace" = "replace") =>
      setViewState({ view: "calendar" }, isWideLayout ? "replace" : mode),
    [isWideLayout, setViewState],
  );
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
      buildAppHistoryState(
        route,
        window.history.state,
        { taskListId, taskId },
        getAppHistoryDepth(window.history.state) + 1,
      ),
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
      getAppHistoryDepth(window.history.state) > 0 &&
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
    openCalendar,
    openTaskList,
    showTaskListsRoot,
  ]);

  useEffect(() => {
    if (!selectedTaskList) {
      return;
    }
    writeLastTaskListSnapshot(activeUid, {
      id: selectedTaskList.id,
      background: resolveTaskListBackground(selectedTaskList.background),
    });
  }, [activeUid, selectedTaskList]);

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
    openTaskList,
    selectedTaskList,
    showTaskListsRoot,
  ]);

  const drawerPanel = (
    <TaskListSidebarPanel
      hasTaskLists={!isTaskListsHydrating && hasTaskLists}
      calendarActive={isWideLayout && currentView === "calendar"}
      settingsActive={
        isWideLayout &&
        (currentView === "settings" || currentView === "licenses")
      }
      taskLists={taskLists}
      onOpenCalendar={() => openCalendar("push")}
      onReorderTaskList={async (draggedTaskListId, targetTaskListId) => {
        setError(null);
        try {
          await reorderTaskList(draggedTaskListId, targetTaskListId);
          logAppEvent("task_list_reorder");
        } catch (err) {
          setError(resolveErrorMessage(err, t, "common.error"));
        }
      }}
      selectedTaskListId={
        !isWideLayout || currentView === "detail" ? selectedTaskListId : null
      }
      onSelectTaskList={(taskListId) => openTaskList(taskListId, "push")}
      onCloseDrawer={() => {}}
      onOpenSettings={() => openSettings("push")}
      onCreateList={async (name, background) => {
        setError(null);
        const newTaskListId = await createTaskList(name, background);
        openTaskList(newTaskListId, "push");
        logAppEvent("task_list_create");
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

        await addSharedTaskListToOrder(taskListId, code);
        openTaskList(taskListId, "push");
        logAppEvent("share_code_join");
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
      return viewTransitionDirection === "forward"
        ? compactBackTransform
        : compactForwardTransform;
    }

    return viewTransitionDirection === "forward"
      ? compactForwardTransform
      : compactBackTransform;
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
    <div
      className={clsx(
        "ll-min-h-full",
        !isWideLayout && "ll-h-full ll-overflow-hidden",
      )}
    >
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
          className={isWideLayout ? "ll-min-h-full" : "ll-h-full"}
          fitContent={isWideLayout}
          indicatorBackground={
            isCarouselScrolling
              ? null
              : resolveTaskListBackground(
                  taskLists[selectedTaskListIndex]?.background ?? null,
                )
          }
          index={selectedTaskListIndex}
          direction={carouselDirection}
          scrollEnabled={!isTaskSorting && !isTaskDragInteracting}
          onScrollStart={() => {
            setIsCarouselScrolling(true);
            moveNewTaskFocusOnCarouselScrollRef.current =
              focusedNewTaskListId === selectedTaskListId;
          }}
          onScrollEnd={(index) => {
            setIsCarouselScrolling(false);
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
          showIndicators={!isWideLayout}
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
              className={clsx(
                "ll-flex ll-w-full ll-flex-col",
                isWideLayout ? "ll-min-h-full" : "ll-h-full",
              )}
              style={{
                backgroundColor: resolveTaskListBackground(taskList.background),
              }}
            >
              <div className={isWideLayout ? "ll-h-10" : "ll-h-88px"} />
              <div
                className={clsx(
                  !isWideLayout && "ll-h-full ll-overflow-y-auto ll-pb-10",
                  isWideLayout &&
                    "ll-task-column ll-mx-auto ll-w-full ll-pb-12",
                )}
              >
                <TaskListCard
                  taskList={taskList}
                  autoSort={settings?.autoSort ?? true}
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
        autoSort: settings?.autoSort ?? true,
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
          className={clsx(
            "ll-flex ll-h-full ll-min-h-0 ll-w-full ll-min-w-0 ll-flex-1 ll-flex-col",
            isWideLayout && "ll-overflow-y-auto",
          )}
        >
          {isWideLayout ? (
            <div className="ll-min-h-full">
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
                    compact={true}
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
                      title={t("app.calendar")}
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
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated" && !isProvisioning) {
      window.location.replace("/app/");
    }
  }, [authStatus, isProvisioning]);

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
        log("login", { method: "email" });
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
        setIsProvisioning(true);
        try {
          await signUp(email, password, resolvedLanguage);
          log("sign_up", { method: "email" });
        } finally {
          setIsProvisioning(false);
        }
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
      logAppEvent("password_reset_email_sent");
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
      type="button"
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
  const { taskLists: ownTaskLists } = useTaskListIndexState();
  const [sharecode, setSharecode] = useState<string | null>(null);
  const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addToOrderLoading, setAddToOrderLoading] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const [activeTaskAction, setActiveTaskAction] = useState<string | null>(null);
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
        log("share", { method: "share_code", content_type: "task_list" });
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
  const isMember = ownTaskLists.some((item) => item.id === sharedTaskListId);

  const handleAddToOrder = async () => {
    if (!taskList || !user || !sharecode) return;

    try {
      setAddToOrderLoading(true);
      setAddToOrderError(null);
      await addSharedTaskListToOrder(taskList.id, sharecode);
      logAppEvent("share_code_join");
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
            type="button"
            onClick={handleAddToOrder}
            disabled={addToOrderLoading}
            className={BUTTON_PRIMARY_CLASS}
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

        <div className="ll-mx-auto ll-min-h-full ll-w-full ll-max-w-3xl">
          <TaskListCard
            taskList={taskList}
            autoSort={settings?.autoSort ?? true}
            taskInsertPosition={settings?.taskInsertPosition ?? "top"}
            isActive={true}
            shouldFocusNewTaskInput={false}
            onNewTaskInputFocusChange={() => {}}
            canDeleteTaskList={isMember}
            canManageShareCode={isMember}
            canEditTasks={isMember}
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
  const cachedTaskListIds = readCachedTaskListOrderIds(uid);
  void Promise.all(
    cachedTaskListIds.map((taskListId) =>
      getDocFromCache(doc(db, "taskLists", taskListId, "members", uid))
        .then((snapshot) => (snapshot.exists() ? taskListId : null))
        .catch(() => null),
    ),
  ).then((memberTaskListIds) => {
    getTaskListIdChunks(
      memberTaskListIds.filter(
        (taskListId): taskListId is string => taskListId !== null,
      ),
    ).forEach((chunk) => {
      void getDocsFromCache(
        query(collection(db, "taskLists"), where("__name__", "in", chunk)),
      ).catch(() => {});
    });
  });
};

const loadAppData = pageKey === "app" || pageKey === "sharecodes";

if (loadAppData) {
  getAuthInstance();
  getDbInstance();
  warmUpStartupData();
}

const root = webBootstrapState.root ?? createRoot(rootElement);
webBootstrapState.root = root;

root.render(
  <StrictMode>
    <AppWrapper loadAppData={loadAppData}>
      <Page />
    </AppWrapper>
  </StrictMode>,
);
