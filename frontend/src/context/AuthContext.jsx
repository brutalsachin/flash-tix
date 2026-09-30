import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setToken } from '../api/client';

const AuthContext = createContext(null);
const KEY = 'flashtix-session';

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}
function writeSession(s) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// Where each role lands after signing in.
export const HOME_FOR = { ADMIN: '/admin', ORGANIZER: '/organizer', USER: '/' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore session on load and re-check it with the backend.
  useEffect(() => {
    const s = readSession();
    if (!s?.token) {
      setReady(true);
      return;
    }
    setToken(s.token);
    api
      .me()
      .then((u) => {
        if (u) setUser(u);
        else {
          setToken(null);
          writeSession(null);
        }
      })
      .catch(() => writeSession(null))
      .finally(() => setReady(true));
  }, []);

  const start = useCallback(({ token, user: u }) => {
    setToken(token);
    writeSession({ token });
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (email, password) => start(await api.login(email, password)), [start]);
  const signup = useCallback(async (data) => start(await api.signup(data)), [start]);
  const acceptInvite = useCallback(async (t, pw) => start(await api.acceptInvite(t, pw)), [start]);
  const logout = useCallback(() => {
    setToken(null);
    writeSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
