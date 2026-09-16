const express = require("express");
const router = express.Router();
const leaveAnalyticsController = require("../controllers/leaveAnalyticsController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/**
 * Leave Analytics & Reports Routes
 * Base path: /api/leave-analytics
 */

// Dashboard statistics (HR only)
router.get("/dashboard-stats", [verifyToken, isAdmin], leaveAnalyticsController.getDashboardStats);

// Leave utilization by type (HR only)
router.get("/utilization", [verifyToken, isAdmin], leaveAnalyticsController.getLeaveUtilization);

// Department-wise statistics (HR only)
router.get("/department-stats", [verifyToken, isAdmin], leaveAnalyticsController.getDepartmentStats);

// Monthly trends (HR only)
router.get("/monthly-trends", [verifyToken, isAdmin], leaveAnalyticsController.getMonthlyTrends);

// Employee leave summary (HR only)
router.get("/employee-summary", [verifyToken, isAdmin], leaveAnalyticsController.getEmployeeLeaveSummary);

// Upcoming leaves (HR only)
router.get("/upcoming", [verifyToken, isAdmin], leaveAnalyticsController.getUpcomingLeaves);

// Balance overview (HR only)
router.get("/balance-overview", [verifyToken, isAdmin], leaveAnalyticsController.getBalanceOverview);

module.exports = router;
