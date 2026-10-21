import { API_PREFIX, type ApiResponse } from '@sams/shared';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, removeAuthToken, removeStoredUser } from '../storage/token';

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    return `http://${host}:4000${API_PREFIX}`;
  }
  const rawBase = (process.env.EXPO_PUBLIC_API_URL || 'http://10.211.58.132:4000').replace(/\/+$/, '');
  return rawBase.endsWith(API_PREFIX) ? rawBase : `${rawBase}${API_PREFIX}`;
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = getBaseUrl();
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      // Clear token if expired or unauthorized
      await removeAuthToken();
      await removeStoredUser();
    }
    const message =
      (error.response?.data && !error.response.data.success && error.response.data.error?.message) ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);
