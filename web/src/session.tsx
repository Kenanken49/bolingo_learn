import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, type User } from "./api";

interface SessionValue {
  user: User | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setUser(await api.signup(email, password));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The token may already be expired or revoked; clear it locally anyway.
    }
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (getToken()) setUser(await api.me());
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, booting, login, signup, logout, refresh }),
    [user, booting, login, signup, logout, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
