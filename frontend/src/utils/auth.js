import { supabase } from '../lib/supabase';

// Get token from localStorage (for backward compatibility)
export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// Get user from localStorage
export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem('user');
};

// Logout
export const logout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
    removeUser();
    window.location.href = '/login';
  }
};

// Get auth headers for API calls
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Check if session is valid
export const isAuthenticated = () => {
  const token = getToken();
  const user = getUser();
  return !!(token && user);
};

// Get current session from Supabase
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    return null;
  }
  return session;
};

// Refresh session token
export const refreshSession = async () => {
  const { data: { session }, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error('Refresh session error:', error);
    return null;
  }
  if (session) {
    setToken(session.access_token);
  }
  return session;
};
