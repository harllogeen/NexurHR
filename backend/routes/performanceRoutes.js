const express = require("express");
const router = express.Router();
const performanceController = require("../controllers/performanceController");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

router.post("/goals", verifyToken, performanceController.createGoal);
router.get(
  "/my-performance",
  verifyToken,
  performanceController.getMyPerformance,
);
router.get(
  "/all",
  verifyToken,
  checkRole(["hr", "manager"]),
  performanceController.getAllPerformance,
);
router.get(
  "/team",
  verifyToken,
  performanceController.getTeamPerformance,
);
router.patch(
  "/:id",
  verifyToken,
  performanceController.updatePerformance, // Removed checkRole so employees can update their own progress
);
router.post(
  "/:id/feedback",
  verifyToken,
  performanceController.addFeedback,
);

module.exports = router;
