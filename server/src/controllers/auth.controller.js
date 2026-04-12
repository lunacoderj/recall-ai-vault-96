const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebase');
const logger = require('../config/logger');

// ─── Token Helpers ───────────────────────────────────
const generateAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

// ════════════════════════════════════════════════════
// POST /api/auth/firebase
//
// Single endpoint for ALL Firebase auth methods:
//   • Email + Password
//   • Google Sign-In
//   • Any other Firebase provider
//
// Frontend flow:
//   1. User logs in / signs up via Firebase client SDK
//   2. Frontend calls firebase.auth().currentUser.getIdToken()
//   3. Frontend POSTs { idToken } here
//   4. Backend verifies, upserts user in MongoDB, returns JWT pair
// ════════════════════════════════════════════════════
const firebaseAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // ─── Verify with Firebase Admin ──────────────────
    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Firebase token.',
        code: 'INVALID_FIREBASE_TOKEN',
      });
    }

    const {
      uid: firebaseUid,
      email,
      name,
      picture,
      firebase: { sign_in_provider: authProvider },
      email_verified: emailVerified,
    } = decoded;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token does not contain an email address.',
        code: 'NO_EMAIL',
      });
    }

    // ─── Upsert user in MongoDB ───────────────────────
    // Try by firebaseUid first. If no match, fall back to email
    // to handle cases where the same email was registered via
    // a different auth provider (e.g. email/password then Google).
    let user = await User.findOne({ firebaseUid });

    if (!user) {
      // Check if a user with this email already exists (different provider)
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (user) {
      // Update existing user — link the (possibly new) firebaseUid
      user.firebaseUid = firebaseUid;
      user.email = email.toLowerCase();
      user.emailVerified = emailVerified || false;
      user.authProvider = authProvider || 'unknown';
      // Update avatar/name only if they were empty
      if (!user.name) user.name = name || email.split('@')[0];
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    } else {
      // Brand-new user
      user = await User.create({
        firebaseUid,
        email: email.toLowerCase(),
        emailVerified: emailVerified || false,
        authProvider: authProvider || 'unknown',
        name: name || email.split('@')[0],
        avatar: picture || '',
      });
    }

    // ─── Issue our own JWT pair ───────────────────────
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    const isNewUser = user.createdAt.getTime() === user.updatedAt.getTime();
    logger.info(
      `Firebase auth [${authProvider}]: ${email} (${isNewUser ? 'new' : 'returning'})`
    );

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully.' : 'Login successful.',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// POST /api/auth/refresh-token
// ════════════════════════════════════════════════════
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token does not match. Please log in again.',
        code: 'REFRESH_TOKEN_MISMATCH',
      });
    }

    // Rotate both tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// POST /api/auth/logout
// ════════════════════════════════════════════════════
const logout = async (req, res, next) => {
  try {
    // Invalidate the stored refresh token
    await User.findByIdAndUpdate(req.userId, { refreshToken: null });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { firebaseAuth, refreshToken, logout };
