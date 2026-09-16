const express = require("express");
const router = express.Router();
const approvalWorkflowController = require("../controllers/approvalWorkflowController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/**
 * Approval Workflow Management Routes
 * Base path: /api/approval-workflows
 */

// Get all workflows (HR only)
router.get("/all", [verifyToken, isAdmin], approvalWorkflowController.getAllWorkflows);

// Get active workflows (all authenticated users)
router.get("/active", verifyToken, approvalWorkflowController.getActiveWorkflows);

// Get default workflow
router.get("/default", verifyToken, approvalWorkflowController.getDefaultWorkflow);

// Find matching workflow for a leave request
router.post("/find-match", verifyToken, approvalWorkflowController.findMatchingWorkflow);

// Get next approver in workflow
router.get("/next-approver", verifyToken, approvalWorkflowController.getNextApprover);

// Check if workflow is complete
router.get("/is-complete", verifyToken, approvalWorkflowController.checkWorkflowComplete);

// Get workflow by ID
router.get("/:id", verifyToken, approvalWorkflowController.getWorkflowById);

// Create workflow (HR only)
router.post("/", [verifyToken, isAdmin], approvalWorkflowController.createWorkflow);

// Update workflow (HR only)
router.patch("/:id", [verifyToken, isAdmin], approvalWorkflowController.updateWorkflow);

// Delete workflow (HR only)
router.delete("/:id", [verifyToken, isAdmin], approvalWorkflowController.deleteWorkflow);

module.exports = router;
