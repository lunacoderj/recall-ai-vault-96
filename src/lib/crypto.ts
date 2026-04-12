/**
 * RecallAI Zero-Knowledge Cryptography Module
 * Implements Asymmetric E2EE using Web Crypto API (ECDH + AES-256-GCM)
 */

const KEY_ALGO = {
  name: "ECDH",
  namedCurve: "P-256",
};

const ENCRYPT_ALGO = "AES-GCM";

/**
 * Generates a new ECDH key pair for the user.
 * Returns the non-extractable private key and the public key for export.
 */
export async function generateVaultKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
    KEY_ALGO,
    false, // Private key NOT extractable (stays in IndexedDB memory)
    ["deriveKey", "deriveBits"]
  );
  return keyPair;
}

/**
 * Exports a public key to SPKI format (Base64) for backend storage.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Imports a recipient's public key from SPKI Base64.
 */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(spkiBase64), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    KEY_ALGO,
    true,
    []
  );
}

/**
 * Derives a shared secret between two users.
 */
export async function deriveSharedKey(myPrivateKey: CryptoKey, theirPublicKey: CryptoKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    myPrivateKey,
    {
      name: ENCRYPT_ALGO,
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using a derived shared key.
 */
export async function encryptMessage(plaintext: string, sharedKey: CryptoKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: ENCRYPT_ALGO,
      iv: iv,
    },
    sharedKey,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypts a ciphertext using a derived shared key.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<string> {
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ENCRYPT_ALGO,
      iv: iv,
    },
    sharedKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Local Vault: Encrypts data for YOURSELF using your own public key.
 * Used for local storage encryption of BYOK keys.
 */
export async function encryptForSelf(plaintext: string, myPrivateKey: CryptoKey, myPublicKey: CryptoKey) {
  const sharedKey = await deriveSharedKey(myPrivateKey, myPublicKey);
  return await encryptMessage(plaintext, sharedKey);
}
