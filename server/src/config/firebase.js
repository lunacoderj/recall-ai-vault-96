const admin = require('firebase-admin');
const logger = require('../config/logger');

let initialized = false;

/**
 * Initialize Firebase Admin SDK (singleton).
 * Supports both a service account JSON file path and individual env vars.
 */
const initializeFirebase = () => {
  if (initialized || admin.apps.length > 0) return;

  try {
    // ── Option A: full service account JSON path ──────
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

    // ── Option B: individual env vars (recommended for Docker / CI) ──
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in private key (common Docker gotcha)
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });

    } else {
      throw new Error(
        'Firebase not configured. Set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env'
      );
    }

    initialized = true;
    logger.info('✅ Firebase Admin SDK initialized');
  } catch (err) {
    logger.error('❌ Firebase Admin init failed:', err.message);
    throw err;
  }
};

/**
 * Verify a Firebase ID token and return the decoded token payload.
 * @param {string} idToken
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
const verifyFirebaseToken = async (idToken) => {
  initializeFirebase();
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { verifyFirebaseToken, initializeFirebase };
