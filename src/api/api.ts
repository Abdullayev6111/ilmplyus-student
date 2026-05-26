import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import useAuthStore from '../store/useAuthStore';
import { queryClient } from '../main';
import { notifications } from '@mantine/notifications';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipGlobalNotification?: boolean;
  }
}

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use((config) => {
  const { token, isExpired, logout } = useAuthStore.getState();

  if (token) {
    if (isExpired()) {
      logout();
      return Promise.reject(new Error('Token expired'));
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const cfg = error.config as InternalAxiosRequestConfig & { skipGlobalNotification?: boolean };

    if (!cfg?.skipGlobalNotification) {
      if (status === 403) {
        notifications.show({
          id: 'forbidden-notification',
          title: 'Ruxsat yo\'q',
          message: 'Sahifa mavjud emas',
          color: 'red',
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message;
        notifications.show({
          id: 'global-error-notification',
          title: 'Xatolik',
          message: errorMessage || 'Noma\'lum xatolik yuz berdi',
          color: 'red',
        });
      }
    }

    if (status === 401) {
      logoutAndRedirect();
    }

    return Promise.reject(error);
  },
);

function logoutAndRedirect() {
  const { logout } = useAuthStore.getState();
  logout();

  queryClient?.clear();
  window.location.href = '/login';
}
