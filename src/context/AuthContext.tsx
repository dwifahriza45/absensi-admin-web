import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, type Admin } from "@/api/auth.api";
import { allowSessionRefresh, isUnauthorized } from "@/api/client";
import { clearPhotoCache } from "@/hooks/usePhotoUrl";

interface AuthContextValue {
  isLoggedIn: boolean;
  loading: boolean;
  sessionError: string | null;
  user: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const checkSession = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    try {
      setUser(await authApi.me());
    } catch (error) {
      if (isUnauthorized(error)) setUser(null);
      else
        setSessionError(
          error instanceof Error ? error.message : "Gagal memeriksa sesi.",
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Remove the obsolete PIN-era token; credentials now stay in HttpOnly cookies.
    localStorage.removeItem("absensi.admin.token");
    const expired = () => {
      clearPhotoCache();
      setUser(null);
    };
    window.addEventListener("auth:expired", expired);
    void checkSession();
    return () => window.removeEventListener("auth:expired", expired);
  }, [checkSession]);
  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    allowSessionRefresh(true);
    setUser(await authApi.me());
    setSessionError(null);
  }, []);
  const logout = useCallback(async () => {
    allowSessionRefresh(false);
    try {
      await authApi.logout();
      clearPhotoCache();
      setUser(null);
    } catch (error) {
      allowSessionRefresh(true);
      throw error;
    }
  }, []);
  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      loading,
      sessionError,
      checkSession,
      login,
      logout,
    }),
    [user, loading, sessionError, checkSession, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return value;
}
