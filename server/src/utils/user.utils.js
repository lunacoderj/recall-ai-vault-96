const User = require('../models/User');
const { decrypt } = require('./encryption');

/**
 * Helper: Get decrypted API key for the current user by provider.
 * @param {string} userId - User ID
 * @param {string} provider - 'gemini', 'openrouter', or 'supadata'
 * @returns {Promise<string>} Decrypted API key
 */
const getDecryptedApiKey = async (userId, provider = 'gemini') => {
  const fieldMap = {
    gemini: '+encryptedGeminiApiKey',
    openrouter: '+encryptedOpenRouterApiKey',
    supadata: '+encryptedSupadataApiKey',
    apify: '+encryptedApifyApiKey',
    rapidapi: '+encryptedRapidApiKey',
  };

  const user = await User.findById(userId).select(fieldMap[provider.toLowerCase()]);
  if (!user) throw new Error('User not found');

  const fieldName = `encrypted${provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()}ApiKey`;
  const encryptedValue = user[fieldName];

  if (!encryptedValue) {
    const error = new Error(
      `No ${provider} API key configured. Please add it in settings.`
    );
    error.statusCode = 400;
    error.code = 'NO_API_KEY';
    throw error;
  }
  return decrypt(encryptedValue);
};

module.exports = { getDecryptedApiKey };
