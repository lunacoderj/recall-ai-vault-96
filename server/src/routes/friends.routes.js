const router = require('express').Router();
const {
  searchUsers,
  sendRequest,
  respondToRequest,
  getPendingRequests,
  getFriends,
  removeFriend,
  shareRecord,
  getSharedRecords,
} = require('../controllers/friends.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Search users
router.get('/search', searchUsers);

// Friend requests
router.post('/request', sendRequest);
router.put('/respond', respondToRequest);
router.get('/requests', getPendingRequests);

// Friends list
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

// Sharing
router.post('/share', shareRecord);
router.get('/shared', getSharedRecords);

module.exports = router;
