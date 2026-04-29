// src/context/AuthContext.jsx
// Holds the logged-in user + token across the app.
// Persists to localStorage so reloading the page keeps the session.

import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // On boot, if we have a token, refresh /me to validate it
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    authApi.me().then(({ user }) => {
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    }).catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    });
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const { user, token } = await authApi.login({ email, password });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return user;
    } finally {
      setLoading(false);
    }
  }

  async function register(email, username, password) {
    setLoading(true);
    try {
      const { user, token } = await authApi.register({ email, username, password });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
