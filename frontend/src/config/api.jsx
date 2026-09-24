import axios from 'axios';
import { createProduct, createAuth, createStore } from '../../../shared/api/client';
import { refreshToken } from '../services/refreshToken';
import { authStore } from './authStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1995/api/v1';

// ── Axios instance ────────────────────────────────────────────────────────────
export const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

export const axiosInstance = createProduct(API);

export const axiosInstanceStore = createStore(API)

export const api = createAuth(API);


// ── Request interceptor: attach access token ──────────────────────────────────
API.interceptors.request.use(config => {
  const token  = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh on 401 TOKEN_EXPIRED ──────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

API.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const code = err.response?.data?.code;

    // Only retry once on TOKEN_EXPIRED, never on refresh endpoint itself
    if (err.response?.status === 401 && code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        // Queue requests while a refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return API(original);
        });
      }

      original._retry = true;
      isRefreshing     = true;

      try {
        const data = await refreshToken()
        const token = data.token
        authStore.setToken(token);
        if (data.vendor) authStore.setVendor(data.vendor)
        API.defaults.headers.Authorization = `Bearer ${token}`;
        original.headers.Authorization     = `Bearer ${token}`;
        processQueue(null, token);
        return API(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Refresh failed — clear session and let the app handle it
        authStore.clear();

        window.dispatchEvent(new Event('storely:session-expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
