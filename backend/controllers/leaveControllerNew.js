const LeavePolicy = require("../models/leavePolicyModel");
const LeaveBalance = require("../models/leaveBalanceModel");
const ApprovalWorkflow = require("../models/approvalWorkflowModel");
const { WorkCalendar, PublicHoliday } = require("../models/workCalendarModel");
const {
  getLeaves,
  saveLeaves,
  getLeaveById,
  createLeave,
  updateLeave,
  addApprovalAction,
  getLeavesByStatus,
  getLeavesByUser,
  getLeavesByApprover,
  checkLeaveConflicts,
  getTeamLeavesInPeriod,
} = require("../models/leaveModel");
const { getUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../utils/auditLogger");

/**
 * Enhanced Leave Request Controller
 * Implements configurable policies, workflows, calendar integration, and conflict detection
 */

// ========================================
// HELPER FUNCTIONS
// ========================================

const enrichLeaves = (leaves) => {
  const users = getUsers();
  const employees = getEmployees();

  return leaves.map((leave) => {
    const user = users.find((u) => u.id === leave.userId);
    let userName = `User #${String(leave.userId).slice(-6)}`;
    let department = "N/A";
    let employeeId = null;
    let userRole = "employee";

    if (user && user.employeeId) {
      const employee = employees.find((e) => e.id === user.employeeId);
      if (employee) {
        userName = `${employee.firstName} ${employee.lastName}`;
        department = employee.department || "N/A";
        employeeId = employee.id;
      }
      userRole = user.role || "employee";
    } else if (user && user.username) {
      userName = user.username;
      userRole = user.role || "employee";
    }

    return {
      ...leave,
      userName,
      department,
      employeeId,
      requesterRole: userRole,
    };
  });
};

const getEmployeeDetails = (userId) => {
  const users = getUsers();
  const employees = getEmployees();

  const user = users.find((u) => u.id == userId);
  if (!user) return null;

  const employee = employees.find((e) => e.id === user.employeeId);
  if (!employee) return null;

  return {
    ...employee,
    role: user.role,
    userId: user.id,
  };
};

const determineApprover = (step, employee) => {
  const users = getUsers();
  const employees = getEmployees();

  // If the employee applying is HR, their leave should be approved by a Manager
  if (employee.role === 'hr') {
    const managerUser = users.find((u) => u.role === 'manager');
    if (managerUser) {
      return managerUser.id;
    }
  }

  switch (step.approverType) {
    case "line_manager":
      // Find employee's manager
      if (employee.managerId) {
        const manager = employees.find((e) => e.id === employee.managerId);
        if (manager) {
          const managerUser = users.find((u) => u.employeeId === manager.id);
          return managerUser ? managerUser.id : null;
        }
      }
      return null;

    case "department_head":
      // Find department head
      const deptHead = employees.find(
        (e) => e.department === employee.department && (e.designation || "").toLowerCase().includes("head")
      );
      if (deptHead) {
        const headUser = users.find((u) => u.employeeId === deptHead.id);
        return headUser ? headUser.id : null;
      }
      return null;

    case "specific_role":
      // Find any user with the specified role
      const roleUser = users.find((u) => u.role === step.approverRole);
      return roleUser ? roleUser.id : null;

    case "specific_user":
      // Use the specific user ID from the step
      return step.specificUserId;

    default:
      return null;
  }
};

// ========================================
// LEAVE REQUEST ENDPOINTS
// ========================================

// Submit new leave request
const requestLeave = async (req, res) => {
  try {
    const { userId } = req;
    const { leaveType, startDate, endDate, reason, halfDay, attachments } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ message: "Leave type, start date, and end date are required" });
    }

    // Get policy
    const policy = LeavePolicy.findByCode(leaveType.toLowerCase());
    if (!policy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    if (!policy.isActive) {
      return res.status(400).json({ message: "This leave type is not currently available" });
    }

    // Get employee details
    const employee = getEmployeeDetails(userId);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Check eligibility
    const eligibility = LeavePolicy.checkEligibility(policy, employee);
    if (!eligibility.eligible) {
      return res.status(403).json({
        message: "You are not eligible for this leave type",
        reasons: eligibility.errors,
      });
    }

    // Get calendar for employee's department
    const calendar = WorkCalendar.getByDepartment(employee.department);

    // Calculate working days
    const workingDays = WorkCalendar.calculateWorkingDays(
      startDate,
      endDate,
      calendar.id,
      !policy.countsPublicHolidays
    );

    if (workingDays === 0) {
      return res.status(400).json({
        message: "Selected dates do not include any working days",
      });
    }

    const daysRequested = halfDay ? 0.5 : workingDays;

    // Check balance
    const balance = LeaveBalance.findByUserId(userId);
    const availableBalance = balance.balances[leaveType.toLowerCase()] || 0;

    if (availableBalance < daysRequested) {
      return res.status(400).json({
        message: `Insufficient leave balance. You have ${availableBalance} days available, but requested ${daysRequested} days`,
      });
    }

    // Check for conflicts (overlapping leaves)
    const conflicts = checkLeaveConflicts(userId, startDate, endDate);
    if (conflicts.length > 0) {
      return res.status(400).json({
        message: "You have overlapping leave requests for this period",
        conflicts: conflicts.map((c) => ({
          id: c.id,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status,
        })),
      });
    }

    // Check notice period
    if (policy.minNoticedays > 0) {
      const today = new Date();
      const leaveStart = new Date(startDate);
      const daysDifference = Math.ceil((leaveStart - today) / (1000 * 60 * 60 * 24));

      if (daysDifference < policy.minNoticedays) {
        return res.status(400).json({
          message: `This leave type requires at least ${policy.minNoticedays} days notice`,
        });
      }
    }

    // Check maximum consecutive days
    if (policy.maxConsecutiveDays && daysRequested > policy.maxConsecutiveDays) {
      return res.status(400).json({
        message: `This leave type allows maximum ${policy.maxConsecutiveDays} consecutive days`,
      });
    }

    // Check if documentation is required
    if (policy.requiresDocumentation) {
      const threshold = policy.documentationThreshold || 0;
      if (daysRequested > threshold && (!attachments || attachments.length === 0)) {
        return res.status(400).json({
          message: "Supporting documentation is required for this leave request",
        });
      }
    }

    // Find matching approval workflow
    const workflow = ApprovalWorkflow.findMatchingWorkflow(
      { leaveType: leaveType.toLowerCase(), days: daysRequested },
      employee
    );

    if (!workflow) {
      return res.status(500).json({ message: "No approval workflow configured for this leave type" });
    }

    // Determine first approver
    const firstStep = workflow.steps[0];
    const firstApproverId = determineApprover(firstStep, employee);

    if (!firstApproverId && firstStep.required && !firstStep.autoApproveIfNoApprover) {
      return res.status(400).json({
        message: "No approver found for your leave request. Please contact HR",
      });
    }

    // Check team conflicts (warn but don't block)
    const teamConflicts = getTeamLeavesInPeriod(employee.department, startDate, endDate);
    const conflictWarning =
      teamConflicts.length >= 3
        ? `⚠️ ${teamConflicts.length} team members are already on leave during this period`
        : null;

    // Create leave request
    const newLeave = createLeave({
      userId,
      employeeId: employee.id,
      department: employee.department,
      leaveType: leaveType.toLowerCase(),
      leaveName: policy.name,
      startDate,
      endDate,
      workingDays,
      days: daysRequested,
      halfDay: halfDay || false,
      reason,
      attachments: attachments || [],
      workflowId: workflow.id,
      workflowName: workflow.name,
      currentApprovalStep: 1,
      currentApproverId: firstApproverId,
      approvalHistory: [],
      calendarId: calendar.id,
    });

    recordAuditLog({
      actorId: userId,
      action: "request-leave",
      targetId: newLeave.id,
      details: `Requested ${policy.name} leave for ${daysRequested} days`,
    });

    res.status(201).json({
      message: "Leave request submitted successfully",
      request: newLeave,
      warning: conflictWarning,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        totalSteps: workflow.steps.length,
      },
    });
  } catch (error) {
    console.error("Error requesting leave:", error);
    res.status(500).json({ message: "Failed to submit leave request" });
  }
};

// Get my leave requests
const getMyLeaves = (req, res) => {
  try {
    const { userId } = req;
    const leaves = getLeavesByUser(userId);
    res.status(200).json(enrichLeaves(leaves));
  } catch (error) {
    console.error("Error fetching my leaves:", error);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
};

// Get all leave requests (filtered)
const getAllLeaves = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { status, userId, department, leaveType, startDate, endDate } = req.query;

    let leaves = getLeaves();

    // Apply filters
    if (status) {
      leaves = leaves.filter((l) => (l.status || "").toLowerCase() === status.toLowerCase());
    }

    if (userId) {
      leaves = leaves.filter((l) => l.userId == userId);
    }

    if (department) {
      leaves = leaves.filter((l) => l.department === department);
    }

    if (leaveType) {
      leaves = leaves.filter((l) => l.leaveType === leaveType.toLowerCase());
    }

    if (startDate && endDate) {
      leaves = leaves.filter((l) => l.startDate <= endDate && l.endDate >= startDate);
    }

    res.status(200).json(enrichLeaves(leaves));
  } catch (error) {
    console.error("Error fetching all leaves:", error);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
};

// Get leaves pending my approval
const getMyApprovals = (req, res) => {
  try {
    const { userId } = req;
    const leaves = getLeavesByApprover(userId);
    res.status(200).json(enrichLeaves(leaves));
  } catch (error) {
    console.error("Error fetching approvals:", error);
    res.status(500).json({ message: "Failed to fetch pending approvals" });
  }
};

// Approve/Reject leave request
const updateLeaveStatus = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "approve", "leave") && !hasPermission(actor, "reject", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action.toLowerCase())) {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'" });
    }

    const leave = getLeaveById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({ message: `Leave request is already ${leave.status}` });
    }

    // Verify approver is authorized for this step
    if (leave.currentApproverId != actor.id) {
      return res.status(403).json({
        message: "You are not authorized to approve this leave at the current workflow step",
      });
    }

    // Add approval action to history
    addApprovalAction(id, {
      step: leave.currentApprovalStep,
      approverId: actor.id,
      action: action.toLowerCase(),
      comments: comments || "",
    });

    if (action.toLowerCase() === "reject") {
      // Rejected - end workflow
      updateLeave(id, {
        status: "Rejected",
        rejectedBy: actor.id,
        rejectedAt: new Date().toISOString(),
        rejectionReason: comments || "",
      });

      recordAuditLog({
        actorId: actor.id,
        action: "reject-leave",
        targetId: id,
        details: `Rejected leave request #${id}`,
      });

      return res.status(200).json({
        message: "Leave request rejected",
        request: getLeaveById(id),
      });
    }

    // Approved - check if workflow is complete
    const workflow = ApprovalWorkflow.findById(leave.workflowId);
    const isComplete = ApprovalWorkflow.isWorkflowComplete(leave.workflowId, leave.currentApprovalStep);

    if (isComplete) {
      // Final approval - deduct balance and approve
      LeaveBalance.updateBalance(leave.userId, leave.leaveType, leave.days, "deduct");

      updateLeave(id, {
        status: "Approved",
        approvedBy: actor.id,
        approvedAt: new Date().toISOString(),
      });

      recordAuditLog({
        actorId: actor.id,
        action: "approve-leave",
        targetId: id,
        details: `Approved leave request #${id} - Final approval`,
      });

      return res.status(200).json({
        message: "Leave request fully approved",
        request: getLeaveById(id),
      });
    } else {
      // Move to next step
      const nextStep = ApprovalWorkflow.getNextApprover(leave.workflowId, leave.currentApprovalStep);
      const employee = getEmployeeDetails(leave.userId);
      const nextApproverId = determineApprover(nextStep, employee);

      updateLeave(id, {
        currentApprovalStep: nextStep.order,
        currentApproverId: nextApproverId,
      });

      recordAuditLog({
        actorId: actor.id,
        action: "approve-leave-step",
        targetId: id,
        details: `Approved leave request #${id} - Step ${leave.currentApprovalStep}`,
      });

      return res.status(200).json({
        message: `Leave approved at step ${leave.currentApprovalStep}. Moving to next approval level`,
        request: getLeaveById(id),
        nextStep: {
          order: nextStep.order,
          approverRole: nextStep.approverRole,
        },
      });
    }
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ message: "Failed to update leave status" });
  }
};

// Cancel/Withdraw leave request
const cancelLeaveRequest = (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { reason } = req.body;

    const leave = getLeaveById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Only owner can cancel
    if (leave.userId != userId) {
      return res.status(403).json({ message: "You can only cancel your own leave requests" });
    }

    // Can only cancel pending or approved leaves (before start date)
    if (leave.status === "Rejected" || leave.status === "Cancelled") {
      return res.status(400).json({ message: "This leave request is already cancelled or rejected" });
    }

    const today = new Date().toISOString().split("T")[0];
    if (leave.startDate < today) {
      return res.status(400).json({ message: "Cannot cancel leave that has already started" });
    }

    // If approved, restore balance
    if (leave.status === "Approved") {
      LeaveBalance.updateBalance(leave.userId, leave.leaveType, leave.days, "restore");
    }

    updateLeave(id, {
      status: "Cancelled",
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason || "Cancelled by employee",
    });

    recordAuditLog({
      actorId: userId,
      action: "cancel-leave",
      targetId: id,
      details: `Cancelled leave request #${id}`,
    });

    res.status(200).json({
      message: "Leave request cancelled successfully",
      request: getLeaveById(id),
    });
  } catch (error) {
    console.error("Error cancelling leave:", error);
    res.status(500).json({ message: "Failed to cancel leave request" });
  }
};

// Delete leave request (pending only)
const deleteLeaveRequest = (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const leaves = getLeaves();
    const index = leaves.findIndex((l) => String(l.id) === String(id) && String(l.userId) === String(userId));

    if (index === -1) {
      return res.status(404).json({ message: "Leave request not found or unauthorized" });
    }

    if (leaves[index].status !== "Pending") {
      return res.status(400).json({ message: "Only pending leave requests can be deleted" });
    }

    const deleted = leaves.splice(index, 1);
    saveLeaves(leaves);

    recordAuditLog({
      actorId: userId,
      action: "delete-leave",
      targetId: id,
      details: `Deleted pending leave request`,
    });

    res.status(200).json({
      message: "Leave request deleted successfully",
      request: deleted[0],
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    res.status(500).json({ message: "Failed to delete leave request" });
  }
};

module.exports = {
  requestLeave,
  getMyLeaves,
  getAllLeaves,
  getMyApprovals,
  updateLeaveStatus,
  cancelLeaveRequest,
  deleteLeaveRequest,
};
