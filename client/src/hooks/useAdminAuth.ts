import { useState, useEffect } from 'react';
import { apiCall } from '../lib/config';

interface AdminUser {
  id: number;
  username: string;
}

// JWT Token management  
const TOKEN_KEY = 'adminToken';

const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Helper to create authenticated headers
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = getToken();
      if (!token) {
        setAdminUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const response = await apiCall('/api/admin/me', {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const userData = await response.json();
        setAdminUser(userData);
        setIsAuthenticated(true);
      } else {
        // Token invalid, remove it
        removeToken();
        setAdminUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      removeToken();
      setAdminUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiCall('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Save JWT token
        setToken(data.token);
        setAdminUser(data.admin);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // No need to call server logout for JWT
      removeToken();
      setAdminUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    adminUser,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
    getAuthHeaders, // Export for use in other components
  };
}