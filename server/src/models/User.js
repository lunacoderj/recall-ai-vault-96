const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // ─── Firebase ──────────────────────────────────────
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ─── Profile ───────────────────────────────────────
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // allows null but enforces unique when set
      lowercase: true,
      trim: true,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: 300,
    },

    // ─── AI Integration ────────────────────────────────
    encryptedGeminiApiKey: {
      type: String,
      default: null,
      select: false,
    },
    encryptedOpenRouterApiKey: {
      type: String,
      default: null,
      select: false,
    },
    encryptedSupadataApiKey: {
      type: String,
      default: null,
      select: false,
    },
    encryptedApifyApiKey: {
      type: String,
      default: null,
      select: false,
    },
    aiProvider: {
      type: String,
      enum: ['gemini', 'openrouter', 'openai'],
      default: 'gemini',
    },

    // ─── Auth ──────────────────────────────────────────
    refreshToken: {
      type: String,
      select: false,
    },

    // ─── Social ────────────────────────────────────────
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ─── Metadata from Firebase ────────────────────────
    authProvider: {
      type: String,
      enum: ['password', 'google.com', 'github.com', 'unknown'],
      default: 'unknown',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.encryptedGeminiApiKey;
        delete ret.encryptedOpenRouterApiKey;
        delete ret.encryptedSupadataApiKey;
        delete ret.encryptedApifyApiKey;
        delete ret.refreshToken;
        return ret;
      },
    },
    toObject: { virtuals: true }
  }
);

// Virtuals for key presence
userSchema.virtual('hasGeminiKey').get(function() {
  return !!this.encryptedGeminiApiKey;
});

userSchema.virtual('hasOpenRouterKey').get(function() {
  return !!this.encryptedOpenRouterApiKey;
});

userSchema.virtual('hasSupadataKey').get(function() {
  return !!this.encryptedSupadataApiKey;
});

userSchema.virtual('hasApifyKey').get(function() {
  return !!this.encryptedApifyApiKey;
});

module.exports = mongoose.model('User', userSchema);
