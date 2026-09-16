const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { verifyToken, isAdmin, isManager, isNotEmployee } = require("../middleware/authMiddleware");

/**
 * Enhanced Leave Request Routes
 * Supports configurable policies, workflows, and calendar integration
 */

// Submit leave request
router.post("/request", verifyToken, leaveController.requestLeave);

// Get my leave requests
router.get("/my-leaves", verifyToken, leaveController.getMyLeaves);

// Get leaves pending my approval
router.get("/my-approvals", verifyToken, leaveController.getMyApprovals);

// Get all leave requests (filtered) - HR/Manager only
router.get("/all", [verifyToken, isNotEmployee], leaveController.getAllLeaves);

// Get all leaves (alias for schedule builder compatibility)
router.get("/", verifyToken, leaveController.getAllLeaves);

// Approve/Reject leave request
router.patch("/update-status/:id", [verifyToken, isManager], leaveController.updateLeaveStatus);

// Cancel/Withdraw leave request
router.patch("/cancel/:id", verifyToken, leaveController.cancelLeaveRequest);

// Delete leave request (pending only)
router.delete("/:id", verifyToken, leaveController.deleteLeaveRequest);

module.exports = router;
