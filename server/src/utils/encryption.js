const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.AES_ENCRYPTION_KEY;

/**
 * Encrypt a plaintext string using AES-256.
 * @param {string} plainText
 * @returns {string} ciphertext
 */
const encrypt = (plainText) => {
  if (!ENCRYPTION_KEY) {
    throw new Error('AES_ENCRYPTION_KEY is not configured');
  }
  return CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY).toString();
};

/**
 * Decrypt an AES-256 ciphertext back to plaintext.
 * @param {string} cipherText
 * @returns {string} plaintext
 */
const decrypt = (cipherText) => {
  if (!ENCRYPTION_KEY) {
    throw new Error('AES_ENCRYPTION_KEY is not configured');
  }
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('Decryption failed — invalid key or corrupted data');
  }
  return decrypted;
};

module.exports = { encrypt, decrypt };
