// https://www.better-auth.com/docs/authentication/email-password
// https://www.better-auth.com/docs/basic-usage
// https://www.better-auth.com/docs/concepts/users-accounts#delete-user
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';

const STORAGE_KEY = 'auth:session';
const JWT_STORAGE_KEY = 'auth:jwt';
const authClient = createAuthClient({
  plugins: [jwtClient()],
});

type Session = typeof authClient.$Infer.Session;

export function createAuth() {
  const setStorage = async (key: string, value: Session | string | null) => {
    if (typeof window === 'undefined') return;
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  return {
    getSession: async () => {
      const { data, error } = await authClient.getSession({
        fetchOptions: {
          onSuccess: ctx => {
            const jwt = ctx.response.headers.get('set-auth-jwt');
            if (jwt) void setStorage(JWT_STORAGE_KEY, jwt);
          },
        },
      });
      if (error) return null;
      await setStorage(STORAGE_KEY, data ?? null);
      if (!error && !data) await setStorage(JWT_STORAGE_KEY, null);
      return data ?? null;
    },
    signUp: async (name: string, email: string, password: string) => {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const { data: sessionData } = await authClient.getSession({
        fetchOptions: {
          onSuccess: ctx => {
            const jwt = ctx.response.headers.get('set-auth-jwt');
            if (jwt) void setStorage(JWT_STORAGE_KEY, jwt);
          },
        },
      });
      await setStorage(STORAGE_KEY, sessionData ?? null);
      if (!sessionData) await setStorage(JWT_STORAGE_KEY, null);
    },
    signIn: async (email: string, password: string) => {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message);
      const { data: sessionData } = await authClient.getSession({
        fetchOptions: {
          onSuccess: ctx => {
            const jwt = ctx.response.headers.get('set-auth-jwt');
            if (jwt) void setStorage(JWT_STORAGE_KEY, jwt);
          },
        },
      });
      await setStorage(STORAGE_KEY, sessionData ?? null);
      if (!sessionData) await setStorage(JWT_STORAGE_KEY, null);
    },
    signOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message);
      await setStorage(STORAGE_KEY, null);
      await setStorage(JWT_STORAGE_KEY, null);
    },
    deleteUser: async () => {
      const { error } = await authClient.deleteUser();
      if (error) throw new Error(error.message);
    },
    requestPasswordReset: async (email: string) => {
      const { error } = await authClient.requestPasswordReset({ email });
      if (error) throw new Error(error.message);
    },
    resetPassword: async (newPassword: string, token: string) => {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) throw new Error(error.message);
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) throw new Error(error.message);
    },
  };
}
