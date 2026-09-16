const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/leaves.json");

/**
 * Enhanced Leave Request Model
 * Manages leave requests with workflow tracking and detailed metadata
 */

const getLeaves = () => {
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  const jsonData = fs.readFileSync(dataPath);
  try {
    return JSON.parse(jsonData);
  } catch (e) {
    return [];
  }
};

const saveLeaves = (leaves) => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(leaves, null, 2));
};

const getLeavesByDateRange = (startDate, endDate) => {
  const leaves = getLeaves();
  return leaves.filter((leave) => {
    // Check if leave overlaps with the date range
    const leaveStart = leave.startDate;
    const leaveEnd = leave.endDate;

    // Leave overlaps if it starts before range ends AND ends after range starts
    return leaveStart <= endDate && leaveEnd >= startDate;
  });
};

const getLeaveById = (id) => {
  const leaves = getLeaves();
  return leaves.find((l) => l.id == id);
};

const createLeave = (leaveData) => {
  const leaves = getLeaves();
  const newLeave = {
    id: Date.now(),
    ...leaveData,
    status: "Pending",
    currentApprovalStep: 1,
    approvalHistory: [],
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leaves.push(newLeave);
  saveLeaves(leaves);
  return newLeave;
};

const updateLeave = (id, updates) => {
  const leaves = getLeaves();
  const index = leaves.findIndex((l) => l.id == id);
  if (index === -1) return null;

  leaves[index] = {
    ...leaves[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveLeaves(leaves);
  return leaves[index];
};

const addApprovalAction = (leaveId, action) => {
  const leaves = getLeaves();
  const index = leaves.findIndex((l) => l.id == leaveId);
  if (index === -1) return null;

  if (!leaves[index].approvalHistory) {
    leaves[index].approvalHistory = [];
  }

  leaves[index].approvalHistory.push({
    ...action,
    timestamp: new Date().toISOString(),
  });

  leaves[index].updatedAt = new Date().toISOString();
  saveLeaves(leaves);
  return leaves[index];
};

const getLeavesByStatus = (status) => {
  const leaves = getLeaves();
  return leaves.filter((l) => l.status === status);
};

const getLeavesByUser = (userId) => {
  const leaves = getLeaves();
  return leaves.filter((l) => l.userId == userId);
};

const getLeavesByApprover = (approverId, step = null) => {
  const leaves = getLeaves();
  return leaves.filter((l) => {
    // Case-insensitive status check
    const status = (l.status || '').toLowerCase();
    if (status !== "pending") return false;
    if (!l.workflowId || !l.currentApprovalStep) return false;

    // If step is specified, only return leaves at that step
    if (step !== null && l.currentApprovalStep !== step) return false;

    // Check if this approver is responsible for the current step
    return l.currentApproverId == approverId;
  });
};

const checkLeaveConflicts = (userId, startDate, endDate, excludeLeaveId = null) => {
  const leaves = getLeaves();
  return leaves.filter((l) => {
    if (excludeLeaveId && l.id == excludeLeaveId) return false;
    if (l.userId != userId) return false;
    if (l.status === "Rejected" || l.status === "Cancelled") return false;

    // Check for date overlap
    return l.startDate <= endDate && l.endDate >= startDate;
  });
};

const getTeamLeavesInPeriod = (department, startDate, endDate) => {
  const leaves = getLeaves();
  return leaves.filter((l) => {
    if (l.status !== "Approved") return false;
    if (l.department !== department) return false;

    // Check for date overlap
    return l.startDate <= endDate && l.endDate >= startDate;
  });
};

const getActiveLeaves = (userId) => {
  const leaves = getLeaves();
  const today = new Date().toISOString().split("T")[0];
  return leaves.filter((l) => {
    if (l.userId != userId) return false;
    if (l.status === "Rejected" || l.status === "Cancelled") return false;
    
    // An active leave is either pending, or approved and hasn't ended yet
    if (l.status === "Pending") return true;
    if (l.status === "Approved" && l.endDate >= today) return true;
    
    return false;
  });
};

module.exports = {
  getLeaves,
  saveLeaves,
  getLeavesByDateRange,
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
};

