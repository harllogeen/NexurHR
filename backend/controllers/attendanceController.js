const { 
  getAttendance, 
  saveAttendance,
  getAttendanceWithSchedule,
  getAttendanceWithScheduleByRange,
  getTeamAttendanceWithSchedule
} = require("../models/attendanceModel");
const { getUsers } = require("../models/userModel");
const { getEmployees } = require("../models/employeeModel");
const { hasPermission } = require("../utils/permissions");
const { recordAuditLog } = require("../models/auditLogModel");
const { calculateAttendanceStatus: resolveAttendanceStatus, resolveAttendanceRules } = require("../utils/configResolver");

// Helper function to calculate attendance status (legacy - kept for backward compatibility)
const calculateAttendanceStatus = (clockInTime, clockOutTime = null) => {
  const clockIn = new Date(clockInTime);
  const clockInHour = clockIn.getHours();
  const clockInMinute = clockIn.getMinutes();
  const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
  
  // Standard work time: 8:00 AM (480 minutes from midnight)
  const standardStartMinutes = 8 * 60; // 8:00 AM
  const standardEndMinutes = 17 * 60; // 5:00 PM
  
  let status = "Present";
  let lateBy = 0;
  let earlyDeparture = 0;
  
  // Check if clocked in late (after 8:00 AM)
  if (clockInTotalMinutes > standardStartMinutes) {
    status = "Late";
    lateBy = clockInTotalMinutes - standardStartMinutes;
  }
  
  // Check if clocked out early (before 5:00 PM) - only if clockOut exists
  if (clockOutTime) {
    const clockOut = new Date(clockOutTime);
    const clockOutHour = clockOut.getHours();
    const clockOutMinute = clockOut.getMinutes();
    const clockOutTotalMinutes = clockOutHour * 60 + clockOutMinute;
    
    if (clockOutTotalMinutes < standardEndMinutes) {
      earlyDeparture = standardEndMinutes - clockOutTotalMinutes;
      if (status === "Late") {
        status = "Late & Left Early";
      } else {
        status = "Left Early";
      }
    }
  }
  
  return { status, lateBy, earlyDeparture };
};

const clockIn = (req, res) => {
  try {
    const { userId } = req;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    const attendance = getAttendance();
    const existing = attendance.find((a) => a.userId === userId && a.date === dateStr);

    if (existing) {
      return res.status(400).json({ message: "Already clocked in for today" });
    }

    // Try to find employee and their schedule for today
    const employees = getEmployees();
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    let employee = null;
    let schedule = null;
    let shiftId = null;
    let departmentId = null;

    if (user?.employeeId) {
      employee = employees.find(e => e.id === user.employeeId);
      if (employee) {
        departmentId = employee.department;
        
        // Try to find today's schedule
        const { getSchedulesByEmployee } = require('../models/scheduleModel');
        const schedules = getSchedulesByEmployee(employee.id, dateStr, dateStr);
        schedule = schedules.find(s => s.date === dateStr);
        shiftId = schedule?.shiftId;
      }
    }

    // Calculate status using configResolver with schedule context
    let status = "Present";
    let lateBy = 0;
    let scheduledStartTime = "08:00"; // Default fallback

    if (schedule) {
      scheduledStartTime = schedule.startTime;
      // Use configResolver for accurate status calculation
      const statusResult = resolveAttendanceStatus(
        scheduledStartTime,
        timeStr,
        'checkIn',
        shiftId,
        departmentId
      );
      
      status = statusResult.status === 'late' ? 'Late' : 
               statusResult.status === 'grace' ? 'Present' : 'Present';
      lateBy = statusResult.lateMinutes || 0;
    } else {
      // No schedule found - use legacy calculation
      const result = calculateAttendanceStatus(now.toISOString());
      status = result.status;
      lateBy = result.lateBy;
    }

    const clockInTime = now.toISOString();
    const entry = {
      id: Date.now(),
      userId,
      employeeId: employee?.id || null,
      date: dateStr,
      clockIn: clockInTime,
      clockOut: null,
      status: status,
      lateBy: lateBy,
      earlyDeparture: 0,
      location: req.body.location || null,
      scheduleId: schedule?.id || null,
      shiftId: shiftId || null
    };

    attendance.push(entry);
    saveAttendance(attendance);
    recordAuditLog({ 
      actorId: userId, 
      action: "clock-in", 
      targetId: userId, 
      details: `Clocked in at ${now.toLocaleTimeString()}${schedule ? ` for ${schedule.shiftId}` : ''}` 
    });

    res.status(201).json({ 
      message: "Clocked in successfully", 
      entry,
      schedule: schedule ? {
        shiftId: schedule.shiftId,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      } : null
    });
  } catch (error) {
    console.error('Error in clockIn:', error);
    res.status(500).json({ message: 'Failed to clock in' });
  }
};

const clockOut = (req, res) => {
  try {
    const { userId } = req;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    const attendance = getAttendance();
    const index = attendance.findIndex((a) => a.userId === userId && a.date === dateStr);

    if (index === -1) {
      return res.status(400).json({ message: "No clock-in record found for today" });
    }

    if (attendance[index].clockOut) {
      return res.status(400).json({ message: "Already clocked out for today" });
    }

    const clockOutTime = now.toISOString();
    const clockInTime = attendance[index].clockIn;
    const shiftId = attendance[index].shiftId;
    const scheduleId = attendance[index].scheduleId;

    // Get schedule and employee info for configResolver
    let schedule = null;
    let departmentId = null;
    
    if (scheduleId) {
      const { getScheduleById } = require('../models/scheduleModel');
      schedule = getScheduleById(scheduleId);
    }

    if (attendance[index].employeeId) {
      const employees = getEmployees();
      const employee = employees.find(e => e.id === attendance[index].employeeId);
      departmentId = employee?.department;
    }

    let status = "Present";
    let lateBy = attendance[index].lateBy || 0;
    let earlyDeparture = 0;
    let overtimeMinutes = 0;

    if (schedule) {
      // Use configResolver for checkout status
      const checkInStatus = resolveAttendanceStatus(
        schedule.startTime,
        clockInTime.substring(11, 16),
        'checkIn',
        shiftId,
        departmentId
      );

      const checkOutStatus = resolveAttendanceStatus(
        schedule.endTime,
        timeStr,
        'checkOut',
        shiftId,
        departmentId
      );

      // Combine statuses
      const isLate = checkInStatus.status === 'late';
      const isEarly = checkOutStatus.status === 'early';
      const isOvertime = checkOutStatus.status === 'overtime';

      lateBy = checkInStatus.lateMinutes || lateBy;
      earlyDeparture = checkOutStatus.earlyMinutes || 0;
      overtimeMinutes = checkOutStatus.overtimeMinutes || 0;

      if (isLate && isEarly) {
        status = "Late & Left Early";
      } else if (isLate) {
        status = "Late";
      } else if (isEarly) {
        status = "Left Early";
      } else if (isOvertime) {
        status = "Overtime";
      } else {
        status = "Present";
      }
    } else {
      // No schedule - use legacy calculation
      const result = calculateAttendanceStatus(clockInTime, clockOutTime);
      status = result.status;
      lateBy = result.lateBy;
      earlyDeparture = result.earlyDeparture;
    }

    attendance[index].clockOut = clockOutTime;
    attendance[index].status = status;
    attendance[index].lateBy = lateBy;
    attendance[index].earlyDeparture = earlyDeparture;
    attendance[index].overtimeMinutes = overtimeMinutes;
    
    saveAttendance(attendance);
    recordAuditLog({ 
      actorId: userId, 
      action: "clock-out", 
      targetId: userId, 
      details: `Clocked out at ${now.toLocaleTimeString()}${overtimeMinutes > 0 ? ` (${overtimeMinutes}min overtime)` : ''}` 
    });

    res.status(200).json({ 
      message: "Clocked out successfully", 
      entry: attendance[index],
      summary: {
        status,
        lateBy,
        earlyDeparture,
        overtimeMinutes
      }
    });
  } catch (error) {
    console.error('Error in clockOut:', error);
    res.status(500).json({ message: 'Failed to clock out' });
  }
};

const getMyAttendance = (req, res) => {
  const { userId } = req;
  const attendance = getAttendance();
  const employees = getEmployees();
  const users = getUsers();
  
  // Find the user first
  const user = users.find((u) => u.id === userId);
  
  // Then find the employee record using multiple strategies
  let employee = null;
  
  if (user) {
    // Strategy 1: Match by employeeId in user record
    if (user.employeeId) {
      employee = employees.find((e) => e.id === user.employeeId);
    }
    
    // Strategy 2: Match by email
    if (!employee && user.email) {
      employee = employees.find((e) => e.email === user.email);
    }
    
    // Strategy 3: Match by username (in case username is the email)
    if (!employee && user.username) {
      employee = employees.find((e) => e.email === user.username);
    }
  }
  
  const myLogs = attendance.filter((a) => a.userId === userId).map(log => ({
    ...log,
    employee: employee ? {
      id: employee.id,
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      role: employee.role
    } : null
  }));
  
  res.status(200).json(myLogs);
};

const getAllAttendance = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };
  if (!hasPermission(actor, "view-all", "attendance")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  // Extract pagination and filter parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const department = req.query.department || '';
  const status = req.query.status || '';
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';

  const attendance = getAttendance();
  const employees = getEmployees();
  const users = getUsers();

  // Enrich attendance with employee data
  let enrichedAttendance = attendance.map((entry) => {
    let employee = null;
    
    // Find the user for this attendance entry
    const user = users.find((u) => u.id === entry.userId);
    
    if (user) {
      // Strategy 1: Match by employeeId in user record
      if (user.employeeId) {
        employee = employees.find((e) => e.id === user.employeeId);
      }
      
      // Strategy 2: Match by email
      if (!employee && user.email) {
        employee = employees.find((e) => e.email === user.email);
      }
      
      // Strategy 3: Match by username (in case username is the email)
      if (!employee && user.username) {
        employee = employees.find((e) => e.email === user.username);
      }
    }
    
    // Strategy 4: Direct match by userId (fallback)
    if (!employee) {
      employee = employees.find((e) => e.id === entry.userId);
    }
    
    return {
      ...entry,
      employee: employee ? {
        id: employee.id,
        employeeId: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        role: employee.role
      } : null
    };
  });

  // Apply filters
  if (search) {
    const searchLower = search.toLowerCase();
    enrichedAttendance = enrichedAttendance.filter(entry => {
      const emp = entry.employee;
      if (!emp) return false;
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const empId = (emp.employeeId || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      return fullName.includes(searchLower) || empId.includes(searchLower) || email.includes(searchLower);
    });
  }

  if (department) {
    enrichedAttendance = enrichedAttendance.filter(entry => 
      entry.employee && entry.employee.department === department
    );
  }

  if (status) {
    enrichedAttendance = enrichedAttendance.filter(entry => entry.status === status);
  }

  if (startDate && endDate) {
    enrichedAttendance = enrichedAttendance.filter(entry => 
      entry.date >= startDate && entry.date <= endDate
    );
  }

  // Sort by date descending (most recent first)
  enrichedAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate pagination
  const totalRecords = enrichedAttendance.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // Get paginated data
  const paginatedData = enrichedAttendance.slice(startIndex, endIndex);

  res.status(200).json({
    data: paginatedData,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      limit: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
};

const getAttendanceSummary = (req, res) => {
  const attendance = getAttendance();
  const year = Number(req.query.year || new Date().getFullYear());
  const month = Number(req.query.month || new Date().getMonth() + 1);
  const filtered = attendance.filter((entry) => {
    const parsed = new Date(entry.date);
    return parsed.getFullYear() === year && parsed.getMonth() + 1 === month;
  });

  const summary = filtered.reduce((acc, entry) => {
    acc[entry.status || "Unknown"] = (acc[entry.status || "Unknown"] || 0) + 1;
    return acc;
  }, {});

  res.status(200).json({ month, year, summary, totalRecords: filtered.length });
};

const getAttendanceHeatmap = (req, res) => {
  const attendance = getAttendance();
  const userId = req.query.userId || req.userId;
  const filtered = attendance.filter((entry) => entry.userId == userId);
  res.status(200).json(filtered);
};

const manualAdjustment = (req, res) => {
  const actor = { id: req.userId, role: req.userRole || "employee" };
  if (!hasPermission(actor, "adjust", "attendance")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const { userId, date, status } = req.body;
  const attendance = getAttendance();
  const index = attendance.findIndex((entry) => entry.userId == userId && entry.date === date);

  if (index === -1) {
    attendance.push({ id: Date.now(), userId, date, status, clockIn: null, clockOut: null, manualAdjusted: true });
  } else {
    attendance[index].status = status;
    attendance[index].manualAdjusted = true;
  }

  saveAttendance(attendance);
  recordAuditLog({ actorId: actor.id, action: "manual-attendance-adjustment", targetId: userId, details: `Adjusted attendance for ${date}` });

  res.status(200).json({ message: "Attendance updated", attendance });
};

// Get attendance with schedule comparison (single record)
const getAttendanceWithScheduleComparison = (req, res) => {
  try {
    const { employeeId, date } = req.query;
    const { userId, userRole } = req;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and date are required'
      });
    }

    // Check permissions
    const actor = { id: userId, role: userRole || 'employee' };
    const employees = getEmployees();
    const employee = employees.find(e => e.id === employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Employees can only view their own attendance
    if (userRole !== 'admin' && userRole !== 'hr' && employee.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const result = getAttendanceWithSchedule(employeeId, date);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting attendance with schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance'
    });
  }
};

// Get attendance with schedule comparison (date range)
const getAttendanceByRangeWithSchedule = (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    const { userId, userRole } = req;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Check permissions
    const actor = { id: userId, role: userRole || 'employee' };
    
    // If not admin/hr, can only view own attendance
    let filterEmployeeId = employeeId;
    if (userRole !== 'admin' && userRole !== 'hr') {
      const employees = getEmployees();
      const employee = employees.find(e => e.userId === userId);
      filterEmployeeId = employee ? employee.id : null;
    }

    const results = getAttendanceWithScheduleByRange(
      startDate, 
      endDate, 
      filterEmployeeId, 
      department
    );

    // Enrich with employee details
    const employees = getEmployees();
    const enriched = results.map(record => {
      const employee = employees.find(e => e.id === record.employeeId);
      return {
        ...record,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          department: employee.department,
          position: employee.position
        } : null
      };
    });

    res.json({
      success: true,
      data: enriched,
      summary: {
        total: enriched.length,
        onTime: enriched.filter(r => r.calculatedStatus === 'on_time' || r.calculatedStatus === 'early').length,
        late: enriched.filter(r => r.calculatedStatus === 'late').length,
        absent: enriched.filter(r => r.calculatedStatus === 'absent').length,
        earlyClose: enriched.filter(r => r.calculatedStatus === 'early_close').length,
        overtime: enriched.filter(r => r.calculatedStatus === 'overtime').length,
        unscheduled: enriched.filter(r => r.calculatedStatus === 'unscheduled').length
      }
    });
  } catch (error) {
    console.error('Error getting attendance by range with schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance'
    });
  }
};

// Get team attendance with schedule comparison (for specific date)
const getTeamAttendanceComparison = (req, res) => {
  try {
    const { date, department } = req.query;
    const { userId, userRole } = req;

    // Check permissions - HR/Admin only
    const actor = { id: userId, role: userRole || 'employee' };
    if (!hasPermission(actor, 'view-all', 'attendance')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const results = getTeamAttendanceWithSchedule(date, department);

    // Enrich with employee details
    const employees = getEmployees();
    const enriched = results.map(record => {
      const employee = employees.find(e => e.id === record.employeeId);
      return {
        ...record,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          profilePicture: employee.profilePicture
        } : null
      };
    });

    res.json({
      success: true,
      data: enriched,
      summary: {
        total: enriched.length,
        onTime: enriched.filter(r => r.calculatedStatus === 'on_time' || r.calculatedStatus === 'early').length,
        late: enriched.filter(r => r.calculatedStatus === 'late').length,
        absent: enriched.filter(r => r.calculatedStatus === 'absent').length,
        earlyClose: enriched.filter(r => r.calculatedStatus === 'early_close').length,
        overtime: enriched.filter(r => r.calculatedStatus === 'overtime').length
      }
    });
  } catch (error) {
    console.error('Error getting team attendance with schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve team attendance'
    });
  }
};

module.exports = { 
  clockIn, 
  clockOut, 
  getMyAttendance, 
  getAllAttendance, 
  getAttendanceSummary, 
  getAttendanceHeatmap, 
  manualAdjustment,
  getAttendanceWithScheduleComparison,
  getAttendanceByRangeWithSchedule,
  getTeamAttendanceComparison
};
