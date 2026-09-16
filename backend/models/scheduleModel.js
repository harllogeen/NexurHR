const fs = require('fs');
const path = require('path');

const schedulesFilePath = path.join(__dirname, '../data/schedules.json');

class Schedule {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.employeeId = data.employeeId;
    this.shiftId = data.shiftId;
    this.date = data.date; // "2026-09-04"
    this.startTime = data.startTime; // "08:00"
    this.endTime = data.endTime; // "17:00"
    this.department = data.department;
    this.status = data.status || 'scheduled'; // scheduled, completed, swapped, cancelled
    this.notes = data.notes || '';
    this.assignedBy = data.assignedBy; // User ID (HR/Manager)
    this.assignmentType = data.assignmentType || 'manual'; // manual, auto, swap
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}

class ShiftSwapRequest {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.scheduleId = data.scheduleId;
    this.requesterId = data.requesterId;
    this.targetEmployeeId = data.targetEmployeeId || null;
    this.reason = data.reason || '';
    this.status = data.status || 'pending'; // pending, approved, rejected, cancelled
    this.reviewedBy = data.reviewedBy || null;
    this.reviewedAt = data.reviewedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

// Read schedules from file
const readSchedules = () => {
  try {
    if (fs.existsSync(schedulesFilePath)) {
      const data = fs.readFileSync(schedulesFilePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading schedules:', error);
    return [];
  }
};

// Write schedules to file
const writeSchedules = (schedules) => {
  try {
    fs.writeFileSync(schedulesFilePath, JSON.stringify(schedules, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing schedules:', error);
    return false;
  }
};

// Get all schedules
const getAllSchedules = () => {
  return readSchedules();
};

// Get schedule by ID
const getScheduleById = (id) => {
  const schedules = readSchedules();
  return schedules.find(s => s.id === id);
};

// Get schedules by employee
const getSchedulesByEmployee = (employeeId, startDate = null, endDate = null) => {
  const schedules = readSchedules();
  // Use loose equality to handle both string and number IDs
  let filtered = schedules.filter(s => s.employeeId == employeeId);

  if (startDate && endDate) {
    filtered = filtered.filter(s => s.date >= startDate && s.date <= endDate);
  }

  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Get schedules by date range
const getSchedulesByDateRange = (startDate, endDate, departmentId = null) => {
  const schedules = readSchedules();
  let filtered = schedules.filter(s => s.date >= startDate && s.date <= endDate);

  if (departmentId) {
    // Filter by department, but include schedules with department="all" as they apply to all departments
    filtered = filtered.filter(s => s.department === departmentId || s.department === 'all');
  }

  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Get schedules by date
const getSchedulesByDate = (date) => {
  const schedules = readSchedules();
  return schedules.filter(s => s.date === date);
};

// Create schedule
const createSchedule = (scheduleData) => {
  const schedules = readSchedules();
  const newSchedule = new Schedule(scheduleData);
  schedules.push(newSchedule);
  writeSchedules(schedules);
  return newSchedule;
};

// Create multiple schedules (bulk)
const createSchedules = (schedulesData) => {
  const schedules = readSchedules();
  const newSchedules = schedulesData.map(data => new Schedule(data));
  schedules.push(...newSchedules);
  writeSchedules(schedules);
  return newSchedules;
};

// Update schedule
const updateSchedule = (id, updateData) => {
  const schedules = readSchedules();
  const index = schedules.findIndex(s => s.id === id);
  
  if (index === -1) {
    return null;
  }

  schedules[index] = {
    ...schedules[index],
    ...updateData,
    id: schedules[index].id,
    createdAt: schedules[index].createdAt,
    updatedAt: new Date().toISOString()
  };

  writeSchedules(schedules);
  return schedules[index];
};

// Delete schedule
const deleteSchedule = (id) => {
  const schedules = readSchedules();
  const filteredSchedules = schedules.filter(s => s.id !== id);
  
  if (schedules.length === filteredSchedules.length) {
    return false;
  }

  writeSchedules(filteredSchedules);
  return true;
};

// Delete schedules by date range
const deleteSchedulesByDateRange = (startDate, endDate) => {
  const schedules = readSchedules();
  const filteredSchedules = schedules.filter(s => s.date < startDate || s.date > endDate);
  writeSchedules(filteredSchedules);
  return schedules.length - filteredSchedules.length;
};

// Check for scheduling conflicts
const checkScheduleConflict = (employeeId, date, startTime, endTime, excludeScheduleId = null) => {
  const schedules = readSchedules();
  const employeeSchedules = schedules.filter(s => 
    s.employeeId === employeeId && 
    s.date === date &&
    s.status !== 'cancelled' &&
    s.id !== excludeScheduleId
  );

  for (const schedule of employeeSchedules) {
    // Check for time overlap
    if (
      (startTime >= schedule.startTime && startTime < schedule.endTime) ||
      (endTime > schedule.startTime && endTime <= schedule.endTime) ||
      (startTime <= schedule.startTime && endTime >= schedule.endTime)
    ) {
      return schedule;
    }
  }

  return null;
};

// Check if employee is on approved leave for a given date
const isEmployeeOnLeave = (employeeId, date) => {
  try {
    const leavesFilePath = path.join(__dirname, '../data/leaves.json');
    if (!fs.existsSync(leavesFilePath)) {
      return false;
    }

    const leaves = JSON.parse(fs.readFileSync(leavesFilePath, 'utf8'));
    
    // Find approved leaves that cover this date
    const onLeave = leaves.some(leave => {
      // Match employee by userId or employeeId
      const isEmployee = leave.userId == employeeId || leave.employeeId == employeeId;
      const isApproved = leave.status === 'Approved';
      const isWithinDates = leave.startDate <= date && leave.endDate >= date;
      
      return isEmployee && isApproved && isWithinDates;
    });

    return onLeave;
  } catch (error) {
    console.error('Error checking leave status:', error);
    return false;
  }
};

module.exports = {
  Schedule,
  ShiftSwapRequest,
  getAllSchedules,
  getScheduleById,
  getSchedulesByEmployee,
  getSchedulesByDateRange,
  getSchedulesByDate,
  createSchedule,
  createSchedules,
  updateSchedule,
  deleteSchedule,
  deleteSchedulesByDateRange,
  checkScheduleConflict,
  isEmployeeOnLeave
};
