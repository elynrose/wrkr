import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('hp_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('hp_token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await apiRequest('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('hp_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('hp_token', data.token);
    if (data.refreshToken) localStorage.setItem('hp_refresh', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const register = async ({ email, password, role, firstName, lastName, phone, _hp_website, _hp_ts }) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, firstName, lastName, phone, _hp_website, _hp_ts }),
    });
    localStorage.setItem('hp_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('hp_token');
    localStorage.removeItem('hp_refresh');
    setUser(null);
  };

  const updateProfile = async (fields) => {
    const data = await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    await fetchMe();
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

const AUTH_FALLBACK = { user: null, loading: true, login: async () => {}, register: async () => {}, logout: () => {}, updateProfile: async () => {}, fetchMe: () => {} };
export const useAuth = () => useContext(AuthContext) ?? AUTH_FALLBACK;
