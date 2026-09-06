import axios from 'axios';

/**
 * Central API client.
 * Base URL comes from VITE_API_BASE_URL so the dashboard can be pointed
 * at any cloud backend without code changes.
 */
const api = axios.create({
  baseURL: 'https://grandautotech.vercel.app/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try refresh once; otherwise log out
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );
          localStorage.setItem('accessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error, fallback = 'Something went wrong') {
  if (error?.response?.data?.errors?.length) {
    return error.response.data.errors.map(e => e.message).join(', ');
  }
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;