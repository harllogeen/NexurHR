const { getLeaves } = require("../models/leaveModel");
const LeaveBalance = require("../models/leaveBalanceModel");
const LeavePolicy = require("../models/leavePolicyModel");
const { getUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");
const { hasPermission } = require("../utils/permissions");

/**
 * Leave Analytics & Reports Controller
 * Provides insights, statistics, and trends for leave management
 */

// Get leave dashboard statistics
const getDashboardStats = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  console.log('Dashboard stats requested by:', actor);

  if (!hasPermission(actor, "view-all", "leave")) {
    console.log('Permission denied for dashboard stats');
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const leaves = getLeaves();
    const today = new Date().toISOString().split("T")[0];

    console.log('Processing', leaves.length, 'leaves for dashboard stats');

    // Current statistics
    const stats = {
      totalRequests: leaves.length,
      pending: leaves.filter((l) => l.status === "Pending").length,
      pendingCount: leaves.filter((l) => l.status === "Pending").length,
      approved: leaves.filter((l) => l.status === "Approved").length,
      approvedThisMonth: leaves.filter((l) => {
        const leaveDate = new Date(l.createdAt || l.appliedAt);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        return l.status === "Approved" && 
               leaveDate.getMonth() === thisMonth && 
               leaveDate.getFullYear() === thisYear;
      }).length,
      rejected: leaves.filter((l) => l.status === "Rejected").length,
      cancelled: leaves.filter((l) => l.status === "Cancelled").length,
      onLeaveToday: leaves.filter(
        (l) => l.status === "Approved" && l.startDate <= today && l.endDate >= today
      ).length,
      upcomingLeaves: leaves.filter(
        (l) => l.status === "Approved" && l.startDate > today
      ).length,
      upcomingCount: leaves.filter(
        (l) => l.status === "Approved" && l.startDate > today
      ).length,
      
      // Additional fields for dashboard cards
      totalEmployees: 0,
      upcomingDays: leaves.filter(
        (l) => l.status === "Approved" && l.startDate > today
      ).reduce((sum, l) => sum + (l.days || 0), 0),
      
      // Trends
      pendingTrend: 'neutral',
      pendingChange: 0,
      approvedTrend: 'neutral',
      approvedChange: 0,
    };

    console.log('Dashboard stats calculated:', stats);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard statistics", error: error.message });
  }
};

// Get leave utilization by type
const getLeaveUtilization = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { year } = req.query;
    const filterYear = year ? parseInt(year) : new Date().getFullYear();

    const leaves = getLeaves().filter((l) => {
      const leaveYear = new Date(l.startDate).getFullYear();
      return leaveYear === filterYear && l.status === "Approved";
    });

    const policies = LeavePolicy.getActive();
    const utilization = {};

    policies.forEach((policy) => {
      const policyLeaves = leaves.filter((l) => l.leaveType === policy.code);
      const totalDays = policyLeaves.reduce((sum, l) => sum + (l.days || 0), 0);

      utilization[policy.code] = {
        name: policy.name,
        code: policy.code,
        color: policy.color,
        totalRequests: policyLeaves.length,
        totalDays,
        averageDays: policyLeaves.length > 0 ? (totalDays / policyLeaves.length).toFixed(1) : 0,
      };
    });

    res.status(200).json({
      year: filterYear,
      utilization,
    });
  } catch (error) {
    console.error("Error fetching utilization:", error);
    res.status(500).json({ message: "Failed to fetch leave utilization" });
  }
};

// Get department-wise leave statistics
const getDepartmentStats = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { year } = req.query;
    const filterYear = year ? parseInt(year) : new Date().getFullYear();

    const leaves = getLeaves().filter((l) => {
      const leaveYear = new Date(l.startDate).getFullYear();
      return leaveYear === filterYear && l.status === "Approved";
    });

    const departments = {};

    leaves.forEach((leave) => {
      const dept = leave.department || "Unassigned";
      if (!departments[dept]) {
        departments[dept] = {
          department: dept,
          totalRequests: 0,
          totalDays: 0,
          employees: new Set(),
        };
      }

      departments[dept].totalRequests++;
      departments[dept].totalDays += leave.days || 0;
      departments[dept].employees.add(leave.userId);
    });

    const stats = Object.values(departments).map((dept) => ({
      department: dept.department,
      totalRequests: dept.totalRequests,
      totalDays: dept.totalDays,
      uniqueEmployees: dept.employees.size,
      averageDaysPerEmployee: (dept.totalDays / dept.employees.size).toFixed(1),
    }));

    res.status(200).json({
      year: filterYear,
      departments: stats,
    });
  } catch (error) {
    console.error("Error fetching department stats:", error);
    res.status(500).json({ message: "Failed to fetch department statistics" });
  }
};

// Get monthly leave trends
const getMonthlyTrends = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { year } = req.query;
    const filterYear = year ? parseInt(year) : new Date().getFullYear();

    const leaves = getLeaves().filter((l) => {
      const leaveYear = new Date(l.startDate).getFullYear();
      return leaveYear === filterYear && l.status === "Approved";
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(filterYear, i).toLocaleString("default", { month: "short" }),
      requests: 0,
      days: 0,
    }));

    leaves.forEach((leave) => {
      const month = new Date(leave.startDate).getMonth();
      monthlyData[month].requests++;
      monthlyData[month].days += leave.days || 0;
    });

    res.status(200).json({
      year: filterYear,
      trends: monthlyData,
    });
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    res.status(500).json({ message: "Failed to fetch monthly trends" });
  }
};

// Get employee leave summary
const getEmployeeLeaveSummary = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { year } = req.query;
    const filterYear = year ? parseInt(year) : new Date().getFullYear();

    const leaves = getLeaves().filter((l) => {
      const leaveYear = new Date(l.startDate).getFullYear();
      return leaveYear === filterYear && l.status === "Approved";
    });

    const users = getUsers();
    const employees = getEmployees();
    const balances = LeaveBalance.getAll();

    const employeeSummary = {};

    leaves.forEach((leave) => {
      if (!employeeSummary[leave.userId]) {
        employeeSummary[leave.userId] = {
          userId: leave.userId,
          totalRequests: 0,
          totalDays: 0,
          byType: {},
        };
      }

      const summary = employeeSummary[leave.userId];
      summary.totalRequests++;
      summary.totalDays += leave.days || 0;

      if (!summary.byType[leave.leaveType]) {
        summary.byType[leave.leaveType] = { requests: 0, days: 0 };
      }
      summary.byType[leave.leaveType].requests++;
      summary.byType[leave.leaveType].days += leave.days || 0;
    });

    // Enrich with employee details and balances
    const enrichedSummary = Object.values(employeeSummary).map((summary) => {
      const user = users.find((u) => u.id == summary.userId);
      let employeeName = `User ${summary.userId}`;
      let department = "N/A";

      if (user && user.employeeId) {
        const employee = employees.find((e) => e.id === user.employeeId);
        if (employee) {
          employeeName = `${employee.firstName} ${employee.lastName}`;
          department = employee.department || "N/A";
        }
      }

      const balance = balances.find((b) => b.userId == summary.userId);

      return {
        ...summary,
        employeeName,
        department,
        currentBalance: balance ? balance.balances : {},
      };
    });

    // Sort by total days taken (descending)
    enrichedSummary.sort((a, b) => b.totalDays - a.totalDays);

    res.status(200).json({
      year: filterYear,
      employees: enrichedSummary,
    });
  } catch (error) {
    console.error("Error fetching employee summary:", error);
    res.status(500).json({ message: "Failed to fetch employee leave summary" });
  }
};

// Get upcoming leaves (next 30 days)
const getUpcomingLeaves = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "view-all", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { days } = req.query;
    const daysAhead = days ? parseInt(days) : 30;

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const leaves = getLeaves().filter((l) => {
      return l.status === "Approved" && l.startDate >= todayStr && l.startDate <= futureStr;
    });

    const users = getUsers();
    const employees = getEmployees();

    const enriched = leaves.map((leave) => {
      const user = users.find((u) => u.id == leave.userId);
      let employeeName = `User ${leave.userId}`;
      let department = "N/A";

      if (user && user.employeeId) {
        const employee = employees.find((e) => e.id === user.employeeId);
        if (employee) {
          employeeName = `${employee.firstName} ${employee.lastName}`;
          department = employee.department || "N/A";
        }
      }

      return {
        ...leave,
        employeeName,
        department,
      };
    });

    // Sort by start date
    enriched.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.status(200).json({
      period: {
        from: todayStr,
        to: futureStr,
        days: daysAhead,
      },
      upcomingLeaves: enriched,
    });
  } catch (error) {
    console.error("Error fetching upcoming leaves:", error);
    res.status(500).json({ message: "Failed to fetch upcoming leaves" });
  }
};

// Get leave balance overview (all employees)
const getBalanceOverview = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  console.log('Balance overview requested by:', actor);

  if (!hasPermission(actor, "view-all", "leave")) {
    console.log('Permission denied for balance overview');
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const balances = LeaveBalance.getAll();
    const policies = LeavePolicy.getActive();
    const users = getUsers();
    const employees = getEmployees();

    console.log('Processing balance overview:', {
      balancesCount: balances.length,
      policiesCount: policies.length,
      usersCount: users.length,
      employeesCount: employees.length
    });

    const overview = [];
    
    balances.forEach((balance) => {
      const user = users.find((u) => u.id == balance.userId);
      let employeeName = `User ${balance.userId}`;
      let department = "N/A";

      if (user && user.employeeId) {
        const employee = employees.find((e) => e.id === user.employeeId);
        if (employee) {
          employeeName = `${employee.firstName} ${employee.lastName}`;
          department = employee.department || "N/A";
        }
      }

      // Handle both array and object formats
      let balancesData = {};
      if (Array.isArray(balance.balances)) {
        // Old format: array of objects with leaveType
        balance.balances.forEach(item => {
          balancesData[item.leaveType] = item.balance || 0;
        });
      } else if (typeof balance.balances === 'object') {
        // New format: object with leave types as keys
        balancesData = balance.balances || {};
      }

      // Flatten balances - create one row per leave type with low/negative balance
      policies.forEach((policy) => {
        const available = balancesData[policy.code] || 0;
        
        // Only include low or negative balances in overview (critical alerts)
        if (available < 5) {
          overview.push({
            userId: balance.userId,
            employeeName,
            department,
            leaveType: policy.name,
            available,
            lastUpdated: balance.updatedAt,
          });
        }
      });
    });

    console.log('Balance overview calculated:', overview.length, 'records');

    res.status(200).json({
      totalEmployees: overview.length,
      policies: policies.map((p) => ({ code: p.code, name: p.name, color: p.color })),
      overview: overview, // Change from 'balances' to 'overview' to match frontend expectation
    });
  } catch (error) {
    console.error("Error fetching balance overview:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Failed to fetch balance overview", error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getLeaveUtilization,
  getDepartmentStats,
  getMonthlyTrends,
  getEmployeeLeaveSummary,
  getUpcomingLeaves,
  getBalanceOverview,
};
