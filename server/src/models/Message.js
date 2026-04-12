const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'link'],
      default: 'text',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['undelivered', 'delivered'],
      default: 'undelivered',
      index: true,
    },
    // For local-first sync tracking
    localId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficiently finding undelivered messages for a specific recipient
messageSchema.index({ receiverId: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);

