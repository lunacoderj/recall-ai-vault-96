import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import api from "@/lib/api";

import { generateVaultKeys, exportPublicKey } from "@/lib/crypto";
import { saveVaultKeyPair, getVaultKeyPair } from "@/lib/idb";

interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  name: string;
  publicKey?: string;
  hasGeminiKey?: boolean;
  hasOpenRouterKey?: boolean;
  hasSupadataKey?: boolean;
  hasRapidApiKey?: boolean;
  aiProvider?: 'gemini' | 'openrouter' | 'openai';
  authProvider?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateApiKey: (apiKey: string, provider: 'gemini' | 'openrouter' | 'supadata' | 'rapidapi') => Promise<void>;
  hasGeminiKey: boolean;
  hasSupadataKey: boolean;
  hasRapidApiKey: boolean;
  ensureVaultKeys: (userId: string) => Promise<void>;
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

  const ensureVaultKeys = useCallback(async (userId: string) => {
    try {
      const existing = await getVaultKeyPair(userId);
      if (!existing) {
        console.log("[VAULT] Generating new E2EE keys...");
        const keyPair = await generateVaultKeys();
        const publicKeySpki = await exportPublicKey(keyPair.publicKey);
        
        await saveVaultKeyPair({
          userId,
          privateKey: keyPair.privateKey,
          publicKey: keyPair.publicKey,
          publicKeySpki,
          createdAt: Date.now()
        });

        // Push to backend
        await api.post("/user/public-key", { publicKey: publicKeySpki });
        console.log("[VAULT] Keys registered successfully.");
      } else {
        console.log("[VAULT] Session authenticated with existing hardware-bound keys.");
      }
    } catch (err) {
      console.error("[VAULT] Cryptographic initialization failed:", err);
    }
  }, []);

  const exchangeToken = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const { data } = await api.post("/auth/firebase", { idToken });
      
      if (data.success) {
        const { user: backendUser, accessToken, refreshToken } = data.data;
        
        localStorage.setItem("recallai_user", JSON.stringify(backendUser));
        localStorage.setItem("recallai_access_token", accessToken);
        localStorage.setItem("recallai_refresh_token", refreshToken);
        
        // Zero-Knowledge Hook
        await ensureVaultKeys(backendUser._id);
        
        setUser(backendUser);
        return backendUser;
      }
    } catch (error) {
      console.error("Token exchange failed:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("recallai_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem("recallai_user");
      }
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (!localStorage.getItem("recallai_access_token")) {
           try {
             await exchangeToken(fbUser);
           } catch (err) {
             console.error("Failed to recover session", err);
           }
        }
      } else {
        setUser(null);
        localStorage.removeItem("recallai_user");
        localStorage.removeItem("recallai_access_token");
        localStorage.removeItem("recallai_refresh_token");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [exchangeToken]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      await exchangeToken(userCredential.user);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      await exchangeToken(userCredential.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await exchangeToken(result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
      await signOut(auth);
    } finally {
      setIsLoading(false);
    }
  };

  const updateApiKey = async (apiKey: string, provider: 'gemini' | 'openrouter' | 'supadata' | 'rapidapi' = "gemini") => {
    const { data } = await api.post("/user/api-key", { apiKey, provider });
    if (data.success) {
      const profileResult = await api.get("/user/profile");
      if (profileResult.data.success) {
        const updatedUser = profileResult.data.data;
        localStorage.setItem("recallai_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      signup, 
      loginWithGoogle, 
      logout,
      updateApiKey,
      ensureVaultKeys,
      hasGeminiKey: !!user?.hasGeminiKey,
      hasSupadataKey: !!user?.hasSupadataKey,
      hasRapidApiKey: !!user?.hasRapidApiKey
    }}>
      {children}
    </AuthContext.Provider>
  );
};
