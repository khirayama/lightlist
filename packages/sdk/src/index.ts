// Lightlist SDK
// 共通のAPI型定義とユーティリティ関数

// 基本的な型定義
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  name: string;
  background: string;
  order: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  order: number;
  taskListId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
}

export interface AppSettings {
  id: string;
  taskInsertPosition: 'top' | 'bottom';
  autoSort: boolean;
  taskListOrder: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// API レスポンス型
export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// エラー型
export interface ApiError {
  message: string;
  statusCode: number;
  details?: unknown;
}

// バリデーション関連の型
export interface ValidationError {
  field: string;
  message: string;
}

// ユーティリティ関数
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // 大文字・小文字・数字を含む8文字以上
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// デフォルト値
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'ja',
};

export const DEFAULT_APP_SETTINGS: Omit<
  AppSettings,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  taskInsertPosition: 'top',
  autoSort: false,
  taskListOrder: [],
};

// APIエンドポイント定数
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  SETTINGS: '/api/settings',
  APP_SETTINGS: '/api/app',
  TASKLISTS: '/api/tasklists',
} as const;
