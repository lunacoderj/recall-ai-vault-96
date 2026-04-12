const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const SharedRecord = require('../models/SharedRecord');
const Record = require('../models/Record');
const logger = require('../config/logger');

// ════════════════════════════════════════════════════
// GET /api/friends/search?q=<query>
// Search users by username or email
// ════════════════════════════════════════════════════
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
    }

    const query = q.trim();
    logger.debug(`User search initiated: "${query}" by user ${req.userId}`);

    const users = await User.find({
      _id: { $ne: req.userId }, // exclude self
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
      ],
    })
      .select('name email username avatar bio publicKey')
      .limit(20)
      .lean();

    logger.debug(`Found ${users.length} users matching "${query}"`);
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('User search failed:', error);
    next(error);
  }
};

// ════════════════════════════════════════════════════
// POST /api/friends/request
// Send a friend request
// ════════════════════════════════════════════════════
const sendRequest = async (req, res, next) => {
  try {
    const { userId: targetUserId } = req.body;
    const fromUserId = req.userId;

    if (fromUserId === targetUserId) {
      return res.status(400).json({ success: false, message: "You can't add yourself." });
    }

    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    // Check if already friends
    const me = await User.findById(fromUserId);
    if (me.friends.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Already friends.' });
    }

    // Check existing request
    const existing = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: targetUserId, status: 'pending' },
        { from: targetUserId, to: fromUserId, status: 'pending' },
      ],
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Request already pending.' });
    }

    const request = await FriendRequest.create({ from: fromUserId, to: targetUserId });
    logger.info(`Friend request: ${fromUserId} → ${targetUserId}`);

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Request already exists.' });
    }
    next(error);
  }
};

// ════════════════════════════════════════════════════
// PUT /api/friends/respond
// Accept or reject a friend request
// ════════════════════════════════════════════════════
const respondToRequest = async (req, res, next) => {
  try {
    const { requestId, action } = req.body; // action: 'accepted' | 'rejected'
    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accepted or rejected.' });
    }

    const request = await FriendRequest.findOne({ _id: requestId, to: req.userId, status: 'pending' });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    request.status = action;
    await request.save();

    if (action === 'accepted') {
      // Add each other as friends
      await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
      await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
      logger.info(`Friends connected: ${request.from} ↔ ${request.to}`);
    }

    res.json({ success: true, message: `Request ${action}.` });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// GET /api/friends/requests
// Get pending friend requests (incoming)
// ════════════════════════════════════════════════════
const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({ to: req.userId, status: 'pending' })
      .populate('from', 'name email username avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// GET /api/friends
// Get friends list
// ════════════════════════════════════════════════════
const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'name email username avatar bio publicKey')
      .lean();

    res.json({ success: true, data: user?.friends || [] });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// DELETE /api/friends/:friendId
// Remove a friend
// ════════════════════════════════════════════════════
const removeFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.userId } });

    // Also clean up the friend request
    await FriendRequest.deleteMany({
      $or: [
        { from: req.userId, to: friendId },
        { from: friendId, to: req.userId },
      ],
    });

    logger.info(`Friends removed: ${req.userId} ↔ ${friendId}`);
    res.json({ success: true, message: 'Friend removed.' });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// POST /api/friends/share
// Share a record with a friend
// ════════════════════════════════════════════════════
const shareRecord = async (req, res, next) => {
  try {
    const { recordId, friendId, message } = req.body;

    // Verify friendship
    const me = await User.findById(req.userId);
    if (!me.friends.includes(friendId)) {
      return res.status(403).json({ success: false, message: 'You can only share with friends.' });
    }

    // Verify record ownership
    const record = await Record.findOne({ _id: recordId, userId: req.userId });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });

    const shared = await SharedRecord.create({
      recordId,
      sharedBy: req.userId,
      sharedWith: friendId,
      message: message || '',
    });

    logger.info(`Record ${recordId} shared: ${req.userId} → ${friendId}`);
    res.status(201).json({ success: true, data: shared });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════
// GET /api/friends/shared
// Get records shared with me
// ════════════════════════════════════════════════════
const getSharedRecords = async (req, res, next) => {
  try {
    const shared = await SharedRecord.find({ sharedWith: req.userId })
      .populate('sharedBy', 'name avatar username')
      .populate('recordId', 'aiGeneratedTitle aiSummary tags contentType createdAt originalContent')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: shared });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
  sendRequest,
  respondToRequest,
  getPendingRequests,
  getFriends,
  removeFriend,
  shareRecord,
  getSharedRecords,
};
