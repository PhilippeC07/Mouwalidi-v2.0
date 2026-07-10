import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as loginRequest, getMe, type AuthUser } from '../api/auth/auth.api';
import { getToken, setToken, clearAuthStorage, getStoredUser, setStoredUser } from '../api/axios';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  const [loading, setLoading] = useState(() => !!getToken());

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getMe()
      .then((fresh) => {
        setUser(fresh);
        setStoredUser(fresh);
      })
      .catch(() => {
        clearAuthStorage();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { accessToken, user: loggedInUser } = await loginRequest(email, password);
    setToken(accessToken);
    setStoredUser(loggedInUser);
    setUser(loggedInUser);
  }

  function logout() {
    clearAuthStorage();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
