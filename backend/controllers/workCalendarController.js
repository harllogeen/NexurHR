const { WorkCalendar, PublicHoliday } = require("../models/workCalendarModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");

/**
 * Work Calendar Management Controller
 * Handles working days, weekends, and public holidays
 */

// ========================================
// WORK CALENDAR ENDPOINTS
// ========================================

// Get all work calendars
const getAllCalendars = (req, res) => {
  try {
    const calendars = WorkCalendar.getAll();
    res.status(200).json(calendars);
  } catch (error) {
    console.error("Error fetching work calendars:", error);
    res.status(500).json({ message: "Failed to fetch work calendars" });
  }
};

// Get default calendar
const getDefaultCalendar = (req, res) => {
  try {
    const calendar = WorkCalendar.getDefault();
    res.status(200).json(calendar);
  } catch (error) {
    console.error("Error fetching default calendar:", error);
    res.status(500).json({ message: "Failed to fetch default calendar" });
  }
};

// Get calendar by ID
const getCalendarById = (req, res) => {
  try {
    const { id } = req.params;
    const calendar = WorkCalendar.findById(id);

    if (!calendar) {
      return res.status(404).json({ message: "Calendar not found" });
    }

    res.status(200).json(calendar);
  } catch (error) {
    console.error("Error fetching calendar:", error);
    res.status(500).json({ message: "Failed to fetch calendar" });
  }
};

// Get calendar for a department
const getCalendarByDepartment = (req, res) => {
  try {
    const { department } = req.params;
    const calendar = WorkCalendar.getByDepartment(department);

    res.status(200).json(calendar);
  } catch (error) {
    console.error("Error fetching department calendar:", error);
    res.status(500).json({ message: "Failed to fetch department calendar" });
  }
};

// Create new work calendar
const createCalendar = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-calendars", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const calendarData = req.body;

    // Validate required fields
    if (!calendarData.name || !calendarData.workingDays) {
      return res.status(400).json({ message: "Calendar name and working days are required" });
    }

    // Validate working days format (should be array of 0-6)
    if (!Array.isArray(calendarData.workingDays)) {
      return res.status(400).json({ message: "Working days must be an array" });
    }

    const newCalendar = WorkCalendar.create(calendarData);

    recordAuditLog({
      actorId: actor.id,
      action: "create-work-calendar",
      targetId: newCalendar.id,
      details: `Created work calendar: ${newCalendar.name}`,
    });

    res.status(201).json({
      message: "Work calendar created successfully",
      calendar: newCalendar,
    });
  } catch (error) {
    console.error("Error creating work calendar:", error);
    res.status(500).json({ message: "Failed to create work calendar" });
  }
};

// Update work calendar
const updateCalendar = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-calendars", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedCalendar = WorkCalendar.update(id, updates);

    if (!updatedCalendar) {
      return res.status(404).json({ message: "Calendar not found" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "update-work-calendar",
      targetId: id,
      details: `Updated work calendar: ${updatedCalendar.name}`,
    });

    res.status(200).json({
      message: "Work calendar updated successfully",
      calendar: updatedCalendar,
    });
  } catch (error) {
    console.error("Error updating work calendar:", error);
    res.status(500).json({ message: "Failed to update work calendar" });
  }
};

// Delete work calendar
const deleteCalendar = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-calendars", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { id } = req.params;

    const calendar = WorkCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({ message: "Calendar not found" });
    }

    const success = WorkCalendar.delete(id);

    if (!success) {
      return res.status(400).json({ message: "Cannot delete the last calendar or default calendar" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "delete-work-calendar",
      targetId: id,
      details: `Deleted work calendar: ${calendar.name}`,
    });

    res.status(200).json({ message: "Work calendar deleted successfully" });
  } catch (error) {
    console.error("Error deleting work calendar:", error);
    res.status(500).json({ message: "Failed to delete work calendar" });
  }
};

// Calculate working days between dates
const calculateWorkingDays = (req, res) => {
  try {
    const { startDate, endDate, calendarId, excludeHolidays } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const workingDays = WorkCalendar.calculateWorkingDays(
      startDate,
      endDate,
      calendarId || null,
      excludeHolidays !== "false"
    );

    res.status(200).json({
      startDate,
      endDate,
      workingDays,
      calendarId: calendarId || "default",
    });
  } catch (error) {
    console.error("Error calculating working days:", error);
    res.status(500).json({ message: "Failed to calculate working days" });
  }
};

// ========================================
// PUBLIC HOLIDAY ENDPOINTS
// ========================================

// Get all public holidays
const getAllHolidays = (req, res) => {
  try {
    const { year, department } = req.query;

    let holidays;
    if (year) {
      holidays = PublicHoliday.getByYear(parseInt(year));
    } else if (department) {
      holidays = PublicHoliday.getByDepartment(department, year ? parseInt(year) : null);
    } else {
      holidays = PublicHoliday.getAll();
    }

    res.status(200).json(holidays);
  } catch (error) {
    console.error("Error fetching public holidays:", error);
    res.status(500).json({ message: "Failed to fetch public holidays" });
  }
};

// Get holidays by date range
const getHolidaysByDateRange = (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const holidays = PublicHoliday.getByDateRange(startDate, endDate);
    res.status(200).json(holidays);
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
};

// Create public holiday
const createHoliday = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-calendars", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const holidayData = req.body;

    // Validate required fields
    if (!holidayData.name || !holidayData.date) {
      return res.status(400).json({ message: "Holiday name and date are required" });
    }

    // Set defaults
    const newHolidayData = {
      name: holidayData.name,
      date: holidayData.date,
      isRecurring: holidayData.isRecurring || false,
      recurringPattern: holidayData.recurringPattern || null,
      departments: holidayData.departments || [],
      description: holidayData.description || "",
    };

    const newHoliday = PublicHoliday.create(newHolidayData);

    recordAuditLog({
      actorId: actor.id,
      action: "create-public-holiday",
      targetId: newHoliday.id,
      details: `Created public holiday: ${newHoliday.name} on ${newHoliday.date}`,
    });

    res.status(201).json({
      message: "Public holiday created successfully",
      holiday: newHoliday,
    });
  } catch (error) {
    console.error("Error creating public holiday:", error);
    res.status(500).json({ message: "Failed to create public holiday" });
  }
};

// Update public holiday
const updateHoliday = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-calendars", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedHoliday = PublicHoliday.update(id, updates);

    if (!updatedHoliday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "update-public-holiday",
      targetId: id,
      details: `Updated public holiday: ${updatedHoliday.name}`,
    });

    res.status(200).json({
      message: "Public holiday updated successfully",
      holiday: updatedHoliday,
    });
  } catch (error) {
    console.error("Error updating public holiday:", error);
    res.status(500).json({ message: "Failed to update public holiday" });
  }
};

// Delete public holiday
const deleteHoliday = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };

  if (!hasPermission(actor, "manage-calendars", "leave")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  try {
    const { id } = req.params;

    const holiday = PublicHoliday.getAll().find((h) => h.id == id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    const success = PublicHoliday.delete(id);

    if (!success) {
      return res.status(400).json({ message: "Failed to delete holiday" });
    }

    recordAuditLog({
      actorId: actor.id,
      action: "delete-public-holiday",
      targetId: id,
      details: `Deleted public holiday: ${holiday.name}`,
    });

    res.status(200).json({ message: "Public holiday deleted successfully" });
  } catch (error) {
    console.error("Error deleting public holiday:", error);
    res.status(500).json({ message: "Failed to delete public holiday" });
  }
};

module.exports = {
  // Work calendars
  getAllCalendars,
  getDefaultCalendar,
  getCalendarById,
  getCalendarByDepartment,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  calculateWorkingDays,
  // Public holidays
  getAllHolidays,
  getHolidaysByDateRange,
  createHoliday,
  updateHoliday,
  deleteHoliday,
};
