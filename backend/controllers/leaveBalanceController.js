const LeaveBalance = require("../models/leaveBalanceModel");
const LeaveAdjustment = require("../models/leaveAdjustmentModel");
const LeavePolicy = require("../models/leavePolicyModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");

/**
 * Leave Balance Management Controller
 * Handles balance operations, accruals, adjustments, and automation
 */

const getMyBalance = (req, res) => {
  try {
    const { userId } = req;

    // Process any pending monthly accruals first
    LeaveBalance.processMonthlyAccrual(userId);

    const balance = LeaveBalance.findByUserId(userId);
    const policies = LeavePolicy.getActive();

    // Calculate used days from approved leaves
    const { getLeavesByUser } = require("../models/leaveModel");
    const userLeaves = getLeavesByUser(userId);
    const currentYear = new Date().getFullYear();

    const usedDays = {};
    userLeaves.forEach((leave) => {
      const leaveYear = new Date(leave.startDate).getFullYear();
      if (leaveYear === currentYear && (leave.status === "Approved" || leave.status === "approved")) {
        const type = (leave.leaveType || "").toLowerCase();
        usedDays[type] = (usedDays[type] || 0) + (leave.days || 0);
      }
    });

    // Format response to match UI expectations
    const formattedBalance = {
      userId: balance.userId,
      year: balance.year,
      balances: balance.balances || {},
      usedDays: usedDays,
      policies: policies.map((p) => ({
        code: p.code,
        name: p.name,
        color: p.color,
        balance: balance.balances[p.code] || 0,
        used: usedDays[p.code] || 0,
        total: (balance.balances[p.code] || 0) + (usedDays[p.code] || 0),
        carryOver: balance.carryOvers[p.code] || 0,
      })),
      lastUpdated: balance.updatedAt,
    };

    res.status(200).json(formattedBalance);
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ message: "Failed to fetch leave balance" });
  }
};

// Get balance for a specific user (HR only)
const getUserBalance = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { userId } = req.params;

    // Process any pending monthly accruals first
    LeaveBalance.processMonthlyAccrual(userId);

    const balance = LeaveBalance.findByUserId(userId);
    const policies = LeavePolicy.getActive();

    const formattedBalance = {
      userId: balance.userId,
      year: balance.year,
      balances: balance.balances || {},
      policies: policies.map((p) => ({
        code: p.code,
        name: p.name,
        color: p.color,
        balance: balance.balances[p.code] || 0,
        carryOver: balance.carryOvers[p.code] || 0,
      })),
      lastUpdated: balance.updatedAt,
    };

    res.status(200).json(formattedBalance);
  } catch (error) {
    console.error("Error fetching user balance:", error);
    res.status(500).json({ message: "Failed to fetch user balance" });
  }
};

// Get all employee balances (HR only)
const getAllBalances = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const balances = LeaveBalance.getAll();
    const policies = LeavePolicy.getActive();

    // Enrich with employee names
    const { getUsers } = require("../models/userModel");
    const { getEmployees } = require("../models/employeeModel");
    const users = getUsers();
    const employees = getEmployees();

    const enrichedBalances = balances.map((balance) => {
      const user = users.find((u) => u.id == balance.userId);
      let employeeName = `User ${balance.userId}`;
      let department = "N/A";
      let employeeId = null;

      if (user && user.employeeId) {
        const employee = employees.find((e) => e.id === user.employeeId);
        if (employee) {
          employeeName = `${employee.firstName} ${employee.lastName}`;
          department = employee.department || "N/A";
          employeeId = employee.id;
        }
      }

      return {
        userId: balance.userId,
        employeeId,
        employeeName,
        department,
        year: balance.year,
        balances: balance.balances || {},
        lastUpdated: balance.updatedAt,
      };
    });

    res.status(200).json({
      balances: enrichedBalances,
      policies: policies.map((p) => ({
        code: p.code,
        name: p.name,
        color: p.color,
      })),
    });
  } catch (error) {
    console.error("Error fetching all balances:", error);
    res.status(500).json({ message: "Failed to fetch employee balances" });
  }
};

// Initialize balance for a user
const initializeBalance = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "adjust-balance", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { userId, joiningDate } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const balance = LeaveBalance.initializeBalance(userId, joiningDate || null);

    recordAuditLog({
      actorId: actor.id,
      action: "initialize-leave-balance",
      targetId: userId,
      details: `Initialized leave balance for user ${userId}`,
    });

    res.status(201).json({
      message: "Leave balance initialized successfully",
      balance,
    });
  } catch (error) {
    console.error("Error initializing balance:", error);
    res.status(500).json({ message: "Failed to initialize balance" });
  }
};

// Manually adjust balance (HR only)
const adjustBalance = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "adjust-balance", "leave")) {
    return res.status(403).json({ message: "Permission denied. Only HR can adjust balances" });
  }

  try {
    const { userId, leaveType, newBalance, reason } = req.body;

    if (!userId || !leaveType || newBalance === undefined || !reason) {
      return res.status(400).json({
        message: "User ID, leave type, new balance, and reason are required",
      });
    }

    const result = LeaveBalance.adjustBalance(userId, leaveType, newBalance, reason, actor.id);

    if (!result) {
      return res.status(404).json({ message: "User balance not found" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "adjust-leave-balance",
      targetId: userId,
      details: `Adjusted ${leaveType} balance to ${newBalance}. Reason: ${reason}`,
    });

    res.status(200).json({
      message: "Balance adjusted successfully",
      balance: result,
    });
  } catch (error) {
    console.error("Error adjusting balance:", error);
    res.status(500).json({ message: "Failed to adjust balance" });
  }
};

// Get balance adjustment history
const getAdjustmentHistory = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  try {
    const { userId } = req.params;

    // Users can view their own history, HR can view all
    if (userId != actor.id && !hasPermission(actor, "view-all", "leave")) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const history = LeaveBalance.getBalanceHistory(userId);

    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching adjustment history:", error);
    res.status(500).json({ message: "Failed to fetch adjustment history" });
  }
};

// Get all adjustments (HR only)
const getAllAdjustments = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { startDate, endDate } = req.query;

    let adjustments;
    if (startDate && endDate) {
      adjustments = LeaveAdjustment.getByDateRange(startDate, endDate);
    } else {
      adjustments = LeaveAdjustment.getAll();
    }

    // Enrich with employee names
    const { getUsers } = require("../models/userModel");
    const { getEmployees } = require("../models/employeeModel");
    const users = getUsers();
    const employees = getEmployees();

    const enrichedAdjustments = adjustments.map((adj) => {
      const user = users.find((u) => u.id == adj.userId);
      let employeeName = `User ${adj.userId}`;

      if (user && user.employeeId) {
        const employee = employees.find((e) => e.id === user.employeeId);
        if (employee) {
          employeeName = `${employee.firstName} ${employee.lastName}`;
        }
      }

      const adjuster = users.find((u) => u.id == adj.adjustedBy);
      let adjusterName = `User ${adj.adjustedBy}`;

      if (adjuster && adjuster.employeeId) {
        const adjusterEmployee = employees.find((e) => e.id === adjuster.employeeId);
        if (adjusterEmployee) {
          adjusterName = `${adjusterEmployee.firstName} ${adjusterEmployee.lastName}`;
        }
      }

      return {
        ...adj,
        employeeName,
        adjusterName,
      };
    });

    res.status(200).json(enrichedAdjustments);
  } catch (error) {
    console.error("Error fetching all adjustments:", error);
    res.status(500).json({ message: "Failed to fetch adjustments" });
  }
};

// Process monthly accrual for a user
const processAccrual = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "adjust-balance", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { userId } = req.params;

    const balance = LeaveBalance.processMonthlyAccrual(userId);

    if (!balance) {
      return res.status(404).json({ message: "User balance not found" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "process-leave-accrual",
      targetId: userId,
      details: `Processed monthly accrual for user ${userId}`,
    });

    res.status(200).json({
      message: "Accrual processed successfully",
      balance,
    });
  } catch (error) {
    console.error("Error processing accrual:", error);
    res.status(500).json({ message: "Failed to process accrual" });
  }
};

// Process carry-over for year-end
const processCarryOver = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "adjust-balance", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { userId, year } = req.body;

    if (!userId || !year) {
      return res.status(400).json({ message: "User ID and year are required" });
    }

    const newBalance = LeaveBalance.processCarryOver(userId, parseInt(year));

    if (!newBalance) {
      return res.status(404).json({ message: "User balance not found for specified year" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "process-leave-carry-over",
      targetId: userId,
      details: `Processed carry-over from ${year} to ${year + 1} for user ${userId}`,
    });

    res.status(200).json({
      message: "Carry-over processed successfully",
      balance: newBalance,
    });
  } catch (error) {
    console.error("Error processing carry-over:", error);
    res.status(500).json({ message: "Failed to process carry-over" });
  }
};

// Bulk process accruals for all users (scheduled job endpoint)
const bulkProcessAccruals = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "adjust-balance", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const balances = LeaveBalance.getAll();
    const processed = [];
    const errors = [];

    balances.forEach((balance) => {
      try {
        const updated = LeaveBalance.processMonthlyAccrual(balance.userId);
        if (updated) {
          processed.push(balance.userId);
        }
      } catch (error) {
        errors.push({ userId: balance.userId, error: error.message });
      }
    });

    recordAuditLog({
      actorId: actor.id,
      action: "bulk-process-accruals",
      targetId: "all",
      details: `Bulk processed accruals for ${processed.length} users`,
    });

    res.status(200).json({
      message: "Bulk accrual processing completed",
      processed: processed.length,
      errors: errors.length,
      details: { processed, errors },
    });
  } catch (error) {
    console.error("Error in bulk accrual processing:", error);
    res.status(500).json({ message: "Failed to process bulk accruals" });
  }
};

module.exports = {
  getMyBalance,
  getUserBalance,
  getAllBalances,
  initializeBalance,
  adjustBalance,
  getAdjustmentHistory,
  getAllAdjustments,
  processAccrual,
  processCarryOver,
  bulkProcessAccruals,
};
