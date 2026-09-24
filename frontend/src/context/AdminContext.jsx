import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AdminContext = createContext(null);

const ADMIN_API = axios.create({
  baseURL: 'http://localhost:5000/api/v1'
});

ADMIN_API.interceptors.request.use(config => {
  const token = localStorage.getItem('vendora_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('vendora_admin');
    const token = localStorage.getItem('vendora_admin_token');
    if (stored && token) setAdmin(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await ADMIN_API.post('/admin/login', { email, password });
    localStorage.setItem('vendora_admin_token', res.data.token);
    localStorage.setItem('vendora_admin', JSON.stringify(res.data));
    setAdmin(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('vendora_admin_token');
    localStorage.removeItem('vendora_admin');
    setAdmin(null);
  };

  return (
    <AdminContext.Provider value={{ admin, loading, login, logout, ADMIN_API }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be inside AdminProvider');
  return ctx;
};

export { ADMIN_API };
