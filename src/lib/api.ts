import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5051/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('recallai_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('recallai_refresh_token');
      
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          
          if (data.success) {
            const { accessToken, refreshToken: newRefreshToken } = data.data;
            localStorage.setItem('recallai_access_token', accessToken);
            localStorage.setItem('recallai_refresh_token', newRefreshToken);
            
            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Force logout on refresh error
          localStorage.removeItem('recallai_access_token');
          localStorage.removeItem('recallai_refresh_token');
          localStorage.removeItem('recallai_user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
