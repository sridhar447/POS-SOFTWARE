import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify with backend
        api.get('/auth/me')
          .then(res => {
            if (res.data && res.data.user) {
              setUser(res.data.user);
              localStorage.setItem('user', JSON.stringify(res.data.user));
            }
          })
          .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          })
          .finally(() => setLoading(false));
      } catch (e) {
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrUsername, password) => {
    const res = await api.post('/auth/login', { emailOrUsername, password });
    if (res.success && res.data) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isBillingUser = user?.role === 'BILLING_USER';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isBillingUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
