import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

const API = process.env.REACT_APP_BACKEND_URL || '';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('token');
      if (!saved) { setLoading(false); return; }
      setToken(saved);
      try {
        const { data } = await axios.get(`${API}/api/auth/me`);
        setUser(data);
      } catch (e) {
        if (e.response?.status === 401) {
          try {
            const { data } = await axios.post(`${API}/api/auth/auto-login`, { token: saved });
            setToken(data.token);
            setUser(data.user);
          } catch { setToken(null); }
        } else { setToken(null); }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await axios.post(`${API}/api/auth/register`, payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => { setToken(null); setUser(null); };

  const updateUser = (u) => setUser(u);

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}
