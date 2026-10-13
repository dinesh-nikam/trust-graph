import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, UserResponse } from '../services/api';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; username?: string }) => Promise<void>;
  logout: () => Promise<void>;
  linkWallet: (address: string, signMessageAsync: (args: { message: string }) => Promise<string>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    if (res.success && res.user) {
      setUser(res.user);
    }
  };

  const register = async (payload: { name: string; email: string; password: string; username?: string }) => {
    const res = await api.auth.register(payload);
    if (res.success && res.user) {
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  const linkWallet = async (
    address: string,
    signMessageAsync: (args: { message: string }) => Promise<string>
  ) => {
    // 1. Request nonce message from backend
    const nonceRes = await api.auth.getWalletNonce();
    if (!nonceRes.success || !nonceRes.messageToSign) {
      throw new Error('Failed to obtain wallet authentication nonce from server');
    }

    // 2. Request EIP-191 personal sign from connected wallet
    const signature = await signMessageAsync({ message: nonceRes.messageToSign });

    // 3. Send signature and address to backend for verification and association
    const linkRes = await api.auth.linkWallet({ address, signature });
    if (linkRes.success && linkRes.user) {
      setUser(linkRes.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        linkWallet,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
