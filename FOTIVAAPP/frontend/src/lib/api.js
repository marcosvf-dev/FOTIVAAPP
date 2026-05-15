import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || '',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (response?.status === 401) {
      const code = response.data?.code;
      if (code === 'TOKEN_REVOKED') {
        localStorage.removeItem('token');
        window.location.href = '/login?reason=session_expired';
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Render acordando (503) — tenta 1x após 3s
    if (response?.status === 503 && !config._retry) {
      config._retry = true;
      await new Promise(r => setTimeout(r, 3000));
      return api(config);
    }

    if (response?.status === 429) {
      const err = new Error('Muitas requisições. Aguarde um momento.');
      err.isRateLimit = true;
      return Promise.reject(err);
    }

    return Promise.reject(error);
  }
);

export default api;
