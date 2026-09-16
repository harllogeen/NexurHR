const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.post("/clock-in", verifyToken, attendanceController.clockIn);
router.post("/clock-out", verifyToken, attendanceController.clockOut);
router.get("/my-attendance", verifyToken, attendanceController.getMyAttendance);
router.get("/summary", verifyToken, attendanceController.getAttendanceSummary);
router.get("/heatmap", verifyToken, attendanceController.getAttendanceHeatmap);
router.post("/manual-adjustment", [verifyToken, isAdmin], attendanceController.manualAdjustment);
router.get("/all", [verifyToken, isAdmin], attendanceController.getAllAttendance);

// New routes for schedule comparison
router.get("/with-schedule", verifyToken, attendanceController.getAttendanceWithScheduleComparison);
router.get("/range-with-schedule", verifyToken, attendanceController.getAttendanceByRangeWithSchedule);
router.get("/team-with-schedule", [verifyToken, isAdmin], attendanceController.getTeamAttendanceComparison);

module.exports = router;
