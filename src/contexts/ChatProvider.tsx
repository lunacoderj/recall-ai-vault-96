import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { performSync, type LocalMessage } from '@/lib/chatStore';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

interface ChatContextType {
  lastSyncCount: number;
  lastSyncTrigger: number;
  isSyncing: boolean;
  manualSync: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncCount, setLastSyncCount] = useState(0);
  const [lastSyncTrigger, setLastSyncTrigger] = useState(Date.now());
  const location = useLocation();

  const sync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const count = await performSync(user._id);
      setLastSyncCount(count);
      setLastSyncTrigger(Date.now());
      
      if (count > 0 && !location.pathname.includes('/friends')) {
        toast.info(`You have ${count} new message${count > 1 ? 's' : ''}`, {
          description: "Check your friends tab to reply.",
          action: {
            label: "View Chat",
            onClick: () => window.location.href = '/friends'
          }
        });
      }
    } catch (err) {
      console.error("BG Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;

    // Initial sync
    sync();

    // Poll every 10 seconds for new messages
    const interval = setInterval(sync, 10000);

    return () => clearInterval(interval);
  }, [user, sync]);

  return (
    <ChatContext.Provider value={{
      lastSyncCount,
      lastSyncTrigger,
      isSyncing,
      manualSync: sync
    }}>
      {children}
    </ChatContext.Provider>
  );
};
