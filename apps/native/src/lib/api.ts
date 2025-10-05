import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'accessToken';

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
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (
      token &&
      !endpoint.startsWith('/auth/register') &&
      !endpoint.startsWith('/auth/login')
    ) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
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
    return response;
  },

  async login(email: string, password: string) {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await this.setToken(response.data.accessToken);
    return response;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      await this.removeToken();
    }
  },

  async deleteAccount() {
    await this.request('/api/auth/account', {
      method: 'DELETE',
    });
    await this.removeToken();
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
};
