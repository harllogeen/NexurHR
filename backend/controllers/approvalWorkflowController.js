const ApprovalWorkflow = require("../models/approvalWorkflowModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");

/**
 * Approval Workflow Management Controller
 * Handles configurable multi-level approval chains
 */

// Get all workflows
const getAllWorkflows = (req, res) => {
  try {
    const workflows = ApprovalWorkflow.getAll();
    res.status(200).json(workflows);
  } catch (error) {
    console.error("Error fetching approval workflows:", error);
    res.status(500).json({ message: "Failed to fetch approval workflows" });
  }
};

// Get active workflows only
const getActiveWorkflows = (req, res) => {
  try {
    const workflows = ApprovalWorkflow.getActive();
    res.status(200).json(workflows);
  } catch (error) {
    console.error("Error fetching active workflows:", error);
    res.status(500).json({ message: "Failed to fetch active workflows" });
  }
};

// Get default workflow
const getDefaultWorkflow = (req, res) => {
  try {
    const workflow = ApprovalWorkflow.getDefault();
    res.status(200).json(workflow);
  } catch (error) {
    console.error("Error fetching default workflow:", error);
    res.status(500).json({ message: "Failed to fetch default workflow" });
  }
};

// Get workflow by ID
const getWorkflowById = (req, res) => {
  try {
    const { id } = req.params;
    const workflow = ApprovalWorkflow.findById(id);

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    res.status(200).json(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    res.status(500).json({ message: "Failed to fetch workflow" });
  }
};

// Find matching workflow for a leave request
const findMatchingWorkflow = (req, res) => {
  try {
    const { leaveType, days, department, role, grade } = req.body;

    if (!leaveType || !days) {
      return res.status(400).json({ message: "Leave type and days are required" });
    }

    // Mock leave request object
    const leaveRequest = {
      leaveType: leaveType.toLowerCase(),
      days: parseInt(days),
    };

    // Mock employee object
    const employee = {
      department: department || "",
      role: role || "",
      grade: grade || "",
    };

    const workflow = ApprovalWorkflow.findMatchingWorkflow(leaveRequest, employee);

    res.status(200).json({
      message: "Matching workflow found",
      workflow,
    });
  } catch (error) {
    console.error("Error finding matching workflow:", error);
    res.status(500).json({ message: "Failed to find matching workflow" });
  }
};

// Create new workflow
const createWorkflow = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-workflows", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR/Admin can manage workflows" });
  }

  try {
    const workflowData = req.body;

    // Validate required fields
    if (!workflowData.name || !workflowData.steps || !Array.isArray(workflowData.steps)) {
      return res.status(400).json({ message: "Workflow name and steps are required" });
    }

    if (workflowData.steps.length === 0) {
      return res.status(400).json({ message: "Workflow must have at least one approval step" });
    }

    // Validate steps structure
    for (const step of workflowData.steps) {
      if (!step.order || !step.approverType || !step.approverRole) {
        return res.status(400).json({
          message: "Each step must have order, approverType, and approverRole",
        });
      }
    }

    // Sort steps by order
    workflowData.steps.sort((a, b) => a.order - b.order);

    const newWorkflowData = {
      name: workflowData.name,
      description: workflowData.description || "",
      isDefault: workflowData.isDefault || false,
      leavePolicyCodes: workflowData.leavePolicyCodes || [],
      conditions: workflowData.conditions || {
        maxDays: null,
        minDays: null,
        departments: [],
        roles: [],
        grades: [],
      },
      steps: workflowData.steps,
      isActive: workflowData.isActive !== undefined ? workflowData.isActive : true,
    };

    const newWorkflow = ApprovalWorkflow.create(newWorkflowData);

    recordAuditLog({
      actorId: actor.id,
      action: "create-approval-workflow",
      targetId: newWorkflow.id,
      details: `Created approval workflow: ${newWorkflow.name}`,
    });

    res.status(201).json({
      message: "Approval workflow created successfully",
      workflow: newWorkflow,
    });
  } catch (error) {
    console.error("Error creating approval workflow:", error);
    res.status(500).json({ message: "Failed to create approval workflow" });
  }
};

// Update workflow
const updateWorkflow = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-workflows", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR/Admin can manage workflows" });
  }

  try {
    const { id } = req.params;
    const updates = req.body;

    const existingWorkflow = ApprovalWorkflow.findById(id);
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // If steps are being updated, validate and sort them
    if (updates.steps && Array.isArray(updates.steps)) {
      if (updates.steps.length === 0) {
        return res.status(400).json({ message: "Workflow must have at least one approval step" });
      }

      // Validate steps
      for (const step of updates.steps) {
        if (!step.order || !step.approverType || !step.approverRole) {
          return res.status(400).json({
            message: "Each step must have order, approverType, and approverRole",
          });
        }
      }

      // Sort by order
      updates.steps.sort((a, b) => a.order - b.order);
    }

    const updatedWorkflow = ApprovalWorkflow.update(id, updates);

    if (!updatedWorkflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "update-approval-workflow",
      targetId: id,
      details: `Updated approval workflow: ${updatedWorkflow.name}`,
    });

    res.status(200).json({
      message: "Approval workflow updated successfully",
      workflow: updatedWorkflow,
    });
  } catch (error) {
    console.error("Error updating approval workflow:", error);
    res.status(500).json({ message: "Failed to update approval workflow" });
  }
};

// Delete workflow
const deleteWorkflow = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-workflows", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR/Admin can manage workflows" });
  }

  try {
    const { id } = req.params;

    const workflow = ApprovalWorkflow.findById(id);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const success = ApprovalWorkflow.delete(id);

    if (!success) {
      return res.status(400).json({
        message: "Cannot delete the last workflow or default workflow",
      });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "delete-approval-workflow",
      targetId: id,
      details: `Deleted approval workflow: ${workflow.name}`,
    });

    res.status(200).json({ message: "Approval workflow deleted successfully" });
  } catch (error) {
    console.error("Error deleting approval workflow:", error);
    res.status(500).json({ message: "Failed to delete approval workflow" });
  }
};

// Get next approver in workflow
const getNextApprover = (req, res) => {
  try {
    const { workflowId, currentStep } = req.query;

    if (!workflowId || currentStep === undefined) {
      return res.status(400).json({ message: "Workflow ID and current step are required" });
    }

    const nextStep = ApprovalWorkflow.getNextApprover(parseInt(workflowId), parseInt(currentStep));

    if (!nextStep) {
      return res.status(200).json({
        hasNextStep: false,
        message: "No more approval steps",
      });
    }

    res.status(200).json({
      hasNextStep: true,
      nextStep,
    });
  } catch (error) {
    console.error("Error getting next approver:", error);
    res.status(500).json({ message: "Failed to get next approver" });
  }
};

// Check if workflow is complete
const checkWorkflowComplete = (req, res) => {
  try {
    const { workflowId, currentStep } = req.query;

    if (!workflowId || currentStep === undefined) {
      return res.status(400).json({ message: "Workflow ID and current step are required" });
    }

    const isComplete = ApprovalWorkflow.isWorkflowComplete(parseInt(workflowId), parseInt(currentStep));

    res.status(200).json({
      isComplete,
      workflowId: parseInt(workflowId),
      currentStep: parseInt(currentStep),
    });
  } catch (error) {
    console.error("Error checking workflow completion:", error);
    res.status(500).json({ message: "Failed to check workflow completion" });
  }
};

module.exports = {
  getAllWorkflows,
  getActiveWorkflows,
  getDefaultWorkflow,
  getWorkflowById,
  findMatchingWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getNextApprover,
  checkWorkflowComplete,
};
