const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', [verifyToken, isAdmin], analyticsController.buildDashboard);

module.exports = router;
