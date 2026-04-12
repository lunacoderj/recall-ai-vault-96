const mongoose = require('mongoose');

const sharedRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
      required: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
);

sharedRecordSchema.index({ sharedWith: 1, createdAt: -1 });

module.exports = mongoose.model('SharedRecord', sharedRecordSchema);
