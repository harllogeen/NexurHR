const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/workCalendars.json");

/**
 * Work Calendar Model
 * Manages organization working days, weekends, and holidays
 */

const WorkCalendar = {
  getAll: () => {
    if (!fs.existsSync(dataPath)) {
      // Initialize with default calendar
      const defaultCalendars = [
        {
          id: 1,
          name: "Default Organization Calendar",
          description: "Standard Monday to Friday working schedule",
          isDefault: true,
          workingDays: [1, 2, 3, 4, 5], // 0=Sunday, 1=Monday, ..., 6=Saturday
          weekendDays: [0, 6], // Sunday and Saturday
          departments: [], // Empty means applies to all
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      fs.writeFileSync(dataPath, JSON.stringify(defaultCalendars, null, 2));
      return defaultCalendars;
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },

  saveAll: (calendars) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(calendars, null, 2));
  },

  findById: (id) => {
    const calendars = WorkCalendar.getAll();
    return calendars.find((c) => c.id == id);
  },

  getDefault: () => {
    const calendars = WorkCalendar.getAll();
    return calendars.find((c) => c.isDefault) || calendars[0];
  },

  getByDepartment: (department) => {
    const calendars = WorkCalendar.getAll();
    const departmentCalendar = calendars.find(
      (c) => c.departments && c.departments.length > 0 && c.departments.includes(department)
    );
    return departmentCalendar || WorkCalendar.getDefault();
  },

  create: (calendarData) => {
    const calendars = WorkCalendar.getAll();
    const newCalendar = {
      id: Math.max(0, ...calendars.map((c) => c.id)) + 1,
      ...calendarData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    calendars.push(newCalendar);
    WorkCalendar.saveAll(calendars);
    return newCalendar;
  },

  update: (id, updates) => {
    const calendars = WorkCalendar.getAll();
    const index = calendars.findIndex((c) => c.id == id);
    if (index === -1) return null;

    calendars[index] = {
      ...calendars[index],
      ...updates,
      id: calendars[index].id,
      updatedAt: new Date().toISOString(),
    };
    WorkCalendar.saveAll(calendars);
    return calendars[index];
  },

  delete: (id) => {
    const calendars = WorkCalendar.getAll();
    const index = calendars.findIndex((c) => c.id == id);
    if (index === -1) return false;

    // Prevent deletion of default calendar if it's the only one
    if (calendars[index].isDefault && calendars.length === 1) {
      return false;
    }

    calendars.splice(index, 1);
    WorkCalendar.saveAll(calendars);
    return true;
  },

  isWorkingDay: (date, calendarId = null) => {
    const calendar = calendarId ? WorkCalendar.findById(calendarId) : WorkCalendar.getDefault();
    if (!calendar) return true; // Fallback to assuming it's a working day

    const dayOfWeek = new Date(date).getDay();
    return calendar.workingDays.includes(dayOfWeek);
  },

  calculateWorkingDays: (startDate, endDate, calendarId = null, excludeHolidays = true) => {
    const calendar = calendarId ? WorkCalendar.findById(calendarId) : WorkCalendar.getDefault();
    if (!calendar) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    const current = new Date(start);

    // Get holidays if we need to exclude them
    const holidays = excludeHolidays ? PublicHoliday.getByDateRange(startDate, endDate) : [];
    const holidayDates = new Set(holidays.map((h) => h.date));

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateString = current.toISOString().split("T")[0];

      // Check if it's a working day and not a holiday
      if (calendar.workingDays.includes(dayOfWeek) && !holidayDates.has(dateString)) {
        workingDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  },
};

// Public Holiday Model - stored separately
const holidayDataPath = path.join(__dirname, "../data/publicHolidays.json");

const PublicHoliday = {
  getAll: () => {
    if (!fs.existsSync(holidayDataPath)) {
      // Initialize with common holidays for 2026-2027
      const defaultHolidays = [
        {
          id: 1,
          name: "New Year's Day",
          date: "2026-01-01",
          isRecurring: true,
          recurringPattern: "MM-DD", // Jan 1st every year
          departments: [],
          description: "New Year's Day celebration",
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Christmas Day",
          date: "2026-12-25",
          isRecurring: true,
          recurringPattern: "12-25",
          departments: [],
          description: "Christmas celebration",
          createdAt: new Date().toISOString(),
        },
        {
          id: 3,
          name: "New Year's Day 2027",
          date: "2027-01-01",
          isRecurring: true,
          recurringPattern: "01-01",
          departments: [],
          description: "New Year's Day celebration",
          createdAt: new Date().toISOString(),
        },
      ];
      fs.writeFileSync(holidayDataPath, JSON.stringify(defaultHolidays, null, 2));
      return defaultHolidays;
    }
    return JSON.parse(fs.readFileSync(holidayDataPath, "utf8"));
  },

  saveAll: (holidays) => {
    const dir = path.dirname(holidayDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(holidayDataPath, JSON.stringify(holidays, null, 2));
  },

  getByYear: (year) => {
    const holidays = PublicHoliday.getAll();
    return holidays.filter((h) => new Date(h.date).getFullYear() === year);
  },

  getByDateRange: (startDate, endDate) => {
    const holidays = PublicHoliday.getAll();
    return holidays.filter((h) => h.date >= startDate && h.date <= endDate);
  },

  getByDepartment: (department, year = null) => {
    let holidays = PublicHoliday.getAll();

    // Filter by department (empty departments array means applies to all)
    holidays = holidays.filter((h) => h.departments.length === 0 || h.departments.includes(department));

    // Filter by year if provided
    if (year) {
      holidays = holidays.filter((h) => new Date(h.date).getFullYear() === year);
    }

    return holidays;
  },

  create: (holidayData) => {
    const holidays = PublicHoliday.getAll();
    const newHoliday = {
      id: Math.max(0, ...holidays.map((h) => h.id)) + 1,
      ...holidayData,
      createdAt: new Date().toISOString(),
    };
    holidays.push(newHoliday);
    PublicHoliday.saveAll(holidays);
    return newHoliday;
  },

  update: (id, updates) => {
    const holidays = PublicHoliday.getAll();
    const index = holidays.findIndex((h) => h.id == id);
    if (index === -1) return null;

    holidays[index] = {
      ...holidays[index],
      ...updates,
      id: holidays[index].id,
    };
    PublicHoliday.saveAll(holidays);
    return holidays[index];
  },

  delete: (id) => {
    const holidays = PublicHoliday.getAll();
    const index = holidays.findIndex((h) => h.id == id);
    if (index === -1) return false;

    holidays.splice(index, 1);
    PublicHoliday.saveAll(holidays);
    return true;
  },

  isPublicHoliday: (date, department = null) => {
    const dateString = new Date(date).toISOString().split("T")[0];
    const holidays = department ? PublicHoliday.getByDepartment(department) : PublicHoliday.getAll();
    return holidays.some((h) => h.date === dateString);
  },
};

module.exports = { WorkCalendar, PublicHoliday };
