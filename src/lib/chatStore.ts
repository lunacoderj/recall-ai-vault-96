import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';
import { syncMessages, sendBackendMessage, acknowledgeMessages, type ChatMessage as BackendChatMessage } from './services';
import { useNotificationStore } from './notificationStore';
import { useUIStore } from './uiStore';
import { showFuturisticToast } from '@/components/notifications/NotificationToast';

const DB_NAME = 'recallai-chat-v2';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const SYNC_META_STORE = 'sync-meta';

export interface LocalMessage {
  id?: number;
  friendId: string;
  myUserId: string;
  sender: 'me' | 'them';
  text: string;
  type: 'text' | 'image' | 'file' | 'link';
  fileUrl?: string;
  fileName?: string;
  timestamp: number;
  localId: string;
  isBackendSynced: boolean;
}

// --- NEW REACTIVE STATE ---
interface ChatState {
  isHydrated: boolean;
  setHydrated: (val: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isHydrated: false,
  setHydrated: (val) => set({ isHydrated: val }),
}));

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('byConversation', ['myUserId', 'friendId'], { unique: false });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
          store.createIndex('byLocalId', 'localId', { unique: true });
        }
        if (!db.objectStoreNames.contains(SYNC_META_STORE)) {
          db.createObjectStore(SYNC_META_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Save a message locally.
 * Returns the message and a boolean indicating if it's NEW (actually inserted).
 */
export const saveLocalMessage = async (msg: Omit<LocalMessage, 'id'>): Promise<{ message: LocalMessage, isNew: boolean }> => {
  const db = await getDB();
  const existing = await db.getFromIndex(STORE_NAME, 'byLocalId', msg.localId);
  
  if (existing) {
    return { message: existing, isNew: false };
  }

  const id = await db.add(STORE_NAME, msg);
  return { message: { ...msg, id: id as number }, isNew: true };
};

/**
 * Get chat history for a conversation.
 */
export const getMessages = async (myUserId: string, friendId: string): Promise<LocalMessage[]> => {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE_NAME, 'byConversation', [myUserId, friendId]);
  return all.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Sync messages with the backend (Ephemeral Forward-and-Delete Logic).
 */
export const performSync = async (myUserId: string): Promise<number> => {
  const db = await getDB();
  const { isHydrated, setHydrated } = useChatStore.getState();
  
  try {
    const newMessages = await syncMessages();
    let count = 0;
    const syncedMessageIds: string[] = [];

    for (const msg of newMessages) {
      try {
        // --- CRITICAL FIX 1: CHECK IF NEW ---
        const { isNew } = await saveLocalMessage({
          friendId: msg.senderId === myUserId ? msg.receiverId : msg.senderId,
          myUserId: myUserId,
          sender: msg.senderId === myUserId ? 'me' : 'them',
          text: msg.content,
          type: msg.type as any,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          timestamp: new Date(msg.createdAt).getTime(),
          localId: msg.localId,
          isBackendSynced: true,
        });
        
        // --- CRITICAL FIX 2: ONLY NOTIFY IF HYDRATED AND NEW ---
        const activeId = useUIStore.getState().activeChatUserId;
        const isSelf = msg.senderId === myUserId;
        const isActiveChat = msg.senderId === activeId;

        if (isNew && isHydrated && !isSelf && !isActiveChat) {
           const bodyText = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
           
           // Deduplication handled in notificationStore.addNotification
           useNotificationStore.getState().addNotification({
             type: 'new_message',
             title: 'New Message',
             body: bodyText,
             actionId: msg.senderId,
             metadata: { messageId: msg.localId }
           });

           showFuturisticToast({
            type: 'new_message',
            title: 'New Message',
            body: bodyText,
            onAction: () => {
              const store = useNotificationStore.getState();
              const related = store.notifications.filter(n => n.actionId === msg.senderId && !n.isRead);
              related.forEach(n => store.markAsRead(n.id));
              window.location.href = `/friends?chat=${msg.senderId}`;
            }
          });
        }

        syncedMessageIds.push(msg.localId); 
        if (isNew) count++;
      } catch (err) {
        console.error('Failed to save message to idb:', msg.localId, err);
      }
    }

    // Acknowledge messages
    if (syncedMessageIds.length > 0) {
      try {
        await acknowledgeMessages(syncedMessageIds);
      } catch (ackErr: any) {
        console.warn('ACK failed:', ackErr?.response?.data || ackErr.message);
      }
    }

    // Mark hydrated after first successful sync attempt (even if 0 messages)
    if (!isHydrated) {
      setHydrated(true);
    }

    // 3. Push any unsynced local messages
    const allLocal = await db.getAll(STORE_NAME);
    const unsynced = allLocal.filter(m => !m.isBackendSynced && m.myUserId === myUserId && m.sender === 'me');
    
    for (const localMsg of unsynced) {
      try {
        await sendBackendMessage({
          receiverId: localMsg.friendId,
          content: localMsg.text,
          type: localMsg.type,
          fileUrl: localMsg.fileUrl,
          fileName: localMsg.fileName,
          localId: localMsg.localId,
        });
        await db.put(STORE_NAME, { ...localMsg, isBackendSynced: true });
      } catch (e) {
        console.warn('Retry send failed for', localMsg.localId);
      }
    }

    return count;
  } catch (error) {
    console.error('Chat sync failed:', error);
    // Even if it failed, we should probably allow hydration to complete
    // so we don't block the UI indefinitely, or handle it specifically.
    return 0;
  }
};

/**
 * Send a message (Local + Backend).
 */
export const sendMessage = async (
  myUserId: string, 
  friendId: string, 
  text: string, 
  type: LocalMessage['type'] = 'text',
  fileData?: { url: string; name: string }
): Promise<LocalMessage> => {
  const localId = crypto.randomUUID();
  const timestamp = Date.now();

  const msgData: Omit<LocalMessage, 'id'> = {
    myUserId,
    friendId,
    sender: 'me',
    text,
    type,
    fileUrl: fileData?.url,
    fileName: fileData?.name,
    timestamp,
    localId,
    isBackendSynced: false,
  };

  const { message: saved } = await saveLocalMessage(msgData);

  try {
    await sendBackendMessage({
      receiverId: friendId,
      content: text,
      type,
      fileUrl: fileData?.url,
      fileName: fileData?.name,
      localId,
    });
    
    const db = await getDB();
    await db.put(STORE_NAME, { ...saved, isBackendSynced: true });
  } catch (err) {
    console.warn('Failed to send message to backend, will retry on next sync', err);
  }

  return saved;
};

export const clearChat = async (myUserId: string, friendId: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('byConversation');
  const keys = await index.getAllKeys([myUserId, friendId]);
  for (const key of keys) {
    store.delete(key);
  }
  await tx.done;
};
