import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'recallai_vault';
const STORE_NAME = 'keys';

export interface VaultKey {
  userId: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeySpki: string;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase>;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      },
    });
  }
  return dbPromise;
}

export async function saveVaultKeyPair(keyData: VaultKey) {
  const db = await getDB();
  await db.put(STORE_NAME, keyData);
}

export async function getVaultKeyPair(userId: string): Promise<VaultKey | undefined> {
  const db = await getDB();
  return await db.get(STORE_NAME, userId);
}

export async function clearVaultKeys() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
