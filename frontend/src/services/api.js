// src/services/api.js
// Axios instance with JWT interceptor and helpers for every API surface.

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login:    (data) => api.post('/auth/login', data).then((r) => r.data),
  me:       ()     => api.get('/auth/me').then((r) => r.data)
};

// ---- Market ----
export const marketApi = {
  prices:  (limit = 50) => api.get('/market/prices', { params: { limit } }).then((r) => r.data.coins),
  coin:    (id)         => api.get(`/market/${id}`).then((r) => r.data.coin),
  history: (id, days=7) => api.get(`/market/${id}/history`, { params: { days } }).then((r) => r.data.history),
  search:  (q)          => api.get('/market/search', { params: { q } }).then((r) => r.data.results)
};

// ---- Orders ----
export const orderApi = {
  create: (payload)  => api.post('/orders', payload).then((r) => r.data.order),
  list:   (status)   => api.get('/orders', { params: status ? { status } : {} }).then((r) => r.data.orders),
  cancel: (id)       => api.delete(`/orders/${id}`).then((r) => r.data.order)
};

// ---- Portfolio ----
export const portfolioApi = {
  get:     () => api.get('/portfolio').then((r) => r.data),
  history: () => api.get('/portfolio/history').then((r) => r.data.transactions),
  stats:   () => api.get('/portfolio/stats').then((r) => r.data)
};

// ---- Leaderboard ----
export const leaderboardApi = {
  get: (sort = 'value', limit = 50) =>
    api.get('/leaderboard', { params: { sort, limit } }).then((r) => r.data.leaderboard)
};

// ---- Admin ----
export const adminApi = {
  users:        () => api.get('/admin/users').then((r) => r.data.users),
  toggleActive: (id, isActive) => api.patch(`/admin/users/${id}`, { isActive }).then((r) => r.data.user),
  stats:        () => api.get('/admin/stats').then((r) => r.data)
};

export default api;
