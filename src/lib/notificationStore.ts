import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'recallai-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

export interface Notification {
  id: string;
  type: 'friend_request' | 'new_message' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionId?: string; // e.g. senderId or requestId
  metadata?: {
    messageId?: string; // Used for deduplication
    [key: string]: any;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean;
  selectedIds: string[];
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  
  // Bulk Actions
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  deleteSelected: () => Promise<void>;
  markSelectedAsRead: () => Promise<void>;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('byCreatedAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoaded: false,
  selectedIds: [],

  loadNotifications: async () => {
    // Only load if not already loaded to prevent overwriting new, live-synced data
    if (get().isLoaded) return;

    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'byCreatedAt');
    const sorted = ([...all] as Notification[]).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const unread = sorted.filter(n => !n.isRead).length;

    set({ 
      notifications: sorted, 
      unreadCount: unread, 
      isLoaded: true, 
      selectedIds: [] 
    });
  },

  addNotification: async (data) => {
    const db = await getDB();
    
    // 1. DEDUPLICATION (State + DB Check)
    const { notifications, unreadCount } = get();
    if (data.metadata?.messageId) {
      const stateExists = notifications.some(n => n.metadata?.messageId === data.metadata?.messageId);
      if (stateExists) return;
      
      const allNotifs = await db.getAll(STORE_NAME);
      const dbExists = allNotifs.some((n: any) => n.metadata?.messageId === data.metadata?.messageId);
      if (dbExists) return;
    }

    const newNotif: Notification = {
      ...data,
      id: crypto.randomUUID(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // 2. Persist to DB
    await db.add(STORE_NAME, newNotif);
    
    // 3. --- REHAVE REACTIVELY WITH IMMUTABLE UPDATES ---
    // This triggers re-renders in all subscribed components (Dropdown, Bell, etc.)
    set((state) => ({ 
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1 
    }));
  },

  markAsRead: async (id) => {
    const db = await getDB();
    const notif = await db.get(STORE_NAME, id);
    if (notif && !notif.isRead) {
      notif.isRead = true;
      await db.put(STORE_NAME, notif);
      
      set((state) => ({ 
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    }
  },

  markAllAsRead: async () => {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    
    for (const n of all) {
      if (!n.isRead) {
        n.isRead = true;
        await tx.store.put(n);
      }
    }
    await tx.done;

    set((state) => ({ 
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0 
    }));
  },

  deleteNotification: async (id) => {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
    
    const wasUnread = get().notifications.find(n => n.id === id && !n.isRead);
    
    set((state) => ({ 
      notifications: state.notifications.filter(n => n.id !== id),
      selectedIds: state.selectedIds.filter(sid => sid !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    }));
  },

  toggleSelect: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id) 
        ? state.selectedIds.filter(sid => sid !== id) 
        : [...state.selectedIds, id]
    }));
  },

  selectAll: () => {
    set((state) => ({ 
      selectedIds: state.notifications.map(n => n.id) 
    }));
  },

  deselectAll: () => {
    set({ selectedIds: [] });
  },

  deleteSelected: async () => {
    const { selectedIds, notifications } = get();
    if (selectedIds.length === 0) return;

    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const id of selectedIds) {
      await tx.store.delete(id);
    }
    await tx.done;

    set((state) => {
      const remaining = state.notifications.filter(n => !state.selectedIds.includes(n.id));
      return { 
        notifications: remaining,
        selectedIds: [],
        unreadCount: remaining.filter(n => !n.isRead).length
      };
    });
  },

  markSelectedAsRead: async () => {
    const { selectedIds, notifications } = get();
    if (selectedIds.length === 0) return;

    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    
    for (const id of selectedIds) {
      const notif = notifications.find(n => n.id === id);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        await tx.store.put(notif);
      }
    }
    await tx.done;

    set((state) => {
      const updated = state.notifications.map(n => 
        state.selectedIds.includes(n.id) ? { ...n, isRead: true } : n
      );
      return { 
        notifications: updated,
        unreadCount: updated.filter(n => !n.isRead).length
      };
    });
  }
}));
