const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payrollController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.get(
  "/generate",
  [verifyToken, isAdmin],
  payrollController.generatePayroll,
);
router.get("/data", [verifyToken, isAdmin], payrollController.getPayrollData);
router.get(
  "/export",
  [verifyToken, isAdmin],
  payrollController.exportPayrollCSV,
);
router.get("/my-payslip", verifyToken, payrollController.getMyPayslip);
router.patch(
  "/:id/status",
  [verifyToken, isAdmin],
  payrollController.updatePayrollStatus,
);

module.exports = router;
