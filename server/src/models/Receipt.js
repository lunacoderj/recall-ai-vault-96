const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  messageLocalId: { 
    type: String, 
    required: true 
  }, 
  status: { 
    type: String, 
    enum: ['delivered', 'seen'], 
    default: 'seen' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Auto-prune after 7 days if not ACK'd (Backup safety)
ReceiptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Receipt', ReceiptSchema);
