// https://www.better-auth.com/docs/authentication/email-password
// https://www.better-auth.com/docs/basic-usage
// https://www.better-auth.com/docs/concepts/users-accounts#delete-user
export function createAuth() {
  const setSession = async (session) => {
  };

  return {
    getSession: async () => {
    },
    signUp: async (name: string, email: string, password: string) => {
    },
    signIn: async (email: string, password: string) => {
    },
    signOut: async () => {
    },
    deleteUser: async () => {
    },
    requestPasswordReset: async (email: string) => {
    },
    resetPassword: async (newPassword: string, token: string) => {
    },
    changePassword: async (
      currentPassword: string,
      newPassword: string
    ) => {
    },
  }
}
