import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const url = new URL(envUrl);
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
      url.hostname
    );
    if (Platform.OS === 'android' && isLocalhost) {
      url.hostname = '10.0.2.2';
    }
    const basePath = url.pathname ? url.pathname.replace(/\/$/, '') : '';
    return `${url.protocol}//${url.host}${basePath}`;
  } catch {
    return envUrl.replace(/\/$/, '');
  }
}

function base64Encode(input: string): string {
  if (typeof btoa === 'function') {
    try {
      return btoa(unescape(encodeURIComponent(input)));
    } catch {
      // fallthrough
    }
  }
  // @ts-expect-error Buffer may exist via polyfill in Expo/Metro
  if (typeof Buffer !== 'undefined') {
    // @ts-expect-error polyfill
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  // Fallback (very limited, ASCII only)
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input;
  let output = '';
  for (
    let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || ((map = '='), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error('base64Encode: non-ASCII input without polyfill');
    }
    block = (block << 8) | charCode;
  }
  return output;
}

const API_URL = resolveApiUrl();
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const api = {
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  async removeRefreshToken(): Promise<void> {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (
      token &&
      !endpoint.startsWith('/api/auth/register') &&
      !endpoint.startsWith('/api/auth/login') &&
      !endpoint.startsWith('/api/auth/refresh')
    ) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (
        response.status === 401 &&
        !isRetry &&
        !endpoint.startsWith('/api/auth/refresh')
      ) {
        try {
          await this.refresh();
          return await this.request<T>(endpoint, options, true);
        } catch (refreshError) {
          await this.removeToken();
          await this.removeRefreshToken();
          throw new Error('Session expired. Please login again.');
        }
      }

      throw new Error(data.message || 'API request failed');
    }

    return data;
  },

  async register(email: string, password: string, language: 'ja' | 'en') {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, language }),
    });

    await this.setToken(response.data.accessToken);
    await this.setRefreshToken(response.data.refreshToken);
    return response;
  },

  async login(email: string, password: string) {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await this.setToken(response.data.accessToken);
    await this.setRefreshToken(response.data.refreshToken);
    return response;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      await this.removeToken();
      await this.removeRefreshToken();
    }
  },

  async deleteAccount() {
    await this.request('/api/auth/account', {
      method: 'DELETE',
    });
    await this.removeToken();
    await this.removeRefreshToken();
  },

  async forgotPassword(email: string) {
    return await this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string) {
    return await this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  async refresh() {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    await this.setToken(response.data.accessToken);
    await this.setRefreshToken(response.data.refreshToken);
    return response;
  },

  async getSettings() {
    return await this.request<{
      id: string;
      theme: 'system' | 'light' | 'dark';
      language: 'ja' | 'en';
      taskInsertPosition: 'top' | 'bottom';
      autoSort: boolean;
    }>('/api/settings', {
      method: 'GET',
    });
  },

  async updateSettings(settings: {
    theme?: 'system' | 'light' | 'dark';
    language?: 'ja' | 'en';
    taskInsertPosition?: 'top' | 'bottom';
    autoSort?: boolean;
  }) {
    return await this.request<{
      id: string;
      theme: 'system' | 'light' | 'dark';
      language: 'ja' | 'en';
      taskInsertPosition: 'top' | 'bottom';
      autoSort: boolean;
    }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async createTaskListDoc(name: string, background: string = '') {
    return await this.request<{
      id: string;
      name: string;
      background: string;
      createdAt: string;
      updatedAt: string;
      doc: string; // base64
    }>('/api/tasklistdocs', {
      method: 'POST',
      body: JSON.stringify({ name, background }),
    });
  },

  async getTaskListDocs(params?: {
    signal?: AbortSignal;
    ifNoneMatch?: string;
  }) {
    const headers: Record<string, string> = {};
    if (params?.ifNoneMatch) headers['If-None-Match'] = params.ifNoneMatch;
    return await this.request<
      Array<{
        id: string;
        name: string;
        background: string;
        createdAt: string;
        updatedAt: string;
        doc?: string; // base64
      }>
    >('/api/tasklistdocs', {
      method: 'GET',
      headers,
      signal: params?.signal,
    });
  },

  async updateTaskListDoc(
    taskListId: string,
    ops: { root?: unknown[]; tasks?: unknown[]; history?: unknown[] }
  ) {
    const updates = base64Encode(JSON.stringify(ops));
    return await this.request<{
      id: string;
      name: string;
      background: string;
      updatedAt: string;
      doc: string; // base64
    }>(`/api/tasklistdocs/${taskListId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  },

  async deleteTaskListDoc(taskListId: string) {
    return await this.request<{
      id: string;
    }>(`/api/tasklistdocs/${taskListId}`, {
      method: 'DELETE',
    });
  },

  async updateTaskListDocOrder(ops: unknown[]) {
    const updates = base64Encode(JSON.stringify(ops));
    return await this.request<{
      updatedCount: number;
    }>('/api/tasklistdocs/order', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  },
};
