const User = require('../models/User');
const { encrypt } = require('../utils/encryption');
const logger = require('../config/logger');

// ════════════════════════════════════════════════════
// POST /api/user/api-key
// ════════════════════════════════════════════════════
const saveApiKey = async (req, res, next) => {
  try {
    const { apiKey, provider } = req.body;
    const userId = req.userId;

    if (!apiKey || !provider) {
      return res.status(400).json({ success: false, message: 'API key and provider are required.' });
    }

    const fieldMap = {
      gemini: 'encryptedGeminiApiKey',
      openrouter: 'encryptedOpenRouterApiKey',
      supadata: 'encryptedSupadataApiKey',
    };

    const dbField = fieldMap[provider.toLowerCase()];
    if (!dbField) {
      return res.status(400).json({ success: false, message: 'Invalid provider.' });
    }

    // Encrypt the API key
    const encryptedValue = encrypt(apiKey);

    // Update user
    const update = { [dbField]: encryptedValue };
    if (provider === 'gemini' || provider === 'openrouter') {
      update.aiProvider = provider;
    }

    await User.findByIdAndUpdate(userId, update);

    logger.info(`API key saved for user ${userId} (provider: ${provider})`);

    res.status(200).json({
      success: true,
      message: `${provider} API key saved securely.`,
      data: {
        provider,
        hasKey: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// GET /api/user/profile
// ════════════════════════════════════════════════════
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select('+encryptedGeminiApiKey +encryptedOpenRouterApiKey +encryptedSupadataApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...user.toJSON(),
        hasGeminiKey: !!user.encryptedGeminiApiKey,
        hasOpenRouterKey: !!user.encryptedOpenRouterApiKey,
        hasSupadataKey: !!user.encryptedSupadataApiKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// PUT /api/user/profile
// ════════════════════════════════════════════════════
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, bio, username } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;

    // Username uniqueness check
    if (username !== undefined) {
      const cleaned = username.toLowerCase().trim();
      if (cleaned) {
        const existing = await User.findOne({ username: cleaned, _id: { $ne: req.userId } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Username is already taken.',
            code: 'USERNAME_TAKEN',
          });
        }
        updates.username = cleaned;
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    });

    // Also sync to localStorage on the frontend
    res.status(200).json({
      success: true,
      message: 'Profile updated.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveApiKey,
  getProfile,
  updateProfile,
};
