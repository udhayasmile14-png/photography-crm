import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  studioId: string | null;
  studioName: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerStudio: (name: string, email: string, password: string, studioName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [studioId, setStudioId] = useState<string | null>(null);
  const [studioName, setStudioName] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user session already exists in localStorage
    const savedToken = localStorage.getItem('token');
    const savedStudioId = localStorage.getItem('studio_id');
    const savedStudioName = localStorage.getItem('studio_name');
    const savedUserName = localStorage.getItem('user_name');

    if (savedToken) {
      setToken(savedToken);
      setStudioId(savedStudioId);
      setStudioName(savedStudioName);
      setUserName(savedUserName);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Construct OAuth2 Form Data for FastAPI
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Login failed. Please verify your credentials.');
    }

    const data = await response.json();
    
    // Save to LocalStorage
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('studio_id', data.studio_id);
    localStorage.setItem('studio_name', data.studio_name);
    localStorage.setItem('user_name', data.user_name);

    // Update state
    setToken(data.access_token);
    setStudioId(data.studio_id);
    setStudioName(data.studio_name);
    setUserName(data.user_name);
  };

  const registerStudio = async (name: string, email: string, password: string, studioName: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
        studio_name: studioName,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Registration failed. Try a different email.');
    }

    // After registering, immediately log the user in
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studio_id');
    localStorage.removeItem('studio_name');
    localStorage.removeItem('user_name');

    setToken(null);
    setStudioId(null);
    setStudioName(null);
    setUserName(null);
  };

  const value = {
    token,
    studioId,
    studioName,
    userName,
    isAuthenticated: !!token,
    isLoading,
    login,
    registerStudio,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
