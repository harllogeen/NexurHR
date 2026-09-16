const express = require("express");
const router = express.Router();
const workCalendarController = require("../controllers/workCalendarController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/**
 * Work Calendar & Public Holiday Routes
 * Base path: /api/work-calendar
 */

// ========================================
// WORK CALENDAR ROUTES
// ========================================

// Get all calendars (HR only)
router.get("/calendars/all", [verifyToken, isAdmin], workCalendarController.getAllCalendars);

// Get default calendar (all users)
router.get("/calendars/default", verifyToken, workCalendarController.getDefaultCalendar);

// Calculate working days between dates (all users)
router.get("/calculate-working-days", verifyToken, workCalendarController.calculateWorkingDays);

// Get calendar by ID
router.get("/calendars/:id", verifyToken, workCalendarController.getCalendarById);

// Get calendar for department
router.get("/calendars/department/:department", verifyToken, workCalendarController.getCalendarByDepartment);

// Create calendar (HR only)
router.post("/calendars", [verifyToken, isAdmin], workCalendarController.createCalendar);

// Update calendar (HR only)
router.patch("/calendars/:id", [verifyToken, isAdmin], workCalendarController.updateCalendar);

// Delete calendar (HR only)
router.delete("/calendars/:id", [verifyToken, isAdmin], workCalendarController.deleteCalendar);

// ========================================
// PUBLIC HOLIDAY ROUTES
// ========================================

// Get all holidays (with optional filters: year, department)
router.get("/holidays", verifyToken, workCalendarController.getAllHolidays);

// Get holidays by date range
router.get("/holidays/range", verifyToken, workCalendarController.getHolidaysByDateRange);

// Create holiday (HR only)
router.post("/holidays", [verifyToken, isAdmin], workCalendarController.createHoliday);

// Update holiday (HR only)
router.patch("/holidays/:id", [verifyToken, isAdmin], workCalendarController.updateHoliday);

// Delete holiday (HR only)
router.delete("/holidays/:id", [verifyToken, isAdmin], workCalendarController.deleteHoliday);

module.exports = router;
