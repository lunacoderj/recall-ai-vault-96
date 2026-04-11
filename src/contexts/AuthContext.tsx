import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateApiKey: (key: string) => void;
  getApiKey: () => string | null;
  hasApiKey: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("recallai_user");
    if (stored) setUser(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const u: User = { id: "1", email, name: email.split("@")[0] };
    localStorage.setItem("recallai_user", JSON.stringify(u));
    setUser(u);
    setIsLoading(false);
  };

  const signup = async (email: string, _password: string, name: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const u: User = { id: "1", email, name };
    localStorage.setItem("recallai_user", JSON.stringify(u));
    setUser(u);
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const u: User = { id: "1", email: "user@gmail.com", name: "Google User", avatar: "" };
    localStorage.setItem("recallai_user", JSON.stringify(u));
    setUser(u);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("recallai_user");
    setUser(null);
  };

  const updateApiKey = (key: string) => {
    localStorage.setItem("recallai_api_key", key);
  };

  const getApiKey = () => localStorage.getItem("recallai_api_key");
  const hasApiKey = () => !!localStorage.getItem("recallai_api_key");

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginWithGoogle, logout, updateApiKey, getApiKey, hasApiKey }}>
      {children}
    </AuthContext.Provider>
  );
};
