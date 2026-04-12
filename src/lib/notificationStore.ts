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
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'byCreatedAt');
    const sorted = ([...all] as Notification[]).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const unread = sorted.filter(n => !n.isRead).length;

    set({ notifications: sorted, unreadCount: unread, isLoaded: true, selectedIds: [] });
  },

  addNotification: async (data) => {
    const db = await getDB();
    
    // --- DEDUPLICATION LOGIC ---
    // 1. Check local state
    const { notifications } = get();
    if (data.metadata?.messageId) {
      const stateExists = notifications.some(n => n.metadata?.messageId === data.metadata?.messageId);
      if (stateExists) return;
      
      // 2. Double check DB (just in case state isn't hydrated yet)
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

    await db.add(STORE_NAME, newNotif);
    
    set({ 
      notifications: [newNotif, ...notifications],
      unreadCount: get().unreadCount + 1 
    });
  },


  markAsRead: async (id) => {
    const db = await getDB();
    const notif = await db.get(STORE_NAME, id);
    if (notif && !notif.isRead) {
      notif.isRead = true;
      await db.put(STORE_NAME, notif);
      
      const newNotifs = get().notifications.map(n => n.id === id ? notif : n);
      set({ 
        notifications: newNotifs,
        unreadCount: Math.max(0, get().unreadCount - 1)
      });
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

    const newNotifs = get().notifications.map(n => ({ ...n, isRead: true }));
    set({ notifications: newNotifs, unreadCount: 0 });
  },

  deleteNotification: async (id) => {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
    
    const notif = get().notifications.find(n => n.id === id);
    const newNotifs = get().notifications.filter(n => n.id !== id);
    const newSelected = get().selectedIds.filter(sid => sid !== id);
    
    set({ 
      notifications: newNotifs,
      selectedIds: newSelected,
      unreadCount: (notif && !notif.isRead) ? Math.max(0, get().unreadCount - 1) : get().unreadCount
    });
  },

  toggleSelect: (id) => {
    const current = get().selectedIds;
    if (current.includes(id)) {
      set({ selectedIds: current.filter(sid => sid !== id) });
    } else {
      set({ selectedIds: [...current, id] });
    }
  },

  selectAll: () => {
    const allIds = get().notifications.map(n => n.id);
    set({ selectedIds: allIds });
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

    const remaining = notifications.filter(n => !selectedIds.includes(n.id));
    const unread = remaining.filter(n => !n.isRead).length;

    set({ 
      notifications: remaining,
      selectedIds: [],
      unreadCount: unread
    });
  },

  markSelectedAsRead: async () => {
    const { selectedIds, notifications } = get();
    if (selectedIds.length === 0) return;

    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    
    const updatedNotifs = notifications.map(n => {
      if (selectedIds.includes(n.id) && !n.isRead) {
        const updated = { ...n, isRead: true };
        tx.store.put(updated);
        return updated;
      }
      return n;
    });

    await tx.done;
    const unread = updatedNotifs.filter(n => !n.isRead).length;

    set({ 
      notifications: updatedNotifs,
      unreadCount: unread
    });
  }
}));
