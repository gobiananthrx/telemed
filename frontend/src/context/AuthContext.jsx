import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('telemed_token'));
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem('telemed_user');
    return saved ? JSON.parse(saved).role : null;
  });
  const [loading, setLoading] = useState(true);

  // Initialize and load user profile
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('telemed_token');
      const savedUser = localStorage.getItem('telemed_user');

      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setRole(parsed.role);

          // Fetch fresh profile from /api/auth/me
          const fresh = await apiClient('/auth/me');
          if (fresh) {
            const updated = {
              ...parsed,
              id: fresh.id,
              email: fresh.email,
              role: fresh.role,
              patient_profile: fresh.patient_profile,
              doctor_profile: fresh.doctor_profile,
              name: fresh.patient_profile?.full_name || fresh.doctor_profile?.full_name || fresh.email,
              uhid: fresh.patient_profile?.uhid,
              patient_id: fresh.patient_profile?.id,
              doctor_id: fresh.doctor_profile?.id
            };
            setUser(updated);
            setRole(fresh.role);
            localStorage.setItem('telemed_user', JSON.stringify(updated));
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    const data = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    localStorage.setItem('telemed_token', data.access_token);
    localStorage.setItem('telemed_user', JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    setRole(data.role);
    return data;
  };

  const adminLogin = async (identifier, password) => {
    const data = await apiClient('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    localStorage.setItem('telemed_token', data.access_token);
    localStorage.setItem('telemed_user', JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    setRole(data.role);
    return data;
  };

  const register = async (payload) => {
    return await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const verifyOTP = async (email, otp_code, purpose = 'REGISTRATION') => {
    const data = await apiClient('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code, purpose }),
    });

    localStorage.setItem('telemed_token', data.access_token);
    localStorage.setItem('telemed_user', JSON.stringify(data));
    setToken(data.access_token);
    setUser(data);
    setRole(data.role);
    return data;
  };

  const resendOTP = async (email, purpose = 'REGISTRATION') => {
    return await apiClient('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    });
  };

  const forgotPassword = async (email) => {
    return await apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const resetPassword = async (email, otp_code, new_password) => {
    return await apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code, new_password }),
    });
  };

  const logout = () => {
    localStorage.removeItem('telemed_token');
    localStorage.removeItem('telemed_user');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        login,
        adminLogin,
        register,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        logout,
        isAuthenticated: !!token,
        isPatient: role === 'PATIENT',
        isDoctor: role === 'DOCTOR',
        isAdmin: role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
