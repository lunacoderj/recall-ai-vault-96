const Message = require('../models/Message');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const logger = require('../config/logger');

/**
 * Send a message to a friend (Store phase).
 */
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content, type, fileUrl, fileName, localId } = req.body;
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
      content,
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
 * Only returns messages where the user is the receiver and status is undelivered.
 */
const getNewMessages = async (req, res, next) => {
  try {
    const userId = req.userId;

    // We only fetch messages sent TO the user that haven't been delivered/acked yet
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
 * Once the frontend has saved messages locally, it calls this to free up DB space.
 */
const acknowledgeMessages = async (req, res, next) => {
  try {
    const { messageIds } = req.body; // Can be MongoDB IDs or localIds
    const userId = req.userId;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ success: false, message: 'Invalid message IDs provided.' });
    }

    if (messageIds.length === 0) {
      return res.status(200).json({ success: true, data: { deletedCount: 0 } });
    }


    // Delete messages where the user is the receiver
    const result = await Message.deleteMany({
      $or: [
        { _id: { $in: messageIds } },
        { localId: { $in: messageIds } }
      ],
      receiverId: userId
    });

    logger.debug(`Pruned ${result.deletedCount} messages for user ${userId}`);

    res.status(200).json({
      success: true,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    logger.error('Failed to acknowledge messages:', error);
    next(error);
  }
};

module.exports = {
  sendMessage,
  getNewMessages,
  acknowledgeMessages,
};

