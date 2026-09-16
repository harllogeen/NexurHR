const express = require("express");
const router = express.Router();
const leaveBalanceController = require("../controllers/leaveBalanceController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/**
 * Leave Balance Management Routes
 * Base path: /api/leave-balances
 */

// Get current user's balance
router.get("/my-balance", verifyToken, leaveBalanceController.getMyBalance);

// Get all employee balances (HR only)
router.get("/all", [verifyToken, isAdmin], leaveBalanceController.getAllBalances);

// Get all adjustments (HR only)
router.get("/adjustments", [verifyToken, isAdmin], leaveBalanceController.getAllAdjustments);

// Get adjustment history for a user
router.get("/adjustments/:userId", verifyToken, leaveBalanceController.getAdjustmentHistory);

// Get specific user's balance (HR only)
router.get("/:userId", [verifyToken, isAdmin], leaveBalanceController.getUserBalance);

// Initialize balance for a user (HR only)
router.post("/initialize", [verifyToken, isAdmin], leaveBalanceController.initializeBalance);

// Adjust balance manually (HR only)
router.post("/adjust", [verifyToken, isAdmin], leaveBalanceController.adjustBalance);

// Process monthly accrual for a user (HR only)
router.post("/accrual/:userId", [verifyToken, isAdmin], leaveBalanceController.processAccrual);

// Process carry-over (HR only)
router.post("/carry-over", [verifyToken, isAdmin], leaveBalanceController.processCarryOver);

// Bulk process accruals (HR only - for scheduled jobs)
router.post("/bulk-accruals", [verifyToken, isAdmin], leaveBalanceController.bulkProcessAccruals);

module.exports = router;
