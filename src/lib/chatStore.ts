import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';
import { 
  syncMessages, 
  sendBackendMessage, 
  acknowledgeMessages, 
  markMessagesAsSeen as sendSeenReceipt,
  getNewReceipts,
  acknowledgeReceipts,
  type ChatMessage as BackendChatMessage 
} from './services';
import { useNotificationStore } from './notificationStore';
import { useUIStore } from './uiStore';
import { showFuturisticToast } from '@/components/notifications/NotificationToast';
import { 
  importPublicKey, 
  deriveSharedKey, 
  encryptMessage, 
  decryptMessage 
} from './crypto';
import { getVaultKeyPair } from './idb';

const DB_NAME = 'recallai-chat-v2';
const DB_VERSION = 2; // Bumped for 'status' field
const STORE_NAME = 'messages';

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
  status: 'sent' | 'delivered' | 'seen';
}

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
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('byConversation', ['myUserId', 'friendId'], { unique: false });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
          store.createIndex('byLocalId', 'localId', { unique: true });
        }
        if (!db.objectStoreNames.contains('friends')) {
          db.createObjectStore('friends', { keyPath: '_id' });
        }
        // Migration for version 2
        if (oldVersion < 2) {
          // If we had existing data, we'd iterate and add default status
          // But for this MERN setup, we'll just assume new objects get it.
        }
      },
    });
  }
  return dbPromise;
};

export const saveLocalMessage = async (msg: Omit<LocalMessage, 'id'>): Promise<{ message: LocalMessage, isNew: boolean }> => {
  const db = await getDB();
  const existing = await db.getFromIndex(STORE_NAME, 'byLocalId', msg.localId);
  
  if (existing) {
    return { message: existing, isNew: false };
  }

  const id = await db.add(STORE_NAME, msg);
  return { message: { ...msg, id: id as number }, isNew: true };
};

export const getMessages = async (myUserId: string, friendId: string): Promise<LocalMessage[]> => {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE_NAME, 'byConversation', [myUserId, friendId]);
  return all.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Mark all unread messages from a specific friend as 'seen'
 */
export const markChatAsSeen = async (myUserId: string, friendId: string) => {
  const db = await getDB();
  const messages = await db.getAllFromIndex(STORE_NAME, 'byConversation', [myUserId, friendId]);
  
  const unreadFromThem = messages.filter(m => m.sender === 'them' && m.status !== 'seen');
  if (unreadFromThem.length === 0) return;

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const localIds = unreadFromThem.map(m => {
    store.put({ ...m, status: 'seen' });
    return m.localId;
  });

  await tx.done;

  // Push seen status to backend for the sender to see
  try {
    await sendSeenReceipt(localIds, friendId);
  } catch (e) {
    console.warn('Failed to push seen receipts, will retry later? (Logic not implemented yet)');
  }
};

/**
 * Enhanced Sync logic with Read Receipts
 */
export const performSync = async (myUserId: string): Promise<number> => {
  const db = await getDB();
  const { isHydrated, setHydrated } = useChatStore.getState();
  
  try {
    // 1. Pull New Messages
    const newMessages = await syncMessages();
    let count = 0;
    const syncedMessageIds: string[] = [];

    for (const msg of newMessages) {
      try {
        let decryptedText = '[Encrypted Message]';
        
        // ─── E2EE Decryption Layer ─────────────────────
        try {
          const myKeys = await getVaultKeyPair(myUserId);
          if (myKeys && msg.ciphertext && msg.iv) {
            // In a real app, we fetch the sender's public key if not provided
            // For now, we assume the backend sends it or we fetch it from friends list
            // Optimization: Cache imported keys
            const friends = await db.getAll('friends'); // Hypothetical friend store
            const sender = friends.find(f => f._id === msg.senderId);
            
            if (sender?.publicKey) {
               const theirPubKey = await importPublicKey(sender.publicKey);
               const sharedKey = await deriveSharedKey(myKeys.privateKey, theirPubKey);
               decryptedText = await decryptMessage(msg.ciphertext, msg.iv, sharedKey);
            } else {
               decryptedText = "🔒 User hasn't shared E2EE keys yet.";
            }
          }
        } catch (decryptErr) {
          console.error("Decryption failed for message", msg.localId, decryptErr);
          decryptedText = "⚠️ Decryption error (corrupted payload)";
        }

        const { isNew } = await saveLocalMessage({
          friendId: msg.senderId === myUserId ? msg.receiverId : msg.senderId,
          myUserId: myUserId,
          sender: msg.senderId === myUserId ? 'me' : 'them',
          text: decryptedText,
          type: msg.type as any,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          timestamp: new Date(msg.createdAt).getTime(),
          localId: msg.localId,
          isBackendSynced: true,
          status: msg.senderId === myUserId ? 'sent' : 'delivered'
        });
        
        const activeId = useUIStore.getState().activeChatUserId;
        const isSelf = msg.senderId === myUserId;
        const isActiveChat = msg.senderId === activeId;

        if (isNew && isHydrated && !isSelf && !isActiveChat) {
           const bodyText = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
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
              window.location.href = `/friends?chat=${msg.senderId}`;
            }
          });
        }

        if (msg.localId) {
          syncedMessageIds.push(msg.localId);
        }
        if (isNew) count++;
      } catch (err) {
        console.error('Failed to save message to idb:', msg.localId, err);
      }
    }

    if (syncedMessageIds.length > 0) {
      await acknowledgeMessages(syncedMessageIds);
    }

    // 2. Pull Read Receipts (Seen status from others)
    const newReceipts = await getNewReceipts();
    if (newReceipts.length > 0) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const receiptIdsToAck: string[] = [];

      for (const receipt of newReceipts) {
        const msg = await store.index('byLocalId').get(receipt.messageLocalId);
        if (msg) {
          await store.put({ ...msg, status: 'seen' });
        }
        receiptIdsToAck.push(receipt._id);
      }
      await tx.done;
      await acknowledgeReceipts(receiptIdsToAck);
    }

    if (!isHydrated) setHydrated(true);

    // 3. Push unsynced messages
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
        await db.put(STORE_NAME, { ...localMsg, isBackendSynced: true, status: 'sent' });
      } catch (e) {
        console.warn('Retry send failed for', localMsg.localId);
      }
    }

    return count;
  } catch (error) {
    console.error('Chat sync failed:', error);
    return 0;
  }
};

export const sendMessage = async (
  myUserId: string, 
  friendId: string, 
  text: string, 
  friendPublicKey: string, // REQUIRED for E2EE
  type: LocalMessage['type'] = 'text',
  fileData?: { url: string; name: string }
): Promise<LocalMessage> => {
  const localId = crypto.randomUUID();
  const timestamp = Date.now();

  // ─── E2EE Encryption Layer ─────────────────────
  let ciphertext = '';
  let iv = '';
  
  try {
    const myKeys = await getVaultKeyPair(myUserId);
    if (!myKeys) throw new Error("Local vault keys not found. Re-sync required.");
    
    const theirPubKey = await importPublicKey(friendPublicKey);
    const sharedKey = await deriveSharedKey(myKeys.privateKey, theirPubKey);
    const encrypted = await encryptMessage(text, sharedKey);
    
    ciphertext = encrypted.ciphertext;
    iv = encrypted.iv;
  } catch (err) {
    console.error("[VAULT] Encryption failed:", err);
    throw new Error("Unable to secure message. E2EE failure.");
  }

  const msgData: Omit<LocalMessage, 'id'> = {
    myUserId,
    friendId,
    sender: 'me',
    text, // Store decrypted locally for UI
    type,
    fileUrl: fileData?.url,
    fileName: fileData?.name,
    timestamp,
    localId,
    isBackendSynced: false,
    status: 'sent'
  };

  const { message: saved } = await saveLocalMessage(msgData);

  try {
    await sendBackendMessage({
      receiverId: friendId,
      ciphertext,
      iv,
      type,
      fileUrl: fileData?.url,
      fileName: fileData?.name,
      localId,
    });
    
    const db = await getDB();
    await db.put(STORE_NAME, { ...saved, isBackendSynced: true });
  } catch (err) {
    console.warn('Offline send', err);
  }

  return saved;
};

export const syncFriendsLocally = async (friends: any[]) => {
  const db = await getDB();
  const tx = db.transaction('friends', 'readwrite');
  const store = tx.objectStore('friends');
  await store.clear();
  for (const f of friends) {
    await store.add(f);
  }
  await tx.done;
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
