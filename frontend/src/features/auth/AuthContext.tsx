import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { post } from "../../lib/api";

type User = {
  email: string;
  name: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("prepai_token");
    const savedUser = localStorage.getItem("prepai_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const persistSession = (email: string, nextToken: string) => {
    const nextUser = { email, name: email.split("@")[0] };
    localStorage.setItem("prepai_token", nextToken);
    localStorage.setItem("prepai_user", JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login: async (email: string, password: string) => {
        const result = await post<{
          AccessToken?: string;
          IdToken?: string;
        }>("/auth/login", { email, password });
        const nextToken = result.IdToken || result.AccessToken || "";
        persistSession(email, nextToken);
      },
      signup: async (email: string, password: string, name = email.split("@")[0]) => {
        await post("/auth/signup", { email, password, name });
        const result = await post<{
          AccessToken?: string;
          IdToken?: string;
        }>("/auth/login", { email, password });
        persistSession(email, result.IdToken || result.AccessToken || "");
      },
      forgotPassword: async (email: string) => {
        await post("/auth/forgot-password", { email });
      },
      resetPassword: async (email: string, code: string, newPassword: string) => {
        await post("/auth/reset-password", { email, code, newPassword });
      },
      logout: () => {
        localStorage.removeItem("prepai_token");
        localStorage.removeItem("prepai_user");
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
