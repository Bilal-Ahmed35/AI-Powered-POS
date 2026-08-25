import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Resolves the valid, active token for the current tab / role context.
 * Prioritizes tab-isolated sessionStorage over shared localStorage.
 */
export const getActiveAuthToken = () => {
  if (typeof sessionStorage !== 'undefined') {
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
  }

  if (typeof window !== 'undefined' && window.location) {
    const path = window.location.pathname || '';
    if (path.startsWith('/cashier')) {
      const vendorToken = localStorage.getItem('vendor_token');
      if (vendorToken) return vendorToken;
    } else if (path.startsWith('/kitchen')) {
      const kitchenToken = localStorage.getItem('kitchen_token');
      if (kitchenToken) return kitchenToken;
    } else if (path.startsWith('/admin')) {
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) return adminToken;
    } else if (path.startsWith('/customer')) {
      const customerToken = localStorage.getItem('customer_token');
      if (customerToken) return customerToken;
    }
  }

  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('token');
  }

  return null;
};

/**
 * Resolves the valid refresh token for the current tab / role context.
 */
export const getActiveRefreshToken = () => {
  if (typeof sessionStorage !== 'undefined') {
    const sessionRefresh = sessionStorage.getItem('refreshToken');
    if (sessionRefresh) return sessionRefresh;
  }

  if (typeof window !== 'undefined' && window.location) {
    const path = window.location.pathname || '';
    if (path.startsWith('/cashier')) {
      const vendorRefresh = localStorage.getItem('vendor_refreshToken');
      if (vendorRefresh) return vendorRefresh;
    } else if (path.startsWith('/kitchen')) {
      const kitchenRefresh = localStorage.getItem('kitchen_refreshToken');
      if (kitchenRefresh) return kitchenRefresh;
    } else if (path.startsWith('/admin')) {
      const adminRefresh = localStorage.getItem('admin_refreshToken');
      if (adminRefresh) return adminRefresh;
    } else if (path.startsWith('/customer')) {
      const customerRefresh = localStorage.getItem('customer_refreshToken');
      if (customerRefresh) return customerRefresh;
    }
  }

  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }

  return null;
};

/**
 * Stores tokens into tab-isolated sessionStorage and role-scoped localStorage.
 */
export const setActiveAuthTokens = (accessToken, refreshToken) => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('token', accessToken);
    if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

    if (typeof window !== 'undefined' && window.location) {
      const path = window.location.pathname || '';
      if (path.startsWith('/cashier')) {
        localStorage.setItem('vendor_token', accessToken);
        if (refreshToken) localStorage.setItem('vendor_refreshToken', refreshToken);
      } else if (path.startsWith('/kitchen')) {
        localStorage.setItem('kitchen_token', accessToken);
        if (refreshToken) localStorage.setItem('kitchen_refreshToken', refreshToken);
      } else if (path.startsWith('/admin')) {
        localStorage.setItem('admin_token', accessToken);
        if (refreshToken) localStorage.setItem('admin_refreshToken', refreshToken);
      } else if (path.startsWith('/customer')) {
        localStorage.setItem('customer_token', accessToken);
        if (refreshToken) localStorage.setItem('customer_refreshToken', refreshToken);
      }
    }
  }
};

// Request interceptor to attach authorization token and active session ID dynamically
api.interceptors.request.use(
  (config) => {
    const hasAuth =
      config.headers &&
      (typeof config.headers.get === 'function'
        ? config.headers.get('Authorization')
        : config.headers['Authorization']);

    if (!hasAuth) {
      const token = getActiveAuthToken();
      if (token) {
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else if (config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }

    const sessionId =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('customer_sessionId')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('customer_sessionId'));

    if (sessionId) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('X-Session-ID', sessionId);
      } else if (config.headers) {
        config.headers['X-Session-ID'] = sessionId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry with auto-refresh queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      const storedRefreshToken = getActiveRefreshToken();

      if (storedRefreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
              } else if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(`${API_BASE}/auth/refresh-token`, {
            refreshToken: storedRefreshToken,
          });

          const { accessToken, refreshToken: newRefresh } = res.data;
          setActiveAuthTokens(accessToken, newRefresh);

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
          } else if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
          isRefreshing = false;

          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          return Promise.reject(refreshErr);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
