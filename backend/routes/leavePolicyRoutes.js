const express = require("express");
const router = express.Router();
const leavePolicyController = require("../controllers/leavePolicyController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/**
 * Leave Policy Management Routes
 * Base path: /api/leave-policies
 */

// Get all leave policies (HR/Admin only - for management interface)
router.get("/all", [verifyToken, isAdmin], leavePolicyController.getAllPolicies);

// Get active policies (all authenticated users can see available leave types)
router.get("/active", verifyToken, leavePolicyController.getActivePolicies);

// Get policies eligible for current user
router.get("/eligible", verifyToken, leavePolicyController.getEligiblePolicies);

// Get single policy by ID
router.get("/:id", verifyToken, leavePolicyController.getPolicyById);

// Get policy by code
router.get("/code/:code", verifyToken, leavePolicyController.getPolicyByCode);

// Check eligibility for specific policy
router.get("/:policyId/eligibility", verifyToken, leavePolicyController.checkEligibility);

// Create new policy (HR/Admin only)
router.post("/", [verifyToken, isAdmin], leavePolicyController.createPolicy);

// Update policy (HR/Admin only)
router.patch("/:id", [verifyToken, isAdmin], leavePolicyController.updatePolicy);

// Delete policy (Admin only)
router.delete("/:id", [verifyToken, isAdmin], leavePolicyController.deletePolicy);

module.exports = router;
