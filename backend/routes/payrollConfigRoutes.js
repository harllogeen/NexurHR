const express = require("express");
const router = express.Router();
const payrollConfigController = require("../controllers/payrollConfigController");
const {
  verifyToken,
  isAdmin,
  isAccountant,
} = require("../middleware/authMiddleware");

// Get all payroll configurations
router.get("/", [verifyToken, isAdmin], payrollConfigController.getAllConfigs);

// Get config for specific employee
router.get(
  "/:employeeId",
  [verifyToken, isAdmin],
  payrollConfigController.getConfigByEmployee,
);

// Save/update employee payroll config
router.put(
  "/:employeeId",
  [verifyToken, isAccountant],
  payrollConfigController.saveConfig,
);

// Add loan to employee
router.post(
  "/:employeeId/loan",
  [verifyToken, isAccountant],
  payrollConfigController.addLoan,
);

// Add allowance to employee
router.post(
  "/:employeeId/allowance",
  [verifyToken, isAccountant],
  payrollConfigController.addAllowance,
);

// Add deduction to employee
router.post(
  "/:employeeId/deduction",
  [verifyToken, isAccountant],
  payrollConfigController.addDeduction,
);

// Remove item (loan/allowance/deduction)
router.delete(
  "/:employeeId/:itemType/:itemId",
  [verifyToken, isAccountant],
  payrollConfigController.removeItem,
);

module.exports = router;
