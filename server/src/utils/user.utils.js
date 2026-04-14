const User = require('../models/User');
const { decrypt } = require('./encryption');

/**
 * Helper: Get decrypted API key for the current user by provider.
 * @param {string} userId - User ID
 * @param {string} provider - 'gemini', 'openrouter', or 'supadata'
 * @returns {Promise<string>} Decrypted API key
 */
const getDecryptedApiKey = async (userId, provider = 'gemini') => {
  const p = provider.toLowerCase();
  const fieldMap = {
    gemini: 'encryptedGeminiApiKey',
    openrouter: 'encryptedOpenRouterApiKey',
    supadata: 'encryptedSupadataApiKey',
    apify: 'encryptedApifyApiKey',
    rapidapi: 'encryptedRapidApiKey',
  };

  const dbField = fieldMap[p];
  if (!dbField) throw new Error(`Invalid provider: ${provider}`);

  // Fetch from DB. Using '+' prefix in select to ensure field is included if it's marked as select: false
  const user = await User.findById(userId).select(`+${dbField}`);
  if (!user) throw new Error('User not found');

  const encryptedValue = user[dbField];

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
