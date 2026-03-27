import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  signUp as svcSignUp,
  signIn as svcSignIn,
  signOut as svcSignOut,
  googleAuth as svcGoogleAuth,
  getProfile as svcGetProfile,
  updateProfile as svcUpdateProfile,
  changePassword as svcChangePassword,
  getCredits as svcGetCredits,
  type User,
} from "@/lib/services/authService";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    inviteCode?: string
  ) => Promise<void>;
  loginWithGoogle: (payload: {
    email: string;
    googleId: string;
    name?: string;
    avatar?: string;
    idToken?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ── Helpers: persist / hydrate auth state ──

const persistAuth = (token: string, refreshToken: string | undefined, user: User) => {
  localStorage.setItem("auth_token", token);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

const hydrateUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Provider ──

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(hydrateUser);
  const [loading, setLoading] = useState(true);

  // On mount: verify persisted session by fetching fresh profile
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    svcGetProfile()
      .then(({ user: freshUser }) => {
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      })
      .catch(() => {
        // Token invalid / expired — apiClient interceptor may have already
        // cleared storage. Ensure local state matches.
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      inviteCode?: string
    ) => {
      const res = await svcSignUp(email, password, name, inviteCode);
      persistAuth(res.token, res.refreshToken, res.user);
      setUser(res.user);
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await svcSignIn(email, password);
    persistAuth(res.token, res.refreshToken, res.user);
    setUser(res.user);
  }, []);

  const loginWithGoogle = useCallback(
    async (payload: {
      email: string;
      googleId: string;
      name?: string;
      avatar?: string;
      idToken?: string;
    }) => {
      const res = await svcGoogleAuth(payload);
      persistAuth(res.token, res.refreshToken, res.user);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await svcSignOut();
    clearAuth();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { user: freshUser } = await svcGetProfile();
    setUser(freshUser);
    localStorage.setItem("user", JSON.stringify(freshUser));
  }, []);

  const refreshCredits = useCallback(async () => {
    const creditsData = await svcGetCredits();
    setUser((prev) =>
      prev
        ? {
            ...prev,
            credits: creditsData.credits,
            plan: creditsData.plan as User["plan"],
          }
        : null
    );
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    const { user: updated } = await svcUpdateProfile(name);
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await svcChangePassword(currentPassword, newPassword);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        refreshProfile,
        refreshCredits,
        updateDisplayName,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
