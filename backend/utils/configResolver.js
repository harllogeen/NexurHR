/**
 * Configuration Resolver
 * Handles hierarchical configuration resolution:
 * Employee > Shift > Department > Organization
 */

const fs = require('fs');
const path = require('path');

const companyFilePath = path.join(__dirname, '../data/company.json');
const shiftsFilePath = path.join(__dirname, '../data/shifts.json');
const departmentsFilePath = path.join(__dirname, '../data/departments.json');

/**
 * Get organization-wide settings
 */
const getOrganizationSettings = () => {
  try {
    if (fs.existsSync(companyFilePath)) {
      const company = JSON.parse(fs.readFileSync(companyFilePath, 'utf8'));
      return company.organizationSettings || {};
    }
    return {};
  } catch (error) {
    console.error('Error reading organization settings:', error);
    return {};
  }
};

/**
 * Get shift-specific settings
 */
const getShiftSettings = (shiftId) => {
  try {
    if (fs.existsSync(shiftsFilePath)) {
      const shifts = JSON.parse(fs.readFileSync(shiftsFilePath, 'utf8'));
      const shift = shifts.find(s => s.id === shiftId);
      return shift || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading shift settings:', error);
    return null;
  }
};

/**
 * Get department-specific settings
 */
const getDepartmentSettings = (departmentId) => {
  try {
    if (fs.existsSync(departmentsFilePath)) {
      const departments = JSON.parse(fs.readFileSync(departmentsFilePath, 'utf8'));
      const department = departments.find(d => d.id === departmentId);
      return department || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading department settings:', error);
    return null;
  }
};

/**
 * Resolve attendance rules with hierarchy
 * Priority: Shift > Department > Organization
 */
const resolveAttendanceRules = (shiftId = null, departmentId = null) => {
  const orgSettings = getOrganizationSettings();
  const defaultRules = orgSettings.attendanceSettings || {
    defaultGracePeriod: 5,
    lateThreshold: 15,
    earlyLeaveThreshold: 15,
    overtimeThreshold: 30,
    requireCheckInLocation: false,
    allowRemoteCheckIn: true,
    autoApproveOvertime: false
  };

  let rules = { ...defaultRules };

  // Apply department-level overrides
  if (departmentId) {
    const deptSettings = getDepartmentSettings(departmentId);
    if (deptSettings?.attendanceRules) {
      rules = { ...rules, ...deptSettings.attendanceRules };
    }
  }

  // Apply shift-level overrides (highest priority)
  if (shiftId) {
    const shiftSettings = getShiftSettings(shiftId);
    if (shiftSettings?.attendanceRules) {
      rules = { ...rules, ...shiftSettings.attendanceRules };
    }
  }

  return rules;
};

/**
 * Resolve working days with hierarchy
 * Returns array of day numbers (0=Sunday, 6=Saturday)
 */
const resolveWorkingDays = (shiftId = null, departmentId = null) => {
  // If shift specified, use shift's working days
  if (shiftId) {
    const shift = getShiftSettings(shiftId);
    if (shift?.workingDays) {
      return shift.workingDays;
    }
  }

  // If department specified, use department's working days
  if (departmentId) {
    const dept = getDepartmentSettings(departmentId);
    if (dept?.workingDays) {
      return dept.workingDays;
    }
  }

  // Fall back to organization default
  const orgSettings = getOrganizationSettings();
  return orgSettings.defaultWorkingDays || [1, 2, 3, 4, 5]; // Mon-Fri default
};

/**
 * Resolve working hours with hierarchy
 */
const resolveWorkingHours = (shiftId = null, departmentId = null) => {
  // If shift specified, use shift's hours
  if (shiftId) {
    const shift = getShiftSettings(shiftId);
    if (shift?.startTime && shift?.endTime) {
      return {
        start: shift.startTime,
        end: shift.endTime,
        breakDuration: shift.breakDuration || 60
      };
    }
  }

  // If department specified, use department's hours
  if (departmentId) {
    const dept = getDepartmentSettings(departmentId);
    if (dept?.workingHours) {
      return dept.workingHours;
    }
  }

  // Fall back to organization default
  const orgSettings = getOrganizationSettings();
  return orgSettings.defaultWorkingHours || {
    start: '08:00',
    end: '17:00',
    breakDuration: 60
  };
};

/**
 * Check if a specific date is a working day for the organization/department/shift
 */
const isWorkingDay = (date, shiftId = null, departmentId = null) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = dateObj.getDay();
  const workingDays = resolveWorkingDays(shiftId, departmentId);
  return workingDays.includes(dayOfWeek);
};

/**
 * Get schedule settings (auto-generate, swap policies, etc.)
 */
const getScheduleSettings = () => {
  const orgSettings = getOrganizationSettings();
  return orgSettings.scheduleSettings || {
    autoGenerateEnabled: true,
    advanceScheduleDays: 14,
    allowEmployeeSwaps: true,
    requireSwapApproval: true,
    scheduleChangeNoticePeriod: 24,
    preferredShiftPriority: true
  };
};

/**
 * Get leave settings
 */
const getLeaveSettings = () => {
  const orgSettings = getOrganizationSettings();
  return orgSettings.leaveSettings || {
    requireApproval: true,
    allowNegativeBalance: false,
    carryOverEnabled: true,
    maxCarryOverDays: 5
  };
};

/**
 * Calculate if check-in/out is late based on resolved rules
 */
const calculateAttendanceStatus = (scheduledTime, actualTime, type = 'checkIn', shiftId = null, departmentId = null) => {
  const rules = resolveAttendanceRules(shiftId, departmentId);
  
  const scheduled = new Date(`2000-01-01T${scheduledTime}`);
  const actual = new Date(`2000-01-01T${actualTime}`);
  const diffMinutes = (actual - scheduled) / 1000 / 60;

  if (type === 'checkIn') {
    if (diffMinutes <= rules.defaultGracePeriod) {
      return { status: 'on-time', message: 'On time' };
    } else if (diffMinutes <= rules.lateThreshold) {
      return { status: 'grace', message: 'Within grace period' };
    } else {
      return { status: 'late', message: `Late by ${Math.floor(diffMinutes)} minutes`, lateMinutes: Math.floor(diffMinutes) };
    }
  } else if (type === 'checkOut') {
    if (diffMinutes < -rules.earlyLeaveThreshold) {
      return { status: 'early', message: `Left ${Math.floor(Math.abs(diffMinutes))} minutes early`, earlyMinutes: Math.floor(Math.abs(diffMinutes)) };
    } else if (diffMinutes > rules.overtimeThreshold) {
      return { status: 'overtime', message: `Overtime: ${Math.floor(diffMinutes)} minutes`, overtimeMinutes: Math.floor(diffMinutes) };
    } else {
      return { status: 'on-time', message: 'On time' };
    }
  }

  return { status: 'unknown', message: 'Cannot determine status' };
};

module.exports = {
  getOrganizationSettings,
  getShiftSettings,
  getDepartmentSettings,
  resolveAttendanceRules,
  resolveWorkingDays,
  resolveWorkingHours,
  isWorkingDay,
  getScheduleSettings,
  getLeaveSettings,
  calculateAttendanceStatus
};
