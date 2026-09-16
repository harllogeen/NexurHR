const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/attendance.json");

// Import schedule and attendance rule models for status calculation
const { getSchedulesByEmployee, getSchedulesByDate } = require('./scheduleModel');
const { calculateAttendanceStatus } = require('./attendanceRuleModel');

const getAttendance = () => {
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  const jsonData = fs.readFileSync(dataPath);
  try {
    return JSON.parse(jsonData);
  } catch (e) {
    return [];
  }
};

const saveAttendance = (attendance) => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(attendance, null, 2));
};

// Get attendance with schedule comparison
const getAttendanceWithSchedule = (employeeId, date) => {
  const allAttendance = getAttendance();
  const attendance = allAttendance.find(
    a => a.employeeId === employeeId && a.date === date
  );

  if (!attendance) {
    return null;
  }

  // Get scheduled shift for this employee on this date
  const schedules = getSchedulesByEmployee(employeeId, date, date);
  const schedule = schedules.length > 0 ? schedules[0] : null;

  if (schedule) {
    // Calculate attendance status based on schedule
    const status = calculateAttendanceStatus(
      {
        startTime: schedule.startTime,
        endTime: schedule.endTime
      },
      {
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut
      },
      schedule.department
    );

    return {
      ...attendance,
      schedule: {
        id: schedule.id,
        shiftId: schedule.shiftId,
        expectedStart: schedule.startTime,
        expectedEnd: schedule.endTime,
        department: schedule.department
      },
      calculatedStatus: status.status,
      statusDetails: status.details,
      startDiffMinutes: status.startDiffMinutes,
      endDiffMinutes: status.endDiffMinutes
    };
  }

  // No schedule found - mark as unscheduled
  return {
    ...attendance,
    schedule: null,
    calculatedStatus: 'unscheduled',
    statusDetails: 'No shift scheduled for this day'
  };
};

// Get attendance records with schedule comparison for a date range
const getAttendanceWithScheduleByRange = (startDate, endDate, employeeId = null, department = null) => {
  const allAttendance = getAttendance();
  let filtered = allAttendance.filter(a => a.date >= startDate && a.date <= endDate);

  if (employeeId) {
    filtered = filtered.filter(a => a.employeeId === employeeId);
  }

  // Get all schedules in this range
  const schedules = require('./scheduleModel').getSchedulesByDateRange(startDate, endDate, department);

  // Create a map of schedules by employee and date
  const scheduleMap = {};
  schedules.forEach(schedule => {
    const key = `${schedule.employeeId}_${schedule.date}`;
    scheduleMap[key] = schedule;
  });

  // Enhance attendance records with schedule comparison
  const enhanced = filtered.map(attendance => {
    const key = `${attendance.employeeId}_${attendance.date}`;
    const schedule = scheduleMap[key];

    if (schedule) {
      const status = calculateAttendanceStatus(
        {
          startTime: schedule.startTime,
          endTime: schedule.endTime
        },
        {
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut
        },
        schedule.department
      );

      return {
        ...attendance,
        schedule: {
          id: schedule.id,
          shiftId: schedule.shiftId,
          expectedStart: schedule.startTime,
          expectedEnd: schedule.endTime,
          department: schedule.department
        },
        calculatedStatus: status.status,
        statusDetails: status.details,
        startDiffMinutes: status.startDiffMinutes,
        endDiffMinutes: status.endDiffMinutes
      };
    }

    return {
      ...attendance,
      schedule: null,
      calculatedStatus: 'unscheduled',
      statusDetails: 'No shift scheduled for this day'
    };
  });

  // Also check for scheduled employees who didn't clock in
  const attendanceMap = {};
  filtered.forEach(att => {
    const key = `${att.employeeId}_${att.date}`;
    attendanceMap[key] = true;
  });

  const absent = [];
  schedules.forEach(schedule => {
    const key = `${schedule.employeeId}_${schedule.date}`;
    if (!attendanceMap[key]) {
      absent.push({
        employeeId: schedule.employeeId,
        date: schedule.date,
        clockIn: null,
        clockOut: null,
        schedule: {
          id: schedule.id,
          shiftId: schedule.shiftId,
          expectedStart: schedule.startTime,
          expectedEnd: schedule.endTime,
          department: schedule.department
        },
        calculatedStatus: 'absent',
        statusDetails: 'Scheduled but did not clock in',
        startDiffMinutes: null,
        endDiffMinutes: null
      });
    }
  });

  return [...enhanced, ...absent].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.employeeId || '').localeCompare(b.employeeId || '');
  });
};

// Get team attendance summary with schedule comparison
const getTeamAttendanceWithSchedule = (date, department = null) => {
  const schedulesForDate = getSchedulesByDate(date);
  const attendanceForDate = getAttendance().filter(a => a.date === date);

  // Filter by department if specified
  const schedules = department 
    ? schedulesForDate.filter(s => s.department === department)
    : schedulesForDate;

  // Create attendance map
  const attendanceMap = {};
  attendanceForDate.forEach(att => {
    attendanceMap[att.employeeId] = att;
  });

  // Build team attendance with status
  return schedules.map(schedule => {
    const attendance = attendanceMap[schedule.employeeId];

    if (attendance) {
      const status = calculateAttendanceStatus(
        {
          startTime: schedule.startTime,
          endTime: schedule.endTime
        },
        {
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut
        },
        schedule.department
      );

      return {
        employeeId: schedule.employeeId,
        date: schedule.date,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        schedule: {
          id: schedule.id,
          shiftId: schedule.shiftId,
          expectedStart: schedule.startTime,
          expectedEnd: schedule.endTime,
          department: schedule.department
        },
        calculatedStatus: status.status,
        statusDetails: status.details,
        startDiffMinutes: status.startDiffMinutes,
        endDiffMinutes: status.endDiffMinutes
      };
    }

    // Scheduled but absent
    return {
      employeeId: schedule.employeeId,
      date: schedule.date,
      clockIn: null,
      clockOut: null,
      schedule: {
        id: schedule.id,
        shiftId: schedule.shiftId,
        expectedStart: schedule.startTime,
        expectedEnd: schedule.endTime,
        department: schedule.department
      },
      calculatedStatus: 'absent',
      statusDetails: 'Scheduled but did not clock in',
      startDiffMinutes: null,
      endDiffMinutes: null
    };
  });
};

module.exports = { 
  getAttendance, 
  saveAttendance,
  getAttendanceWithSchedule,
  getAttendanceWithScheduleByRange,
  getTeamAttendanceWithSchedule
};
