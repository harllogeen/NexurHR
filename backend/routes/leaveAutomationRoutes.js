const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const {
  triggerDailyAccruals,
  triggerYearEndCarryOver,
  triggerStaleLeaveCleanup,
  triggerApprovalReminders,
  triggerLowBalanceCheck,
  triggerUpcomingLeaveNotifications,
  triggerAllAutomation,
  getAutomationStatus
} = require('../controllers/leaveAutomationController');

// Get automation status (HR/Admin only)
router.get('/status', verifyToken, isAdmin, getAutomationStatus);

// Manual trigger endpoints (HR/Admin only)
router.post('/trigger/accruals', verifyToken, isAdmin, triggerDailyAccruals);
router.post('/trigger/year-end-carryover', verifyToken, isAdmin, triggerYearEndCarryOver);
router.post('/trigger/stale-cleanup', verifyToken, isAdmin, triggerStaleLeaveCleanup);
router.post('/trigger/approval-reminders', verifyToken, isAdmin, triggerApprovalReminders);
router.post('/trigger/low-balance-check', verifyToken, isAdmin, triggerLowBalanceCheck);
router.post('/trigger/upcoming-leave-notifications', verifyToken, isAdmin, triggerUpcomingLeaveNotifications);
router.post('/trigger/all', verifyToken, isAdmin, triggerAllAutomation);

module.exports = router;
