const Message = require('../models/Message');
const Receipt = require('../models/Receipt');
const FriendRequest = require('../models/FriendRequest');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const logger = require('../config/logger');

/**
 * Send a message to a friend (Store phase).
 */
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, ciphertext, iv, type, fileUrl, fileName, localId } = req.body;
    const senderId = req.userId;

    // Verify friendship exists (status: 'accepted')
    const areFriends = await FriendRequest.findOne({
      $or: [
        { from: senderId, to: receiverId, status: 'accepted' },
        { from: receiverId, to: senderId, status: 'accepted' },
      ],
    });

    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: 'You can only message friends.',
        code: 'NOT_FRIENDS',
      });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      ciphertext,
      iv,
      type: type || 'text',
      fileUrl,
      fileName,
      localId,
      status: 'undelivered'
    });

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get new messages for the current user (Forward phase).
 */
const getNewMessages = async (req, res, next) => {
  try {
    const userId = req.userId;
    const messages = await Message.find({ 
      receiverId: userId, 
      status: 'undelivered' 
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    logger.error('Failed to get new messages:', error);
    next(error);
  }
};

/**
 * Acknowledge delivery and delete messages (Prune phase).
 */
const acknowledgeMessages = async (req, res, next) => {
  try {
    const { messageIds } = req.body;
    const userId = req.userId;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ success: false, message: 'Invalid message IDs provided.' });
    }

    const mongoose = require('mongoose');
    const validObjectIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    const result = await Message.deleteMany({
      $or: [
        { _id: { $in: validObjectIds } },
        { localId: { $in: messageIds } }
      ],
      receiverId: userId
    });

    res.status(200).json({
      success: true,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages as seen (Receipt Creation Phase).
 */
const markSeen = async (req, res, next) => {
  try {
    const { messageLocalIds, senderId } = req.body;
    const receiverId = req.userId;

    if (!messageLocalIds || !senderId) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    const receipts = messageLocalIds.map(localId => ({
      senderId,
      receiverId,
      messageLocalId: localId,
      status: 'seen'
    }));

    await Receipt.insertMany(receipts);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Get new receipts for messages SENT by current user.
 */
const getNewReceipts = async (req, res, next) => {
  try {
    const userId = req.userId;
    const receipts = await Receipt.find({ senderId: userId }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: { receipts },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete receipts once synced (Receipt Prune Phase).
 */
const acknowledgeReceipts = async (req, res, next) => {
  try {
    const { receiptIds } = req.body;
    const userId = req.userId;

    await Receipt.deleteMany({
      _id: { $in: receiptIds },
      senderId: userId
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Real Media Upload (Cloudinary Production-ready)
 */
const uploadChatFile = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Create a Promise to handle the stream upload to Cloudinary
    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'recallai_chat',
            resource_type: 'auto', // Support images, PDFs, Docs automatically
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        // Pipe the buffer into the stream
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req);

    logger.info(`File uploaded to Cloudinary: ${result.secure_url}`);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        fileName: file.originalname,
        fileSize: result.bytes,
        mimeType: file.mimetype,
        format: result.format
      }
    });

  } catch (error) {
    logger.error('Cloudinary upload failure:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Media upload failed. Please check Cloudinary credentials or file size.',
      detail: error.message 
    });
  }
};

module.exports = {
  sendMessage,
  getNewMessages,
  acknowledgeMessages,
  markSeen,
  getNewReceipts,
  acknowledgeReceipts,
  uploadChatFile
};
