import type {
  AuthTokens,
  LoginBody,
  PublicUser,
  RegisterBody,
  VerifyOtpBody,
} from '@sams/shared';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import {
  getAuthToken,
  getStoredUser,
  removeAuthToken,
  removeStoredUser,
  saveAuthToken,
  saveStoredUser,
} from '../storage/token';

interface AuthContextType {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginBody) => Promise<PublicUser>;
  register: (data: RegisterBody) => Promise<{ devOtp?: string; message: string }>;
  verifyOtp: (data: VerifyOtpBody) => Promise<PublicUser>;
  resendOtp: (email: string) => Promise<{ devOtp?: string; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await getAuthToken();
        const storedUser = await getStoredUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Verify token validity with server
          try {
            const res = await apiClient.get<{ success: boolean; data: { user: PublicUser } }>(
              '/auth/me',
            );
            if (res.data?.success && res.data.data?.user) {
              setUser(res.data.data.user);
              await saveStoredUser(res.data.data.user);
            }
          } catch {
            // Token might be expired or server unreachable, clear session
            await removeAuthToken();
            await removeStoredUser();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAuth();
  }, []);

  const login = async (credentials: LoginBody): Promise<PublicUser> => {
    const res = await apiClient.post<{ success: boolean; data: AuthTokens }>(
      '/auth/login',
      credentials,
    );
    const { accessToken, user: loggedInUser } = res.data.data;
    await saveAuthToken(accessToken);
    await saveStoredUser(loggedInUser);
    setToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (
    data: RegisterBody,
  ): Promise<{ devOtp?: string; message: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { message: string; devOtp?: string };
    }>('/auth/register', data);
    return res.data.data;
  };

  const verifyOtp = async (data: VerifyOtpBody): Promise<PublicUser> => {
    const res = await apiClient.post<{ success: boolean; data: AuthTokens }>(
      '/auth/verify-otp',
      data,
    );
    const { accessToken, user: verifiedUser } = res.data.data;
    await saveAuthToken(accessToken);
    await saveStoredUser(verifiedUser);
    setToken(accessToken);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const resendOtp = async (
    email: string,
  ): Promise<{ devOtp?: string; message: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { message: string; devOtp?: string };
    }>('/auth/resend-otp', { email });
    return res.data.data;
  };

  const logout = async (): Promise<void> => {
    await removeAuthToken();
    await removeStoredUser();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    const res = await apiClient.get<{ success: boolean; data: { user: PublicUser } }>('/auth/me');
    if (res.data?.success && res.data.data?.user) {
      setUser(res.data.data.user);
      await saveStoredUser(res.data.data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
