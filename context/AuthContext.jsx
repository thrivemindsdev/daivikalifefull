"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '@/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('vaugun_token') : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isServerOnline, setIsServerOnline] = useState(true);

  // Synchronize token state with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('vaugun_token', token);
    } else {
      localStorage.removeItem('vaugun_token');
    }
  }, [token]);

  // All tabs share one login: when another tab logs in as someone else or logs out, follow it.
  // Otherwise this tab keeps showing the old account while its requests go out with the new token.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== 'vaugun_token' || e.newValue === e.oldValue) return;
      if (!e.newValue) {
        setUser(null);
        setToken(null);
        return;
      }
      setLoading(true);
      setToken(e.newValue);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load user profile on startup if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setUser(result.data);
          setIsServerOnline(true);
        } else {
          // Token expired or invalid
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Backend server is offline. Running in offline/fallback mode.');
        setIsServerOnline(false);
        // Fallback to local profile during dev if offline
        const localUser = localStorage.getItem('vaugun_user_offline');
        if (localUser) {
          setUser(JSON.parse(localUser));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Register User
  const signup = async (name, emailOrPhone, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emailOrPhone, password })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Registration failed');
      }

      const userData = result.data;
      setToken(userData.token);
      setUser(userData);
      localStorage.setItem('vaugun_user_offline', JSON.stringify(userData));
      setIsServerOnline(true);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setIsServerOnline(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Login User
  const login = async (emailOrPhone, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone, password })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Invalid email or password');
      }

      const userData = result.data;
      setToken(userData.token);
      setUser(userData);
      localStorage.setItem('vaugun_user_offline', JSON.stringify(userData));
      setIsServerOnline(true);
      return { success: true, user: userData };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Send SMS OTP to a registered mobile number
  // OTP is only sent to sign up (purpose 'signup') or to reset a forgotten password (purpose 'reset')
  const sendOtp = async (phone, purpose = 'signup') => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not send OTP');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Verify the SMS OTP and finish: 'signup' creates the account (name + password), 'reset' sets a new password.
  // Either way the user is logged in.
  const loginWithOtp = async (phone, otp, { purpose = 'signup', name, password } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, purpose, password, ...(name ? { name } : {}) })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Invalid OTP');

      const userData = result.data;
      setToken(userData.token);
      setUser(userData);
      localStorage.setItem('vaugun_user_offline', JSON.stringify(userData));
      setIsServerOnline(true);
      return { success: true, user: userData };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vaugun_user_offline');
    // Dispatch custom event for a beautiful toast
    window.dispatchEvent(new CustomEvent('vaugun_logout_success'));
  };

  // Update Avatar through Cloudinary
  const updateAvatar = async (file) => {
    if (!token) return { success: false, error: 'Authentication required' };

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Avatar upload failed');
      }

      // Update user avatar locally
      setUser(prev => {
        const updated = { ...prev, avatar: result.data.avatar };
        localStorage.setItem('vaugun_user_offline', JSON.stringify(updated));
        return updated;
      });

      return { success: true, avatar: result.data.avatar };
    } catch (err) {
      console.error('Avatar upload failed:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update Profile Details (Name)
  const updateProfile = async (name) => {
    if (!token) return { success: false, error: 'Authentication required' };
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Update failed');

      setUser(prev => {
        const updated = { ...prev, name: result.data.name };
        localStorage.setItem('vaugun_user_offline', JSON.stringify(updated));
        return updated;
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update Password
  const updatePassword = async (currentPassword, newPassword) => {
    if (!token) return { success: false, error: 'Authentication required' };
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Update failed');

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      isServerOnline,
      login,
      sendOtp,
      loginWithOtp,
      logout,
      signup,
      updateAvatar,
      updateProfile,
      updatePassword,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
