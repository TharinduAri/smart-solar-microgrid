// Holds the signed-in user for the whole application and exposes login / logout.
import { createContext, useContext, useMemo, useState } from 'react';
import { api, setToken } from '../api/client.js';

const AuthContext = createContext(null);
const USER_KEY = 'ss_user';

export function AuthProvider({ children }) {
  // Restore the session from localStorage so a page refresh keeps the user logged in.
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // Calls the API login endpoint and stores the returned token and profile.
  async function login(username, password) {
    const result = await api.post('/api/auth/login', { username, password });
    setToken(result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result));
    setUser(result);
    return result;
  }

  // Clears the stored token and profile.
  function logout() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, login, logout, isBackoffice: user?.role === 'Backoffice' }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook used by the pages to read the current session.
export function useAuth() {
  return useContext(AuthContext);
}
