const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalContent: {
      type: String,
      required: [true, 'Original content is required'],
    },
    contentType: {
      type: String,
      enum: ['link', 'pdf', 'note', 'video', 'document'],
      required: [true, 'Content type is required'],
    },
    aiGeneratedTitle: {
      type: String,
      default: '',
    },
    aiSummary: {
      type: String,
      default: '',
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    rawText: {
      type: String,
      default: '',
    },
    embedding: {
      type: [Number],
      default: [],
      select: false, // Large array — only fetch when needed
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Compound Indexes ────────────────────────────────
recordSchema.index({ userId: 1, createdAt: -1 });
recordSchema.index({ userId: 1, tags: 1 });

// ─── Text Index (fallback keyword search) ────────────
recordSchema.index({
  rawText: 'text',
  aiGeneratedTitle: 'text',
  aiSummary: 'text',
  tags: 'text',
});

module.exports = mongoose.model('Record', recordSchema);
