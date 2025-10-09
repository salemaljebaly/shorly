import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const getLocalizedPath = (path: string) => {
  if (typeof window === 'undefined') {
    return path;
  }

  const segments = window.location.pathname.split('/').filter(Boolean);
  const supportedLocales = new Set(['en', 'ar']);
  const locale = segments.length > 0 && supportedLocales.has(segments[0]) ? segments[0] : 'en';
  const cleanPath = path.replace(/^\//, '');
  return `/${locale}/${cleanPath}`;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshToken = window.localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        window.localStorage.setItem('access_token', accessToken);
        window.localStorage.setItem('refresh_token', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        window.localStorage.removeItem('access_token');
        window.localStorage.removeItem('refresh_token');
        window.location.href = getLocalizedPath('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
