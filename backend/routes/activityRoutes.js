const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/', [verifyToken], activityController.logActivity);
router.get('/all', [verifyToken, isAdmin], activityController.getAllActivities);
router.get('/my', [verifyToken], activityController.getUserActivities);

module.exports = router;
