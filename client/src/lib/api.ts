import axios from 'axios';

// Module-level token store — avoids circular dependency with AuthContext
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly refresh-token cookie
});

// Request interceptor — attach Bearer token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token_expired 401 with one silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const isTokenExpired = error.response?.data?.code === 'token_expired';
    const alreadyRetried = originalRequest._retry;

    if (is401 && isTokenExpired && !alreadyRetried) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
