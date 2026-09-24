import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {API, api} from "../config/api";
import { authStore } from '../config/authStore';
import { refreshToken } from '../services/refreshToken';

const AuthContext = createContext(null);

// Attach token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem('storely_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AuthProvider = ({ children }) => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Listen for session expiry events (fired by interceptor above)
  useEffect(() => {
    const handler = () => {
      setVendor(null);
      // Toast is handled by components that care
    };
    window.addEventListener('storely:session-expired', handler);
    return () => window.removeEventListener('storely:session-expired', handler);
  }, []);

  const hasInitialized = useRef(false);

  // Rehydrate on mount
  useEffect(() => {
    if(hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      setLoading(true);

      try {
        const refreshRes = await refreshToken();
        const newToken = refreshRes.token;

        authStore.setToken(newToken);

        const userRes = await API.get('/vendor/me');

        authStore.setVendor(userRes.data);
        setVendor(userRes.data);

      } catch (err) {
        authStore.clear();
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = async (email, password) => {
    const res = await api.postLogin({ email, password });

    authStore.setToken(res.data.token);
    authStore.setVendor(res.data.vendor);

    setVendor(res.data.vendor);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.putRegistration(data);
    setToken(res.data.token);
    setVendor(res.data);
    return res.data;
  };

 
  const logout = async () => {
    try {
      await API.post('/auth/logout'); // invalidates refresh cookie server-side
    } catch(err) {
      console.log(err)
    }
    setVendor(null);
    setToken(null)
  };

  const logoutAll = async () => {
    try {
      await API.post('/auth/logout-all');
    } catch {}
    setVendor(null);
    setToken(null)
  };

  const updateVendor = (data) => {
    setVendor(data);
    localStorage.setItem('storely_vendor', JSON.stringify(data));
  };

  return (
    <AuthContext.Provider 
      value={{ vendor, updateVendor, loading, API, 
               login, register, logout, token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

