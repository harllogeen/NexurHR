const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/leaveBalances.json");

/**
 * Enhanced Leave Balance Model
 * Manages employee leave balances with automation, accruals, and audit trail
 */

const LeaveBalance = {
  getAll: () => {
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },

  saveAll: (data) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  },

  findByUserId: (userId) => {
    const data = LeaveBalance.getAll();
    let balance = data.find((b) => b.userId == userId);
    if (!balance) {
      // Initialize balance based on leave policies
      balance = LeaveBalance.initializeBalance(userId);
    }
    return balance;
  },

  findByUserIdAndYear: (userId, year) => {
    const balance = LeaveBalance.findByUserId(userId);
    // Return balance for specific year (or current if not tracking by year yet)
    return balance;
  },

  initializeBalance: (userId, joiningDate = null) => {
    const LeavePolicy = require("./leavePolicyModel");
    const policies = LeavePolicy.getActive();

    const balances = {};
    const accruals = {};
    const carryOvers = {};
    const lastAccrual = {};

    policies.forEach((policy) => {
      const code = policy.code.toLowerCase();

      // Calculate initial balance based on accrual type
      if (policy.accrualType === "annual") {
        // Pro-rate if joining mid-year
        if (joiningDate) {
          balances[code] = LeaveBalance.calculateProRatedBalance(policy.defaultDays, joiningDate);
        } else {
          balances[code] = policy.defaultDays;
        }
      } else if (policy.accrualType === "monthly") {
        // Monthly accrual starts at 0
        balances[code] = 0;
        accruals[code] = policy.accrualRate || 0;
      } else if (policy.accrualType === "event-based" || policy.accrualType === "none") {
        // Event-based leaves (maternity, paternity) start at 0
        balances[code] = 0;
      }

      carryOvers[code] = 0;
      lastAccrual[code] = new Date().toISOString();
    });

    const data = LeaveBalance.getAll();
    const newBalance = {
      userId,
      year: new Date().getFullYear(),
      balances,
      accruals,
      carryOvers,
      lastAccrual,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.push(newBalance);
    LeaveBalance.saveAll(data);
    return newBalance;
  },

  calculateProRatedBalance: (annualDays, joiningDate) => {
    const joining = new Date(joiningDate);
    const yearEnd = new Date(joining.getFullYear(), 11, 31); // December 31
    const totalDaysInYear = 365;
    const daysRemaining = Math.ceil((yearEnd - joining) / (1000 * 60 * 60 * 24));

    return Math.ceil((annualDays * daysRemaining) / totalDaysInYear);
  },

  processMonthlyAccrual: (userId) => {
    const data = LeaveBalance.getAll();
    const index = data.findIndex((b) => b.userId == userId);
    if (index === -1) return null;

    const balance = data[index];
    const now = new Date();
    const LeavePolicy = require("./leavePolicyModel");

    // Process each leave type with monthly accrual
    Object.keys(balance.accruals).forEach((code) => {
      const accrualRate = balance.accruals[code];
      if (accrualRate > 0) {
        const lastAccrual = new Date(balance.lastAccrual[code]);
        const monthsDiff = (now.getFullYear() - lastAccrual.getFullYear()) * 12 + (now.getMonth() - lastAccrual.getMonth());

        if (monthsDiff > 0) {
          // Accrue for each month that has passed
          const policy = LeavePolicy.findByCode(code);
          const accrued = accrualRate * monthsDiff;

          balance.balances[code] = (balance.balances[code] || 0) + accrued;

          // Cap at max if policy defines one
          if (policy && policy.defaultDays) {
            balance.balances[code] = Math.min(balance.balances[code], policy.defaultDays);
          }

          balance.lastAccrual[code] = now.toISOString();
        }
      }
    });

    balance.updatedAt = now.toISOString();
    data[index] = balance;
    LeaveBalance.saveAll(data);
    return balance;
  },

  updateBalance: (userId, leaveType, days, operation = "deduct") => {
    const data = LeaveBalance.getAll();
    const index = data.findIndex((b) => b.userId == userId);
    if (index === -1) return null;

    const type = leaveType.toLowerCase();

    if (operation === "deduct") {
      data[index].balances[type] = (data[index].balances[type] || 0) - days;
    } else if (operation === "restore") {
      data[index].balances[type] = (data[index].balances[type] || 0) + days;
    } else if (operation === "set") {
      data[index].balances[type] = days;
    }

    data[index].updatedAt = new Date().toISOString();
    LeaveBalance.saveAll(data);
    return data[index];
  },

  processCarryOver: (userId, year) => {
    const LeavePolicy = require("./leavePolicyModel");
    const policies = LeavePolicy.getActive();

    const data = LeaveBalance.getAll();
    const index = data.findIndex((b) => b.userId == userId && b.year === year);
    if (index === -1) return null;

    const balance = data[index];
    const newYearBalance = {
      userId,
      year: year + 1,
      balances: {},
      accruals: { ...balance.accruals },
      carryOvers: {},
      lastAccrual: { ...balance.lastAccrual },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policies.forEach((policy) => {
      const code = policy.code.toLowerCase();
      const currentBalance = balance.balances[code] || 0;

      if (policy.carryOverAllowed && currentBalance > 0) {
        // Calculate carry-over amount
        const carryOver = Math.min(currentBalance, policy.maxCarryOverDays || currentBalance);
        newYearBalance.carryOvers[code] = carryOver;
        newYearBalance.balances[code] = carryOver + (policy.defaultDays || 0);
      } else {
        // No carry-over, start fresh
        newYearBalance.carryOvers[code] = 0;
        newYearBalance.balances[code] = policy.defaultDays || 0;
      }
    });

    data.push(newYearBalance);
    LeaveBalance.saveAll(data);
    return newYearBalance;
  },

  // Adjust balance manually (HR operation)
  adjustBalance: (userId, leaveType, days, reason, adjustedBy) => {
    const LeaveAdjustment = require("./leaveAdjustmentModel");

    const result = LeaveBalance.updateBalance(userId, leaveType, days, "set");

    if (result) {
      // Record adjustment in audit trail
      LeaveAdjustment.create({
        userId,
        leaveType: leaveType.toLowerCase(),
        previousBalance: result.balances[leaveType.toLowerCase()] - days,
        newBalance: result.balances[leaveType.toLowerCase()],
        adjustment: days,
        reason,
        adjustedBy,
        adjustedAt: new Date().toISOString(),
      });
    }

    return result;
  },

  getBalanceHistory: (userId) => {
    const LeaveAdjustment = require("./leaveAdjustmentModel");
    return LeaveAdjustment.getByUserId(userId);
  },

  // Legacy compatibility method
  annual: null,
  sick: null,
  casual: null,
};

module.exports = LeaveBalance;
