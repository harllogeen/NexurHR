const {
  getPayrollConfig,
  getEmployeeConfig,
  upsertEmployeeConfig,
} = require("../models/payrollConfigModel");
const { getEmployees } = require("../models/employeeModel");

// Get all payroll configurations
const getAllConfigs = (req, res) => {
  const configs = getPayrollConfig();
  const employees = getEmployees();

  // Enrich with employee names
  const enrichedConfigs = configs.map((config) => {
    const emp = employees.find((e) => e.id == config.employeeId);
    return {
      ...config,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
      department: emp?.department || "",
    };
  });

  res.status(200).json(enrichedConfigs);
};

// Get config for specific employee
const getConfigByEmployee = (req, res) => {
  const { employeeId } = req.params;
  const config = getEmployeeConfig(employeeId);

  if (!config) {
    // Return default empty config
    return res.status(200).json({
      employeeId,
      loans: [],
      allowances: [],
      deductions: [],
      bonus: 0,
      overtimeRate: 1.5,
      latePenaltyPerMinute: 0,
    });
  }

  res.status(200).json(config);
};

// Create or update employee payroll config
const saveConfig = (req, res) => {
  const { employeeId } = req.params;
  const {
    loans,
    allowances,
    deductions,
    bonus,
    overtimeRate,
    latePenaltyPerMinute,
  } = req.body;

  const config = upsertEmployeeConfig(employeeId, {
    loans: loans || [],
    allowances: allowances || [],
    deductions: deductions || [],
    bonus: bonus || 0,
    overtimeRate: overtimeRate || 1.5,
    latePenaltyPerMinute: latePenaltyPerMinute || 0,
  });

  res.status(200).json(config);
};

// Add a loan to employee
const addLoan = (req, res) => {
  const { employeeId } = req.params;
  const { amount, monthlyDeduction, description, startDate } = req.body;

  const config = getEmployeeConfig(employeeId) || {
    loans: [],
    allowances: [],
    deductions: [],
    bonus: 0,
    overtimeRate: 1.5,
    latePenaltyPerMinute: 0,
  };

  const loan = {
    id: Date.now(),
    amount: amount || 0,
    balance: amount || 0,
    monthlyDeduction: monthlyDeduction || 0,
    description: description || "Loan",
    startDate: startDate || new Date().toISOString().split("T")[0],
    status: "Active",
  };

  config.loans = config.loans || [];
  config.loans.push(loan);

  const updated = upsertEmployeeConfig(employeeId, config);
  res.status(200).json(updated);
};

// Update loan balance (called after payroll deduction)
const updateLoanBalance = (employeeId, loanId, deductedAmount) => {
  const config = getEmployeeConfig(employeeId);
  if (!config || !config.loans) return;

  const loanIndex = config.loans.findIndex((l) => l.id == loanId);
  if (loanIndex >= 0) {
    config.loans[loanIndex].balance -= deductedAmount;
    if (config.loans[loanIndex].balance <= 0) {
      config.loans[loanIndex].balance = 0;
      config.loans[loanIndex].status = "Paid";
    }
    upsertEmployeeConfig(employeeId, config);
  }
};

// Add allowance
const addAllowance = (req, res) => {
  const { employeeId } = req.params;
  const { type, amount, description } = req.body;

  const config = getEmployeeConfig(employeeId) || {
    loans: [],
    allowances: [],
    deductions: [],
    bonus: 0,
    overtimeRate: 1.5,
    latePenaltyPerMinute: 0,
  };

  const allowance = {
    id: Date.now(),
    type: type || "Other",
    amount: amount || 0,
    description: description || "",
    isActive: true,
  };

  config.allowances = config.allowances || [];
  config.allowances.push(allowance);

  const updated = upsertEmployeeConfig(employeeId, config);
  res.status(200).json(updated);
};

// Add deduction
const addDeduction = (req, res) => {
  const { employeeId } = req.params;
  const { type, amount, description, isPercentage } = req.body;

  const config = getEmployeeConfig(employeeId) || {
    loans: [],
    allowances: [],
    deductions: [],
    bonus: 0,
    overtimeRate: 1.5,
    latePenaltyPerMinute: 0,
  };

  const deduction = {
    id: Date.now(),
    type: type || "Other",
    amount: amount || 0,
    description: description || "",
    isPercentage: isPercentage || false,
    isActive: true,
  };

  config.deductions = config.deductions || [];
  config.deductions.push(deduction);

  const updated = upsertEmployeeConfig(employeeId, config);
  res.status(200).json(updated);
};

// Remove item (loan/allowance/deduction)
const removeItem = (req, res) => {
  const { employeeId, itemType, itemId } = req.params;

  const config = getEmployeeConfig(employeeId);
  if (!config) {
    return res.status(404).json({ message: "Config not found" });
  }

  if (itemType === "loan") {
    config.loans = (config.loans || []).filter((l) => l.id != itemId);
  } else if (itemType === "allowance") {
    config.allowances = (config.allowances || []).filter((a) => a.id != itemId);
  } else if (itemType === "deduction") {
    config.deductions = (config.deductions || []).filter((d) => d.id != itemId);
  }

  const updated = upsertEmployeeConfig(employeeId, config);
  res.status(200).json(updated);
};

module.exports = {
  getAllConfigs,
  getConfigByEmployee,
  saveConfig,
  addLoan,
  addAllowance,
  addDeduction,
  removeItem,
  updateLoanBalance,
};
