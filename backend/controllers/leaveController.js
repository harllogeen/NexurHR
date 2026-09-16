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
  getActiveLeaves,
} = require("../models/leaveModel");
const { getUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");

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
    // Check if leave already has employee info
    if (leave.employeeName && leave.department) {
      return leave; // Already enriched
    }

    // Try to find user by userId or employeeId
    const user = users.find((u) => u.id === leave.userId || u.employeeId === leave.employeeId);
    let userName = leave.employeeName || `User #${String(leave.userId || leave.employeeId).slice(-6)}`;
    let department = leave.department || "N/A";
    let employeeId = leave.employeeId || null;
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
      employeeName: leave.employeeName || userName,
      department,
      employeeId,
      requesterRole: userRole,
      leaveTypeLabel: leave.leaveTypeLabel || leave.leaveName || leave.leaveType || 'N/A',
      appliedDate: leave.appliedDate || leave.appliedAt || leave.createdAt,
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
      console.log(`Routing HR leave request to manager: ${managerUser.id}`);
      return managerUser.id;
    }
  }

  switch (step.approverType) {
    case "line_manager":
      // Find employee's manager - support both managerId and reportingTo
      const managerId = employee.managerId || employee.reportingTo;
      if (managerId) {
        const manager = employees.find((e) => e.id === managerId || String(e.id) === String(managerId));
        if (manager) {
          const managerUser = users.find((u) => u.employeeId === manager.id || String(u.employeeId) === String(manager.id));
          if (managerUser) {
            console.log(`Found line manager: ${manager.firstName} ${manager.lastName} (userId: ${managerUser.id})`);
            return managerUser.id;
          }
        }
      }
      console.log('No line manager found for employee');
      return null;

    case "department_head":
      // Find department head
      const deptHead = employees.find(
        (e) => e.department === employee.department && (e.designation || e.role || "").toLowerCase().includes("head")
      );
      if (deptHead) {
        const headUser = users.find((u) => u.employeeId === deptHead.id || String(u.employeeId) === String(deptHead.id));
        if (headUser) {
          console.log(`Found department head: ${deptHead.firstName} ${deptHead.lastName} (userId: ${headUser.id})`);
          return headUser.id;
        }
      }
      console.log('No department head found');
      return null;

    case "specific_role":
      // Find any user with the specified role
      const roleUser = users.find((u) => u.role === step.approverRole);
      if (roleUser) {
        console.log(`Found approver with role ${step.approverRole} (userId: ${roleUser.id})`);
        return roleUser.id;
      }
      console.log(`No user found with role: ${step.approverRole}`);
      return null;

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
    console.log('=== Leave Request Received ===');
    console.log('User ID:', req.userId);
    console.log('Request body:', req.body);
    
    const { userId } = req;
    const { leaveType, startDate, endDate, reason, halfDay, attachments } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: "Leave type, start date, and end date are required" });
    }

    // Check if the user already has a running/active leave
    const activeLeaves = getActiveLeaves(userId);
    if (activeLeaves.length > 0) {
      return res.status(400).json({
        message: "You cannot apply for a new leave while you have an active or pending leave request.",
      });
    }

    console.log('Looking up policy for:', leaveType.toLowerCase());
    
    // Get policy
    const policy = LeavePolicy.findByCode(leaveType.toLowerCase());
    if (!policy) {
      console.log('Policy not found for code:', leaveType.toLowerCase());
      return res.status(404).json({ message: "Leave policy not found" });
    }

    console.log('Policy found:', policy.name);

    if (!policy.isActive) {
      return res.status(400).json({ message: "This leave type is not currently available" });
    }

    // Get employee details
    console.log('Getting employee details for userId:', userId);
    const employee = getEmployeeDetails(userId);
    if (!employee) {
      console.log('Employee not found for userId:', userId);
      return res.status(404).json({ message: "Employee profile not found" });
    }

    console.log('Employee found:', employee.firstName, employee.lastName);

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
    const { status, userId, department, leaveType, startDate, endDate, year, month } = req.query;

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

    // Filter by date range
    if (startDate && endDate) {
      leaves = leaves.filter((l) => l.startDate <= endDate && l.endDate >= startDate);
    }

    // Filter by year and month (for calendar view)
    if (year && month) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const monthStart = new Date(yearNum, monthNum - 1, 1);
      const monthEnd = new Date(yearNum, monthNum, 0);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];
      
      leaves = leaves.filter((l) => {
        // Include leaves that overlap with the month
        return l.startDate <= monthEndStr && l.endDate >= monthStartStr;
      });
    }

    // Return in format expected by calendar
    const enrichedLeaves = enrichLeaves(leaves);
    res.status(200).json({ leaves: enrichedLeaves });
  } catch (error) {
    console.error("Error fetching all leaves:", error);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
};

// Get leaves pending my approval
const getMyApprovals = (req, res) => {
  try {
    const { userId } = req;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      department, 
      leaveType, 
      search 
    } = req.query;

    let leaves = getLeavesByApprover(userId);
    leaves = enrichLeaves(leaves);

    // Apply Filters
    if (status && status.toLowerCase() !== 'all') {
      leaves = leaves.filter(l => (l.status || '').toLowerCase() === status.toLowerCase());
    }
    if (department) {
      leaves = leaves.filter(l => (l.department || '').toLowerCase() === department.toLowerCase());
    }
    if (leaveType) {
      leaves = leaves.filter(l => {
        const type = l.leaveType || l.leaveTypeLabel || l.leaveName || '';
        return type.toLowerCase() === leaveType.toLowerCase() || (l.leaveType || '').toLowerCase() === leaveType.toLowerCase();
      });
    }
    if (search) {
      const q = search.toLowerCase();
      leaves = leaves.filter(l => 
        (l.employeeName || '').toLowerCase().includes(q) || 
        (l.reason || '').toLowerCase().includes(q)
      );
    }

    // Sort by applied date (newest first)
    leaves.sort((a, b) => new Date(b.appliedDate || b.appliedAt || b.createdAt) - new Date(a.appliedDate || a.appliedAt || a.createdAt));

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = leaves.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    
    const paginatedLeaves = leaves.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      approvals: paginatedLeaves,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        from: total === 0 ? 0 : startIndex + 1,
        to: Math.min(startIndex + limitNum, total)
      }
    });
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
    console.log('=== Authorization Check ===');
    console.log('Current Approver ID:', leave.currentApproverId, typeof leave.currentApproverId);
    console.log('Actor ID:', actor.id, typeof actor.id);
    console.log('Match:', leave.currentApproverId == actor.id);
    
    if (String(leave.currentApproverId) !== String(actor.id)) {
      console.log('Authorization FAILED');
      return res.status(403).json({
        message: "You are not authorized to approve this leave at the current workflow step",
      });
    }
    
    console.log('Authorization PASSED');

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
      const employee = getEmployeeDetails(leave.userId);
      const users = getUsers();
      const requesterUser = users.find(u => u.id == leave.userId);
      const requesterRole = requesterUser?.role;
      
      let nextStep = ApprovalWorkflow.getNextApprover(leave.workflowId, leave.currentApprovalStep);
      let nextApproverId = null;
      let stepsChecked = 0;
      const maxSteps = 10; // Safety limit
      
      // Skip steps where the requester's role matches the approver role
      while (nextStep && stepsChecked < maxSteps) {
        const testApproverId = determineApprover(nextStep, employee);
        
        // Check if this step requires the same role as the requester
        const isRequesterRole = nextStep.approverRole === requesterRole;
        
        if (!isRequesterRole || !testApproverId) {
          // This step is valid (either different role or no approver found)
          nextApproverId = testApproverId;
          break;
        }
        
        // Skip this step and move to next
        console.log(`Skipping step ${nextStep.order} (${nextStep.approverRole}) - requester has same role`);
        const isLastStep = ApprovalWorkflow.isWorkflowComplete(leave.workflowId, nextStep.order);
        if (isLastStep) {
          // No more steps, approve immediately
          nextStep = null;
          break;
        }
        
        nextStep = ApprovalWorkflow.getNextApprover(leave.workflowId, nextStep.order);
        stepsChecked++;
      }
      
      // If no next step found (all skipped), approve immediately
      if (!nextStep || !nextApproverId) {
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
          details: `Approved leave request #${id} - Final approval (remaining steps skipped)`,
        });

        return res.status(200).json({
          message: "Leave request fully approved",
          request: getLeaveById(id),
        });
      }

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
